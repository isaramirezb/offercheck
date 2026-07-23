"use client";

import { useEffect, useRef, useState } from "react";

const ACCEPTED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_MB = 5;

const LOADING_STEPS = [
  "parsing resume...",
  "evaluating impact signals...",
  "checking ats compatibility...",
  "analyzing big tech alignment...",
  "compiling feedback...",
];

type Status = "idle" | "loading" | "done" | "error";

interface FeedbackResult {
  overall_score: number;
  strengths: string[];
  priority_fixes: string[];
  section_notes: Record<string, string>;
  ats_warnings: string[];
}

function scoreStyle(score: number) {
  if (score >= 70) return { text: "text-[#00ff41]", glow: "[text-shadow:0_0_10px_#00ff41]" };
  if (score >= 40) return { text: "text-amber-400", glow: "[text-shadow:0_0_10px_theme(colors.amber.400)]" };
  return { text: "text-red-400", glow: "[text-shadow:0_0_10px_theme(colors.red.400)]" };
}

function ScoreBar({ score }: { score: number }) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const { text } = scoreStyle(score);
  return (
    <span className={`font-mono tracking-widest ${text}`}>
      {"█".repeat(filled)}{"░".repeat(empty)}
    </span>
  );
}

export default function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(id);
  }, [status]);

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

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus("loading");
    setLoadingStep(0);
    setServerError(null);
    setResult(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let resumeText: string;

      if (file.type === "application/pdf") {
        const { getDocumentProxy, extractText } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
        const { text } = await extractText(pdf, { mergePages: true });
        resumeText = text as string;
      } else {
        const mammoth = await import("mammoth");
        const parsed = await mammoth.extractRawText({ arrayBuffer });
        resumeText = parsed.value;
      }

      if (!resumeText.trim()) {
        setServerError("ERR: file appears empty or image-only");
        setStatus("error");
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
      const res = await fetch(`${backendUrl}/api/agent/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, target_role: "Software Engineer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.detail ?? data.error ?? "ERR: analysis failed");
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("done");
    } catch {
      setServerError("ERR: could not process file — check your connection");
      setStatus("error");
    }
  }

  const sectionEntries = result ? Object.entries(result.section_notes) : [];

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
              {LOADING_STEPS[loadingStep]}
            </span>
          ) : "[ analyze resume ]"}
        </button>
      </form>

      {serverError && (
        <p className="border border-red-900 bg-red-950/30 px-4 py-2 text-xs text-red-500 font-mono">{serverError}</p>
      )}

      {status === "done" && result && (
        <div className="flex flex-col gap-5 border border-[#004400] bg-[#000a00] p-5">

          {/* Score */}
          <div className="flex flex-col gap-2 border-b border-[#003300] pb-5">
            <span className="text-xs text-[#004400] uppercase tracking-widest">&gt; overall score</span>
            <div className="flex items-center justify-between">
              <ScoreBar score={result.overall_score} />
              <span className={`text-4xl font-bold tabular-nums ${scoreStyle(result.overall_score).text} ${scoreStyle(result.overall_score).glow}`}>
                {result.overall_score}
                <span className="text-base font-normal text-[#004400]">/100</span>
              </span>
            </div>
          </div>

          {/* Sections */}
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
            {sectionEntries.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-xs text-[#004400] uppercase tracking-widest">&gt; section notes</span>
                {sectionEntries.map(([section, note]) => (
                  <div key={section} className="border-l-2 border-[#003300] pl-3 flex flex-col gap-1">
                    <span className="text-xs text-[#00b300] uppercase tracking-wide">{section}</span>
                    <span className="text-xs text-[#00ff41]/70 leading-relaxed">{note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color, label }: {
  title: string;
  items: string[];
  color: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-[#004400] uppercase tracking-widest">&gt; {title}</span>
      <ul className="flex flex-col gap-1.5 pl-3">
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
