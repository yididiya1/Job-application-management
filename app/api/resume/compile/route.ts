import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";

type RunOptions = { timeout?: number; cwd?: string };

function runCommand(cmd: string, args: string[], opts: RunOptions = {}): Promise<void> {
  const timeout = opts.timeout ?? 10000;
  const cwd = opts.cwd;
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "ignore", cwd });
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      reject(new Error("Command timed out"));
    }, timeout);

    proc.on("error", (err: any) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

export async function POST(req: NextRequest) {
  const tmpPrefix = path.join(os.tmpdir(), "latex-");
  let tmpDir: string | null = null;

  try {
    const { latexSource } = await req.json();

    if (!latexSource) {
      return NextResponse.json({ error: "No LaTeX source provided" }, { status: 400 });
    }

    // Create a temporary directory for pdflatex
    tmpDir = await mkdtemp(tmpPrefix);
    const texPath = path.join(tmpDir, "main.tex");
    await writeFile(texPath, latexSource, "utf8");

    const pdfPath = path.join(tmpDir, "main.pdf");

    // Try running pdflatex (best-effort). If not available or fails, fall back to latex.js
    try {
      await runCommand("pdflatex", ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", tmpDir, texPath], { timeout: 10000 });
    } catch (pdflatexErr) {
      console.warn("pdflatex failed or not available, falling back to latex.js:", pdflatexErr);
    }

    // If pdflatex produced a PDF use it
    try {
      const data = await readFile(pdfPath);
      return new NextResponse(data as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="resume.pdf"',
        },
      });
    } catch (e) {
      // pdflatex didn't produce a PDF. Try tectonic (if installed) as a fallback.
      try {
        await runCommand("tectonic", [texPath], { timeout: 15000, cwd: tmpDir ?? undefined });
        const data = await readFile(pdfPath);
        return new NextResponse(data as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="resume.pdf"',
          },
        });
      } catch (tectonicErr) {
        console.warn("tectonic failed or not available:", tectonicErr);
        // Neither pdflatex nor tectonic produced a PDF
        return NextResponse.json({
          error:
            "No PDF produced. Install a TeX distribution (e.g., TeX Live) or install \"tectonic\" for a lightweight compiler, then retry."
        }, { status: 502 });
      }
    }
  } catch (error: any) {
    console.error("LaTeX compilation error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to compile LaTeX" },
      { status: 500 }
    );
  } finally {
    // Cleanup temp dir if created
    if (tmpDir) {
      try {
        await rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        // ignore
      }
    }
  }
}