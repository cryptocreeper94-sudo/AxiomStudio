/**
 * Axiom Studio — Diff Utilities
 * Line-by-line diff computation for file changes.
 * Uses a simple LCS-based diff algorithm — no external dependencies.
 *
 * DarkWave Studios LLC — Copyright 2026
 */

export interface DiffLine {
  type: "add" | "remove" | "same";
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  summary: string;
  additions: number;
  deletions: number;
  chunks: number;
}

/**
 * Compute a line-by-line diff between two strings.
 * Uses a simple O(n*m) LCS approach — fine for files under 10K lines.
 */
export function computeDiff(oldContent: string, newContent: string): DiffResult {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;

  // For very large files, fall back to a simpler approach
  if (m * n > 5_000_000) {
    return computeSimpleDiff(oldLines, newLines);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const lines: DiffLine[] = [];
  let i = m, j = n;

  const tempLines: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      tempLines.push({ type: "same", content: oldLines[i - 1], oldLine: i, newLine: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tempLines.push({ type: "add", content: newLines[j - 1], newLine: j });
      j--;
    } else {
      tempLines.push({ type: "remove", content: oldLines[i - 1], oldLine: i });
      i--;
    }
  }

  // Reverse since we built it backwards
  lines.push(...tempLines.reverse());

  return buildResult(lines);
}

/**
 * Simple diff for very large files — just marks all old as removed, all new as added.
 * Only used when LCS would be too expensive.
 */
function computeSimpleDiff(oldLines: string[], newLines: string[]): DiffResult {
  const lines: DiffLine[] = [];

  // Find common prefix
  let prefixLen = 0;
  while (prefixLen < oldLines.length && prefixLen < newLines.length && oldLines[prefixLen] === newLines[prefixLen]) {
    lines.push({ type: "same", content: oldLines[prefixLen], oldLine: prefixLen + 1, newLine: prefixLen + 1 });
    prefixLen++;
  }

  // Find common suffix
  let suffixLen = 0;
  while (
    suffixLen < oldLines.length - prefixLen &&
    suffixLen < newLines.length - prefixLen &&
    oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  // Middle section: all removed from old, all added from new
  for (let i = prefixLen; i < oldLines.length - suffixLen; i++) {
    lines.push({ type: "remove", content: oldLines[i], oldLine: i + 1 });
  }
  for (let i = prefixLen; i < newLines.length - suffixLen; i++) {
    lines.push({ type: "add", content: newLines[i], newLine: i + 1 });
  }

  // Common suffix
  for (let i = oldLines.length - suffixLen; i < oldLines.length; i++) {
    const newIdx = newLines.length - (oldLines.length - i);
    lines.push({ type: "same", content: oldLines[i], oldLine: i + 1, newLine: newIdx + 1 });
  }

  return buildResult(lines);
}

function buildResult(lines: DiffLine[]): DiffResult {
  const additions = lines.filter(l => l.type === "add").length;
  const deletions = lines.filter(l => l.type === "remove").length;

  // Count chunks (contiguous groups of changes)
  let chunks = 0;
  let inChunk = false;
  for (const line of lines) {
    if (line.type !== "same") {
      if (!inChunk) { chunks++; inChunk = true; }
    } else {
      inChunk = false;
    }
  }

  const summary = additions === 0 && deletions === 0
    ? "No changes"
    : `+${additions} -${deletions} lines in ${chunks} chunk${chunks !== 1 ? "s" : ""}`;

  return { lines, summary, additions, deletions, chunks };
}

/**
 * Generate a compact context diff (like unified diff format).
 * Shows only changed lines with 3 lines of context around each chunk.
 */
export function compactDiff(diff: DiffResult, contextLines = 3): DiffLine[] {
  const { lines } = diff;
  const result: DiffLine[] = [];
  const includeSet = new Set<number>();

  // Mark changed lines and their context
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].type !== "same") {
      for (let j = Math.max(0, i - contextLines); j <= Math.min(lines.length - 1, i + contextLines); j++) {
        includeSet.add(j);
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (includeSet.has(i)) {
      result.push(lines[i]);
    }
  }

  return result;
}
