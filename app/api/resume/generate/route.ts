import OpenAI from "openai";
import { ResumePatchSchema, type ResumePatch } from "@/lib/schema";

export const runtime = "nodejs";

type ReqBody = {
  jobDescription?: string;
  latexSource?: string;
};

const JSON_SCHEMA: any = {
  type: "object",
  additionalProperties: false,
  properties: {
    blocks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          replaceWith: {
            type: "array",
            minItems: 1,
            items: { type: "string" }
          }
        },
        required: ["id", "replaceWith"]
      }
    },
    notes: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["blocks"],
};

function extractBlocks(latexSource: string): Array<{ id: string; content: string; lines: string[] }> {
  const blocks: Array<{ id: string; content: string; lines: string[] }> = [];
  const re = /%<BLOCK id="([^"]+)">([\s\S]*?)%<\/BLOCK>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latexSource))) {
    const id = m[1];
    const content = (m[2] ?? "").trim();
    const lines = content ? content.split(/\r?\n/).map((l) => l.trimEnd()) : [];
    blocks.push({ id, content, lines });
  }
  return blocks;
}

function pickTopKeywords(jobDescription: string, max = 8): string[] {
  const stop = new Set([
    "the","and","with","for","you","your","our","are","will","this","that","from","into","have","has","had",
    "a","an","to","of","in","on","at","as","by","or","is","be","we","they","it","their","than","but",
    "experience","years","required","preferred","responsibilities","requirements","skills","role","team","work","using"
  ]);
  const tokens = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+.#\-\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t.length >= 3 && !stop.has(t));

  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([t]) => t);
}

function fallbackPatch(jobDescription: string, latexSource: string): ResumePatch {
  const blocks = extractBlocks(latexSource);
  const keywords = pickTopKeywords(jobDescription, 8);

  const patchBlocks = blocks.map((b) => {
    const id = b.id;

    // Heuristic: keep the same number of lines where possible
    const targetCount = Math.max(1, Math.min(5, b.lines.length || (id.includes("bullets") ? 3 : 1)));

    if (id.includes("summary")) {
      return {
        id,
        replaceWith: [
          `Tailored M.S. Data Science candidate with software engineering experience, focused on ${keywords.slice(0, 3).join(", ")} and delivering measurable impact.`
        ],
      };
    }

    if (id.includes("skills")) {
      const extras = keywords.slice(0, 6).map((k) => k.replace(/_/g, " "));
      return {
        id,
        replaceWith: [
          `\\textbf{Languages:} Python, TypeScript, SQL\\\\`,
          `\\textbf{Frameworks:} Next.js, React, FastAPI\\\\`,
          `\\textbf{Focus:} ${extras.join(", ")}`,
        ],
      };
    }

    // Bullet blocks: output \item lines
    const items: string[] = [];
    const focus = keywords.slice(0, 5);
    for (let i = 0; i < targetCount; i++) {
      const k = focus[i % Math.max(1, focus.length)] ?? "impact";
      items.push(`\\item Delivered ${k} improvements by aligning projects to the job requirements, improving quality and speed.`);
    }

    return { id, replaceWith: items };
  });

  return {
    blocks: patchBlocks,
    notes: [
      "OPENAI_API_KEY not set, so this is a local heuristic patch (no AI call).",
      `Keywords detected from JD: ${keywords.join(", ") || "(none)"}`,
      "Set OPENAI_API_KEY in .env.local to enable real AI suggestions."
    ],
  };
}

export async function POST(req: Request) {
  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const jobDescription = (body.jobDescription ?? "").toString();
  const latexSource = (body.latexSource ?? "").toString();

  if (!jobDescription.trim()) return new Response("jobDescription is required", { status: 400 });
  if (!latexSource.trim()) return new Response("latexSource is required", { status: 400 });

  // Basic size limits to keep requests sane
  if (jobDescription.length > 12000) return new Response("jobDescription too long", { status: 413 });
  if (latexSource.length > 50000) return new Response("latexSource too long", { status: 413 });

  const blocks = extractBlocks(latexSource);
  if (blocks.length === 0) {
    return new Response(
      "No %<BLOCK id=\"...\"> ... %</BLOCK> blocks found in latexSource.",
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(fallbackPatch(jobDescription, latexSource));
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const client = new OpenAI({ apiKey });

  const prompt = {
    jobDescription,
    blocks: blocks.map((b) => ({
      id: b.id,
      currentLines: b.lines,
      // For bullets, it helps the model see the pattern
      hint: b.id.includes("bullets") ? "Return LaTeX bullet lines starting with \\item" : "Return plain LaTeX lines"
    })),
    constraints: [
      "Return ONLY JSON matching the provided schema.",
      "Only modify existing blocks by id; do not invent new ids.",
      "Keep LaTeX valid (escape % as \\%, etc.).",
      "Prefer measurable impact + keywords that match the JD.",
      "Do not add any \"\\begin{document}\" or similar; only block content lines."
    ]
  };

  try {
    const resp = await client.responses.create({
      model,
      instructions:
        "You are a resume tailoring assistant. Produce a JSON patch that updates ONLY the provided LaTeX blocks. Do not output any extra text.",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(prompt) }]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ResumePatch",
          strict: true,
          schema: JSON_SCHEMA
        }
      }
    });

    const raw = resp.output_text?.trim();
    if (!raw) throw new Error("Empty model response.");

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("Model returned non-JSON output.");
    }

    const parsed = ResumePatchSchema.parse(json);
    return Response.json(parsed);
  } catch (err: any) {
    const message = err?.message ?? "AI request failed";
    return new Response(message, { status: 500 });
  }
}
