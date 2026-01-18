import type { ResumePatch } from "@/lib/schema";

/**
 * Patches LaTeX between markers:
 *   %<BLOCK id="some_id">
 *   ... lines ...
 *   %</BLOCK>
 */
export function applyPatch(latexSource: string, patch: ResumePatch): {
  next: string;
  appliedIds: string[];
  missingIds: string[];
} {
  let next = latexSource;
  const appliedIds: string[] = [];
  const missingIds: string[] = [];

  for (const block of patch.blocks) {
    const start = `%<BLOCK id="${block.id}">`;
    const end = `%</BLOCK>`;

    const startIdx = next.indexOf(start);
    if (startIdx === -1) {
      missingIds.push(block.id);
      continue;
    }

    const endIdx = next.indexOf(end, startIdx);
    if (endIdx === -1) {
      missingIds.push(block.id);
      continue;
    }

    const before = next.slice(0, startIdx + start.length);
    const after = next.slice(endIdx);

    // Ensure we keep a leading newline after the start marker and one before end marker
    const replacement = `\n${block.replaceWith.join("\n")}\n`;
    next = before + replacement + after;
    appliedIds.push(block.id);
  }

  return { next, appliedIds, missingIds };
}
