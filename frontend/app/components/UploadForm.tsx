"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackResult } from "../types";

const ACCEPTED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_MB = 5;
const RESULT_STORAGE_KEY = "offercheck_result";

const LOADING_STEPS = [
  "parsing resume...",
  "evaluating impact signals...",
  "checking ats compatibility...",
  "analyzing big tech alignment...",
  "compiling feedback...",
];

type Status = "idle" | "loading" | "error";

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
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
      sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(data as FeedbackResult));
      router.push("/results");
    } catch {
      setServerError("ERR: could not process file — check your connection");
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
              {LOADING_STEPS[loadingStep]}
            </span>
          ) : "[ analyze resume ]"}
        </button>
      </form>

      {serverError && (
        <p className="border border-red-900 bg-red-950/30 px-4 py-2 text-xs text-red-500 font-mono">{serverError}</p>
      )}
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
