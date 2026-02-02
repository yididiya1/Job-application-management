"use client";

import { useEffect, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ResumeData } from "./ResumeForm";
import { marked } from "marked";

type Segment = { text: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string };

function segmentsFromInlineTokens(tokens: any[]): Segment[] {
  const out: Segment[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        out.push({ text: t.text });
        break;
      case 'strong': {
        const inner = segmentsFromInlineTokens((t as any).tokens || []);
        for (const s of inner) out.push({ ...s, bold: true });
        break;
      }
      case 'em': {
        const inner = segmentsFromInlineTokens((t as any).tokens || []);
        for (const s of inner) out.push({ ...s, italic: true });
        break;
      }
      case 'codespan':
        out.push({ text: t.text, code: true });
        break;
      case 'link': {
        const inner = segmentsFromInlineTokens((t as any).tokens || [{ type: 'text', text: t.text }]);
        for (const s of inner) out.push({ ...s, href: t.href });
        out.push({ text: ` (${t.href})`, href: t.href });
        break;
      }
      case 'html':
        out.push({ text: (t as any).text.replace(/<[^>]+>/g, '') });
        break;
      default:
        if ((t as any).tokens) out.push(...segmentsFromInlineTokens((t as any).tokens));
        break;
    }
  }
  return out;
}

function tokenToBlocks(src: string) {
  const tokens = marked.lexer(src || "");
  const blocks: Array<{ type: string; tokens?: any[]; items?: any[] }> = [];
  for (const tk of tokens) {
    if (tk.type === "paragraph") {
      blocks.push({ type: "paragraph", tokens: (tk as any).tokens || [{ type: "text", text: tk.text }] });
    } else if (tk.type === "list") {
      const items: any[] = [];
      for (const it of (tk as any).items || []) {
        items.push((it as any).tokens || [{ type: 'text', text: it.text }]);
      }
      blocks.push({ type: "list", items });
    } else if (tk.type === "heading") {
      blocks.push({ type: "paragraph", tokens: [{ type: 'text', text: (tk as any).text }] });
    } else if (tk.type === "html") {
      // basic handling — strip tags
      blocks.push({ type: "paragraph", tokens: [{ type: 'text', text: (tk as any).text.replace(/<[^>]+>/g, '') }] });
    }
  }
  return blocks;
}

async function renderSegmentsLines(page: any, docFonts: any, segments: Segment[], xStart: number, y: number, maxWidth: number, size: number, color: any): Promise<number> {
  // Split segments into words preserving style
  type WordSeg = { text: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string };
  const words: WordSeg[] = [];
  for (const seg of segments) {
    const parts = seg.text.split(/\s+/);
    for (const p of parts) {
      if (!p) continue;
      words.push({ text: p, bold: seg.bold, italic: seg.italic, code: seg.code, href: seg.href });
    }
  }

  let line: WordSeg[] = [];
  let cursorX = xStart;

  function measureWord(w: WordSeg) {
    const f = w.code ? docFonts.code : (w.bold && w.italic ? docFonts.boldItalic : w.bold ? docFonts.bold : w.italic ? docFonts.italic : docFonts.normal);
    return f.widthOfTextAtSize(w.text, size);
  }

  const renderedLines: WordSeg[][] = [];
  for (const w of words) {
    const wWidth = measureWord(w);
    const spaceWidth = measureWord({ text: ' ' });
    const currentWordWidths = line.reduce((sum, s) => sum + measureWord(s), 0);
    const currentWidth = currentWordWidths + (line.length ? (line.length - 1) * spaceWidth : 0);
    if (currentWidth + (line.length ? spaceWidth : 0) + wWidth > maxWidth && line.length) {
      renderedLines.push(line);
      line = [w];
    } else {
      line.push(w);
    }
  }
  if (line.length) renderedLines.push(line);

  // draw lines
  for (const l of renderedLines) {
    let x = xStart;
    for (const w of l) {
      const f = w.code ? docFonts.code : (w.bold && w.italic ? docFonts.boldItalic : w.bold ? docFonts.bold : w.italic ? docFonts.italic : docFonts.normal);
      const col = w.href ? rgb(0.1, 0.3, 0.6) : color;
      page.drawText(w.text, { x, y, size, font: f, color: col });
      const wWidth = f.widthOfTextAtSize(w.text, size);
      // underline links
      if (w.href) {
        page.drawLine({ start: { x, y: y - 2 }, end: { x: x + wWidth, y: y - 2 }, thickness: 0.5, color: col });
      }

      x += wWidth;

      // add space if next word exists
      const idx = l.indexOf(w);
      if (idx !== l.length - 1) {
        const spW = docFonts.normal.widthOfTextAtSize(' ', size);
        x += spW;
      }
    }
    y -= 14; // lineHeight
  }

  return y;
}

function replaceLinks(text: string) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => `${t} (${u})`);
}

