"use client";

import { useRef, useState } from "react";

const ACCEPTED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_MB = 5;

type Status = "idle" | "loading" | "done" | "error";

interface FeedbackResult {
  overall_score: number;
  strengths: string[];
  priority_fixes: string[];
  section_notes: Record<string, string>;
  ats_warnings: string[];
}

export default function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(f: File): string | null {
    if (!ACCEPTED.includes(f.type)) return "ERR: only .pdf and .docx are supported";
    if (f.size > MAX_MB * 1024 * 1024) return `ERR: file exceeds ${MAX_MB}MB limit`;
    return null;
  }

  function pick(f: File) {
    setValidationError(null);
    setResult(null);
    setServerError(null);
    const err = validate(f);
    if (err) { setValidationError(err); setFile(null); return; }
    setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pick(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pick(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("loading");
    setServerError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "ERR: something went wrong");
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("done");
    } catch {
      setServerError("ERR: network failure — check your connection");
      setStatus("error");
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* Drop zone */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`group w-full border px-6 py-10 text-center transition-all
            ${dragging
              ? "border-[#00ff41] bg-[#001100] [box-shadow:0_0_20px_#00ff4130]"
              : file
              ? "border-[#00b300] bg-[#001100]"
              : "border-[#004400] bg-[#000a00] hover:border-[#00b300] hover:bg-[#001100]"
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="text-[#00ff41] text-lg">▓▓▓▓▓▓▓▓▓▓ 100%</div>
              <div className="text-[#00b300] text-sm">{file.name}</div>
              <div className="text-[#004400] text-xs">{(file.size / 1024).toFixed(0)} KB · click to change</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl text-[#004400] group-hover:text-[#00b300] transition-colors">⬆</div>
              <div className="text-[#00b300] text-sm">drop resume here or <span className="text-[#00ff41] underline underline-offset-2">browse</span></div>
              <div className="text-[#003300] text-xs">.pdf  ·  .docx  ·  max {MAX_MB}mb</div>
            </div>
          )}
        </button>

        {validationError && (
          <p className="text-xs text-red-500 font-mono">{validationError}</p>
        )}

        <button
          type="submit"
          disabled={!file || status === "loading"}
          className="w-full border border-[#00ff41] py-3 text-sm font-bold text-[#00ff41] tracking-widest uppercase transition-all
            hover:bg-[#00ff41] hover:text-black hover:[box-shadow:0_0_20px_#00ff4160]
            disabled:cursor-not-allowed disabled:opacity-30 disabled:border-[#004400] disabled:text-[#004400]"
        >
          {status === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              analyzing...
            </span>
          ) : "[ analyze resume ]"}
        </button>
      </form>

      {serverError && (
        <p className="border border-red-900 bg-red-950/30 px-4 py-2 text-xs text-red-500">{serverError}</p>
      )}

      {status === "done" && result && (
        <div className="flex flex-col gap-4 border border-[#004400] bg-[#000a00] p-5">
          {/* Score */}
          <div className="flex items-center justify-between border-b border-[#003300] pb-4">
            <span className="text-xs text-[#004400] uppercase tracking-widest">&gt; overall score</span>
            <span className="text-4xl font-bold text-[#00ff41] tabular-nums [text-shadow:0_0_10px_#00ff41]">
              {result.overall_score}
              <span className="text-base font-normal text-[#004400]">/100</span>
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {result.strengths.length > 0 && (
              <Section title="strengths" items={result.strengths} color="text-[#00ff41]" label="+" />
            )}
            {result.priority_fixes.length > 0 && (
              <Section title="priority fixes" items={result.priority_fixes} color="text-red-400" label="!" />
            )}
            {result.ats_warnings.length > 0 && (
              <Section title="ats warnings" items={result.ats_warnings} color="text-amber-400" label="~" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color, label }: { title: string; items: string[]; color: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-[#004400] uppercase tracking-widest">&gt; {title}</span>
      <ul className="flex flex-col gap-1 pl-3">
        {items.map((item, i) => (
          <li key={i} className={`text-xs leading-relaxed ${color}`}>
            [{label}] {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
