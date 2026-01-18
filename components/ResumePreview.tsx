"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  latexSource: string;
};

export default function ResumePreview({ latexSource }: Props) {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const input = useMemo(() => {
    const src = latexSource ?? "";
    // latex.js expects a full LaTeX document. If the user is editing a fragment,
    // wrap it in a minimal preamble + document environment.
    const hasBeginDoc = /\\begin\{document\}/.test(src);
    const hasDocClass = /\\documentclass(\[[^\]]*\])?\{[^}]+\}/.test(src);

    if (hasBeginDoc && hasDocClass) return src;

    // Strip any standalone \end{document} to avoid nesting issues.
    let cleaned = src.replace(/\\end\{document\}/g, "");

    // latex.js supports only a subset of LaTeX packages. Some common resume packages
    // (e.g., enumitem) may trigger module-load errors in the browser. Strip a few
    // known offenders from fragments so the preview remains usable.
    cleaned = cleaned
      // remove unsupported/usepackage lines
      .replace(/^\s*\\usepackage(\[[^\]]*\])?\{enumitem\}\s*$/gim, "")
      .replace(/^\s*\\usepackage(\[[^\]]*\])?\{lmodern\}\s*$/gim, "")
      .replace(/^\s*\\usepackage(\[[^\]]*\])?\{fontenc\}\s*$/gim, "")
      // remove enumitem configuration
      .replace(/^\s*\\setlist\[[^\]]+\]\{[^}]*\}\s*$/gim, "")
      .replace(/^\s*\\setlist\{[^}]*\}\s*$/gim, "");

    return [
      "\\documentclass{article}",
      "\\usepackage[margin=0.75in]{geometry}",
      "\\begin{document}",
      cleaned,
      "\\end{document}",
    ].join("\n");
  }, [latexSource]);


  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(null);

      try {
        
        // latex.js is CJS-ish; dynamic import works in the browser (bundled by Next).
        // @ts-ignore - latex.js does not ship TypeScript types
        const latexjs: any = await import("latex.js");
        const HtmlGenerator =
          latexjs?.HtmlGenerator ?? latexjs?.default?.HtmlGenerator;
        const parse = latexjs?.parse ?? latexjs?.default?.parse;

        if (!HtmlGenerator || !parse) {
          throw new Error(
            "latex.js import succeeded but did not expose parse/HtmlGenerator."
          );
        }

        const generator = new HtmlGenerator({
          hyphenate: false,
        });

        parse(input, { generator });

        // domFragment() returns a DocumentFragment; we serialize it.
        const fragment: DocumentFragment = generator.domFragment();
        const container = document.createElement("div");
        container.appendChild(fragment.cloneNode(true));

        if (!cancelled) setHtml(container.innerHTML);
      } catch (e: any) {
        if (!cancelled) {
          setHtml("");
          setError(e?.message ?? "Failed to render LaTeX preview.");
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [input]);

  if (error) {
    return (
      <div className="h-full w-full overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-sm font-semibold text-neutral-800">Preview</div>
        <p className="mt-2 text-sm text-neutral-600">
          Preview failed (this MVP preview supports a subset of LaTeX).
        </p>
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-neutral-700 border border-neutral-200">
          {error}
        </pre>
        <p className="mt-3 text-xs text-neutral-500">
          Tip: the LaTeX source is still editable in the LaTeX tab.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto rounded-lg border border-neutral-200 bg-white p-6">
      {/* latex.js emits its own markup; keep styles neutral */}
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
