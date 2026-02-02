"use client";

import { useState, useEffect } from "react";

// Dynamically import `react-pdf` on the client only to avoid server-side evaluation
// (pdf.js references browser-only globals like DOMMatrix which crash in Node).
type PDFLib = {
  Document: any;
  Page: any;
  pdfjs: any;
};

interface ResumePDFPreviewProps {
  latexSource: string;
}

export default function ResumePDFPreview({ latexSource }: ResumePDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  const [pdfLib, setPdfLib] = useState<PDFLib | null>(null);

  // Lazily load `react-pdf` on the client so pdf.js only runs in browser envs
  useEffect(() => {
    let cancelled = false;

    async function loadPdfLib() {
      try {
        const lib = await import("react-pdf");
        if (lib && !cancelled) {
          // Prefer bundler-provided worker entry from pdfjs-dist (works well with Next/Turbo).
          // Avoid build-time imports of pdf.worker (they can fail in some setups).
          // Try a runtime HEAD to the CDN worker to detect accessibility; fall back to the
          // unpkg CDN URL regardless so pdf.js can attempt to load it dynamically.
          const cdnUrl = `https://unpkg.com/pdfjs-dist@${lib.pdfjs.version}/build/pdf.worker.min.js`;
          try {
            const head = await fetch(cdnUrl, { method: "HEAD" });
            if (head.ok) {
              lib.pdfjs.GlobalWorkerOptions.workerSrc = cdnUrl;
            } else {
              // CDN returned non-OK; still set it but warn the user
              lib.pdfjs.GlobalWorkerOptions.workerSrc = cdnUrl;
              console.warn("PDF worker CDN responded with non-OK status", head.status);
            }
          } catch (err) {
            // network/CORS error; set workerSrc to CDN (may still fail at load time)
            lib.pdfjs.GlobalWorkerOptions.workerSrc = cdnUrl;
            console.warn("PDF worker HEAD request failed; falling back to CDN", err);
            // provide a helpful message so the UI can show instructions if worker fails
            setError(
              "PDF worker could not be verified via network. If the PDF viewer fails to load, add a local file '/pdf.worker.min.js' to the project's 'public/' directory or ensure network access to unpkg.com."
            );
          }

          setPdfLib({ Document: lib.Document, Page: lib.Page, pdfjs: lib.pdfjs });
        }
      } catch (e: any) {
        if (!cancelled) setError("Failed to load PDF viewer");
      }
    }

    // only load in client
    if (typeof window !== "undefined") loadPdfLib();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let prevUrl: string | null = null;

    const compileLaTeX = async () => {
      setLoading(true);
      setError(null);
      setNumPages(null);
      try {
        const res = await fetch("/api/resume/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latexSource }),
        });

        if (!res.ok) {
          let errMsg = "Failed to compile LaTeX";
          try {
            const data = await res.json();
            if (data?.error) errMsg = data.error;
          } catch {}
          throw new Error(errMsg);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }

        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = url;

        setPdfUrl(url);
      } catch (e: any) {
        setError(e?.message ?? "Failed to compile PDF");
        setPdfUrl(null);
      } finally {
        setLoading(false);
      }
    };

    compileLaTeX();

    return () => {
      active = false;
      if (prevUrl) URL.revokeObjectURL(prevUrl);
    };
  }, [latexSource]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-neutral-600">Compiling LaTeX...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-600">{error}</div>;
  }

  return (
    <div className="h-full rounded-lg border border-neutral-200 bg-white overflow-auto">
      {pdfUrl ? (
        pdfLib ? (
          <pdfLib.Document
            key={pdfUrl}
            file={pdfUrl}
            onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
            onLoadError={(err: any) => setError(err?.message ?? "Failed to load PDF")}
          >
            {numPages && numPages > 0 ? (
              Array.from({ length: numPages }).map((_, index) => (
                <pdfLib.Page key={`page_${index + 1}`} pageNumber={index + 1} width={600} />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-600">Loading PDF...</div>
            )}
          </pdfLib.Document>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600">Loading PDF viewer...</div>
        )
      ) : (
        <div className="flex items-center justify-center h-full text-neutral-600">No PDF generated</div>
      )}
    </div>
  );
}