function wrapText(font: any, text: string, maxWidth: number, size: number) {
  const cleaned = replaceLinks(text);
  const words = cleaned.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const candidate = current ? current + " " + w : w;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function ResumePDFBuilder({ data }: { data: ResumeData }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let prevUrl: string | null = null;

    async function buildPdf() {
      setLoading(true);
      setError(null);

      try {
        const doc = await PDFDocument.create();
        let page = doc.addPage([595.28, 841.89]); // A4
        let { width, height } = page.getSize();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        const italicFont = await doc.embedFont(StandardFonts.HelveticaOblique);
        const boldItalicFont = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
        const codeFont = await doc.embedFont(StandardFonts.Courier);
        const smallFont = font; // using same font; size will vary

        const docFonts = { normal: font, bold: boldFont, italic: italicFont, boldItalic: boldItalicFont, code: codeFont };

        let y = height - 48;
        const left = 48;
        const right = width - 48;
        const lineHeight = 14;

        // Header: centered name
        const nameSize = 20;
        const nameWidth = font.widthOfTextAtSize(data.header.name || "", nameSize);
        page.drawText(data.header.name || "", { x: (width - nameWidth) / 2, y, size: nameSize, font, color: rgb(0,0,0) });
        y -= 26;

        // Contact line centered
        const contactParts = [data.header.location, data.header.email, data.header.phone, data.header.linkedin, data.header.github].filter(Boolean) as string[];
        const contactLine = contactParts.join(' | ');
        const contactSize = 9;
        const contactWidth = font.widthOfTextAtSize(contactLine, contactSize);
        page.drawText(contactLine, { x: (width - contactWidth) / 2, y, size: contactSize, font, color: rgb(0.2,0.2,0.2) });
        y -= 16;

        // Horizontal rule
        page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.75, color: rgb(0.2,0.2,0.2) });
        y -= 18;

        const printSectionTitle = (title: string) => {
          page.drawText(title.toUpperCase(), { x: left, y, size: 10, font, color: rgb(0,0,0) });
          y -= lineHeight;
          page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85,0.85,0.85) });
          y -= 12;
        };

        // EDUCATION
        if (data.education && data.education.length) {
          printSectionTitle('Education');
          for (const ed of data.education) {
            // school left, date right
            const schoolSize = 11;
            const schoolText = ed.school || '';
            const dateText = ((ed.start || '') + (ed.start && ed.end ? ' – ' : '') + (ed.end || '')).trim();
            const dateWidth = font.widthOfTextAtSize(dateText, 10);
            page.drawText(schoolText, { x: left, y, size: schoolSize, font, color: rgb(0,0,0) });
            if (dateText) page.drawText(dateText, { x: right - dateWidth, y, size: 10, font, color: rgb(0.2,0.2,0.2) });
            y -= lineHeight;
            // degree (italic-ish by smaller size)
            const degreeText = ed.degree || '';
            const degreeLines = wrapText(font, degreeText, right - left, 10);
            for (const ln of degreeLines) {
              page.drawText(ln, { x: left + 6, y, size: 10, font: smallFont, color: rgb(0.2,0.2,0.2) });
              y -= lineHeight;
            }
            // location/gpa line
            let meta = '';
            if (ed.location) meta += ed.location;
            if (ed.gpa) meta += (meta ? ' • ' : '') + `GPA: ${ed.gpa}`;
            if (meta) {
              page.drawText(meta, { x: left + 6, y, size: 9, font: smallFont, color: rgb(0.3,0.3,0.3) });
              y -= lineHeight;
            }
            y -= 6;
            if (y < 72) {
              page = doc.addPage([595.28, 841.89]);
              ({ width, height } = page.getSize());
              y = height - 48;
            }
          }
        }

        // EXPERIENCE
        if (data.experience && data.experience.length) {
          printSectionTitle('Experience');
          for (const ex of data.experience) {
            const titleText = `${ex.title || ''}`;
            const companyMeta = `${ex.company || ''}${ex.location ? ' — ' + ex.location : ''}`.trim();
            const dateText = ((ex.start || '') + (ex.start && ex.end ? ' – ' : '') + (ex.end || '')).trim();
            const dateWidth = font.widthOfTextAtSize(dateText, 10);

            page.drawText(titleText, { x: left, y, size: 11, font, color: rgb(0,0,0) });
            if (dateText) page.drawText(dateText, { x: right - dateWidth, y, size: 10, font, color: rgb(0.2,0.2,0.2) });
            y -= lineHeight;

            if (companyMeta) {
              page.drawText(companyMeta, { x: left + 6, y, size: 10, font: smallFont, color: rgb(0.15,0.15,0.15) });
              y -= lineHeight;
            }

            // project links (render simple inline)
            if (ex.projectLinks && ex.projectLinks.length) {
              const links = ex.projectLinks.join(' | ');
              const linkLines = wrapText(font, links, right - left - 20, 9);
              for (const ln of linkLines) {
                page.drawText(ln, { x: left + 6, y, size: 9, font: smallFont, color: rgb(0.1,0.3,0.6) });
                y -= lineHeight;
              }
            }

            // notes (markdown)
            if (ex.notes) {
              const blocks = tokenToBlocks(ex.notes);
              for (const b of blocks) {
                if (b.type === 'paragraph' && b.tokens) {
                  const segments = segmentsFromInlineTokens(b.tokens);
                  y = await renderSegmentsLines(page, docFonts, segments, left + 18, y, right - left - 18, 10, rgb(0.1,0.1,0.1));
                } else if (b.type === 'list' && b.items) {
                  for (const itemTokens of b.items) {
                    const segments = segmentsFromInlineTokens(itemTokens);
                    page.drawText('•', { x: left + 8, y, size: 10, font: smallFont, color: rgb(0,0,0) });
                    y = await renderSegmentsLines(page, docFonts, segments, left + 18, y, right - left - 36, 10, rgb(0.1,0.1,0.1));
                  }
                }
              }
            }

            y -= 6;
            if (y < 72) {
              page = doc.addPage([595.28, 841.89]);
              ({ width, height } = page.getSize());
              y = height - 48;
            }
          }
        }

        // Projects
        if (data.projects && data.projects.length) {
          printSectionTitle('Academic Projects');
          for (const p of data.projects) {
            page.drawText(p.title, { x: left, y, size: 11, font, color: rgb(0,0,0) });
            y -= lineHeight;
            // description can be markdown
            if (p.description) {
              const blocks = tokenToBlocks(p.description);
              for (const b of blocks) {
                if (b.type === 'paragraph' && b.tokens) {
                  const segments = segmentsFromInlineTokens(b.tokens);
                  y = await renderSegmentsLines(page, docFonts, segments, left + 6, y, right - left - 12, 10, rgb(0.1,0.1,0.1));
                } else if (b.type === 'list' && b.items) {
                  for (const itemTokens of b.items) {
                    const segments = segmentsFromInlineTokens(itemTokens);
                    page.drawText('•', { x: left + 8, y, size: 10, font: smallFont, color: rgb(0,0,0) });
                    y = await renderSegmentsLines(page, docFonts, segments, left + 18, y, right - left - 36, 10, rgb(0.1,0.1,0.1));
                  }
                }
              }
            }

            y -= 6;
            if (y < 72) {
              page = doc.addPage([595.28, 841.89]);
              ({ width, height } = page.getSize());
              y = height - 48;
            }
          }
        }

        // Other (personal notes)
        if (data.other) {
          printSectionTitle('Other');
          const blocks = tokenToBlocks(data.other);
          for (const b of blocks) {
            if (b.type === 'paragraph' && b.tokens) {
              const segments = segmentsFromInlineTokens(b.tokens);
              y = await renderSegmentsLines(page, docFonts, segments, left + 6, y, right - left - 12, 10, rgb(0.1,0.1,0.1));
            } else if (b.type === 'list' && b.items) {
              for (const itemTokens of b.items) {
                const segments = segmentsFromInlineTokens(itemTokens);
                page.drawText('•', { x: left + 8, y, size: 10, font: smallFont, color: rgb(0,0,0) });
                y = await renderSegmentsLines(page, docFonts, segments, left + 18, y, right - left - 36, 10, rgb(0.1,0.1,0.1));
              }
            }
          }
        }

        // Technical Knowledge
        if (data.technical) {
          printSectionTitle('Technical Knowledge');
          const techLines = wrapText(font, data.technical, right - left - 12, 10);
          for (const ln of techLines) {
            page.drawText(ln, { x: left + 6, y, size: 10, font: smallFont, color: rgb(0.1,0.1,0.1) });
            y -= lineHeight;
          }
        }

        const bytes = await doc.save();
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        if (prevUrl) URL.revokeObjectURL(prevUrl);
        prevUrl = url;
        setPdfUrl(url);
      } catch (e: any) {
        setError(e?.message ?? "Failed to build PDF");
        setPdfUrl(null);
      } finally {
        setLoading(false);
      }
    }

    buildPdf();

    return () => {
      cancelled = true;
      if (prevUrl) URL.revokeObjectURL(prevUrl);
    };
  }, [data]);

  return (
    <div className="h-full p-4">
      {loading && <div className="text-neutral-600">Rendering PDF...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {pdfUrl ? (
        <div className="h-full">
          <div className="mb-2 flex gap-2">
            <a className="px-3 py-1 bg-neutral-100 rounded" href={pdfUrl} download="resume.pdf">Download PDF</a>
          </div>
          <iframe src={pdfUrl} className="w-full h-[calc(100%-48px)] border-none" title="Resume PDF" />
        </div>
      ) : (
        <div className="text-neutral-500">No PDF generated yet</div>
      )}
    </div>
  );
}
