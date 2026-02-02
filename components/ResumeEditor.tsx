"use client";

import { useMemo, useState } from "react";
import MonacoLatexEditor from "@/components/MonacoLatexEditor";
import ResumePDFPreview from "@/components/ResumePDFPreview";
import { sampleLatex } from "@/lib/sampleLatex";
import { applyPatch } from "@/lib/applyPatch";
import { ResumePatchSchema, type ResumePatch } from "@/lib/schema";

type Tab = "preview" | "latex";

export default function ResumeEditor() {
  const [jobDescription, setJobDescription] = useState("");
  const [latexSource, setLatexSource] = useState(sampleLatex);
  const [tab, setTab] = useState<Tab>("preview");
  const [suggested, setSuggested] = useState<ResumePatch | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const canUndo = history.length > 0;

  const blockIds = useMemo(() => {
    const re = /%<BLOCK id="([^"]+)">/g;
    const ids: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(latexSource))) {
      ids.push(m[1]);
    }
    return ids;
  }, [latexSource]);

  async function generate() {
    setError(null);
    setNotes([]);
    setSuggested(null);

    if (!jobDescription.trim()) {
      setError("Paste a job description first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/resume/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, latexSource }),
      });
      console.log(res,"resss")
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data = await res.json();
      const parsed = ResumePatchSchema.parse(data);
      setSuggested(parsed);
      setNotes(parsed.notes ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate patch.");
    } finally {
      setLoading(false);
    }
  }

  function applySuggested() {
    if (!suggested) return;
    setHistory((h) => [latexSource, ...h].slice(0, 25));
    const { next, missingIds } = applyPatch(latexSource, suggested);
    setLatexSource(next);
    setSuggested(null);
    if (missingIds.length) {
      setNotes((n) => [
        ...n,
        `Warning: could not find blocks: ${missingIds.join(", ")}`,
      ]);
    }
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const [prev, ...rest] = h;
      setLatexSource(prev);
      return rest;
    });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Job Tracker MVP</div>
            <div className="text-xs text-neutral-600">Section 1: Resume (LaTeX) + JD tailoring</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Undo
            </button>
            <button
              onClick={generate}
              disabled={loading}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate suggestions"}
            </button>
            <button
              onClick={applySuggested}
              disabled={!suggested}
              className="rounded-md border border-neutral-900 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Apply changes
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-2">
        {/* Left: JD + notes */}
        <section className="flex flex-col gap-3">
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-sm font-semibold">Job description</div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="mt-2 h-64 w-full resize-y rounded-md border border-neutral-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <div className="mt-2 text-xs text-neutral-500">
              Blocks found in your LaTeX: <span className="font-mono">{blockIds.join(", ") || "(none)"}</span>
            </div>
          </div>

          {(error || notes.length || suggested) && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-sm font-semibold">AI output</div>
              {error && (
                <p className="mt-2 text-sm text-red-600 whitespace-pre-wrap">{error}</p>
              )}

              {notes.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
                  {notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}

              {suggested && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-neutral-600">Patch summary</div>
                  <ul className="mt-1 list-disc pl-5 text-xs text-neutral-700">
                    {suggested.blocks.map((b) => (
                      <li key={b.id}>
                        Replace block <span className="font-mono">{b.id}</span> with {b.replaceWith.length} line(s)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-sm font-semibold">How this MVP works</div>
            <ol className="mt-2 list-decimal pl-5 text-sm text-neutral-700">
              <li>Your resume is a LaTeX template with replaceable blocks.</li>
              <li>AI returns JSON describing block replacements.</li>
              <li>Click <b>Apply changes</b> to patch your LaTeX safely.</li>
            </ol>
          </div>
        </section>

        {/* Right: Tabs */}
        <section className="flex min-h-[70vh] flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("preview")}
              className={`rounded-md px-3 py-1.5 text-sm border ${
                tab === "preview"
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setTab("latex")}
              className={`rounded-md px-3 py-1.5 text-sm border ${
                tab === "latex"
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white"
              }`}
            >
              LaTeX
            </button>
            <div className="ml-auto text-xs text-neutral-500">
              Tip: edit LaTeX, then switch back to Preview.
            </div>
          </div>

          <div className="h-[75vh]">
            {tab === "preview" ? (
              <ResumePDFPreview latexSource={latexSource} />
            ) : (
              <MonacoLatexEditor value={latexSource} onChange={setLatexSource} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
