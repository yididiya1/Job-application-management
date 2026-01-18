# Job Tracker MVP (Section 1)

This is a minimal Next.js app for **Resume (LaTeX) editing + Job Description tailoring**.

It includes:
- A 2-pane layout
  - **Left:** Job Description input + AI patch output
  - **Right:** Tabs for **Preview** (rendered via `latex.js`) and **LaTeX** (Monaco editor)
- A safe editing approach using **replaceable LaTeX blocks**:
  - The AI returns a JSON patch that replaces only content inside `%<BLOCK id="..."> ... %</BLOCK>` markers
- A Next.js Route Handler at `POST /api/resume/generate`
  - If `OPENAI_API_KEY` is missing, it falls back to a local heuristic patch

## Requirements
- Node.js 18+ (20+ recommended)
- npm / pnpm / yarn (examples below use **npm**)

## Install & Run

1) Unzip the project

2) Install dependencies:
```bash
cd job-tracker-mvp
npm install
```

3) (Optional) Enable real AI suggestions

Create a `.env.local` file:
```bash
cp .env.example .env.local
```

Then set:
- `OPENAI_API_KEY=...`
- (optional) `OPENAI_MODEL=gpt-4o-mini`

4) Start the dev server:
```bash
npm run dev
```

Open:
- http://localhost:3000/editor

## How the LaTeX block patching works

Your LaTeX resume should include block markers like:

```tex
%<BLOCK id="summary">
Motivated M.S. Data Science student...
%</BLOCK>
```

The API returns JSON like:

```json
{
  "blocks": [
    {
      "id": "summary",
      "replaceWith": ["Tailored summary line..."]
    }
  ],
  "notes": ["Why these edits help..."]
}
```

When you click **Apply changes**, the app replaces only the content inside those markers.

## Notes / MVP limitations
- The LaTeX preview uses `latex.js`, which supports a **subset** of LaTeX. If preview fails, use the **LaTeX** tab.
- This MVP does not compile LaTeX to PDF. (That can be added later with server-side compilation + PDF viewer.)

## Folder overview
- `app/editor/page.tsx` - Editor page
- `components/ResumeEditor.tsx` - Main UI
- `components/MonacoLatexEditor.tsx` - LaTeX editor
- `components/ResumePreview.tsx` - Preview renderer
- `app/api/resume/generate/route.ts` - AI/heuristic patch API
- `lib/applyPatch.ts` - Block replacement logic
- `lib/sampleLatex.ts` - Starter resume template
