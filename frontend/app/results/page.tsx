"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedbackResult } from "../types";

const RESULT_STORAGE_KEY = "offercheck_result";

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBarColor(score: number) {
  if (score >= 70) return "bg-emerald-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111214] p-6">
      {children}
    </div>
  );
}

function ListSection({
  title,
  items,
  dotColor,
}: {
  title: string;
  items: string[];
  dotColor: string;
}) {
  return (
    <Card>
      <Label>{title}</Label>
      <ul className="mt-4 flex flex-col">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 border-b border-white/5 py-3 text-sm leading-relaxed text-neutral-300 last:border-0 last:pb-0 first:pt-0"
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "found"; result: FeedbackResult }
  | { status: "not-found" };

export default function ResultsPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
    let next: LoadState = { status: "not-found" };
    if (raw) {
      try {
        next = { status: "found", result: JSON.parse(raw) };
      } catch {
        next = { status: "not-found" };
      }
    }
    // sessionStorage doesn't exist during SSR, so this state can only be
    // resolved after mount — synchronizing with an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
  }, []);

  useEffect(() => {
    if (state.status !== "not-found") return;
    const id = setTimeout(() => router.replace("/"), 1500);
    return () => clearTimeout(id);
  }, [state.status, router]);

  function analyzeAnother() {
    sessionStorage.removeItem(RESULT_STORAGE_KEY);
    router.push("/");
  }

  if (state.status === "not-found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <p className="text-sm text-neutral-500">No analysis found — redirecting…</p>
      </div>
    );
  }

  if (state.status === "loading") {
    return <div className="min-h-screen bg-black" />;
  }

  const { result } = state;
  const sectionEntries = Object.entries(result.section_notes);

  return (
    <div className="min-h-screen bg-black px-6 py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <button
          onClick={analyzeAnother}
          className="w-fit text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          ← analyze another resume
        </button>

        <Card>
          <Label>Overall score</Label>
          <div className="mt-3 flex items-end gap-2">
            <span className={`text-6xl font-bold tabular-nums ${scoreColor(result.overall_score)}`}>
              {result.overall_score}
            </span>
            <span className="mb-1.5 text-lg text-neutral-500">/100</span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${scoreBarColor(result.overall_score)}`}
              style={{ width: `${result.overall_score}%` }}
            />
          </div>
        </Card>

        {result.strengths.length > 0 && (
          <ListSection title="Strengths" items={result.strengths} dotColor="bg-emerald-400" />
        )}

        {result.priority_fixes.length > 0 && (
          <ListSection title="Priority fixes" items={result.priority_fixes} dotColor="bg-red-400" />
        )}

        {result.ats_warnings.length > 0 && (
          <ListSection title="ATS warnings" items={result.ats_warnings} dotColor="bg-amber-400" />
        )}

        {sectionEntries.length > 0 && (
          <Card>
            <Label>Section notes</Label>
            <div className="mt-4 flex flex-col">
              {sectionEntries.map(([section, note]) => (
                <div
                  key={section}
                  className="border-b border-white/5 py-3 last:border-0 last:pb-0 first:pt-0"
                >
                  <div className="text-sm font-medium text-neutral-100 capitalize">{section}</div>
                  <div className="mt-1 text-sm leading-relaxed text-neutral-400">{note}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <button
          onClick={analyzeAnother}
          className="w-fit self-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          Analyze another resume
        </button>
      </div>
    </div>
  );
}
