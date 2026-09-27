export interface FuzzyResult {
  matches: boolean;
  score: number;
  indices: number[];
}

export interface MatchedSegment {
  text: string;
  match: boolean;
}

/**
 * Normalizes text for comparison:
 * - Lowercase
 * - Strips diacritics/macrons (e.g. ō, ū, é)
 * - Trims whitespace
 */
export function normalizeText(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Fuzzy matches pattern against text.
 * Supports English, Japanese (Kanji/Kana), and Thai.
 * Returns match status, ranking score, and matched indices in original text for visual highlighting.
 */
export function fuzzyMatch(pattern: string, text: string): FuzzyResult {
  if (!pattern || !pattern.trim()) {
    return { matches: true, score: 0, indices: [] };
  }
  if (!text || !text.trim()) {
    return { matches: false, score: -1, indices: [] };
  }

  const rawPattern = pattern.trim();
  const rawText = text.trim();
  const lowerPattern = rawPattern.toLowerCase();
  const lowerText = rawText.toLowerCase();

  // Exact match (case insensitive)
  if (lowerText === lowerPattern) {
    return {
      matches: true,
      score: 1000,
      indices: Array.from({ length: rawText.length }, (_, i) => i),
    };
  }

  // Check direct substring match first (preserves exact character indices)
  const directSubIdx = lowerText.indexOf(lowerPattern);
  if (directSubIdx !== -1) {
    const isWordStart = directSubIdx === 0 || /[\s\-_/(\[]/.test(lowerText[directSubIdx - 1]);
    const score = isWordStart ? 500 - directSubIdx : 350 - directSubIdx;
    const indices: number[] = [];
    for (let i = 0; i < rawPattern.length; i++) {
      indices.push(directSubIdx + i);
    }
    return { matches: true, score, indices };
  }

  // Normalized substring match (handles romanization accents like ō -> o)
  const normPattern = normalizeText(pattern);
  const normText = normalizeText(text);

  const normSubIdx = normText.indexOf(normPattern);
  if (normSubIdx !== -1) {
    const isWordStart = normSubIdx === 0 || /[\s\-_/(\[]/.test(normText[normSubIdx - 1]);
    const score = isWordStart ? 450 - normSubIdx : 300 - normSubIdx;
    const indices: number[] = [];
    for (let i = 0; i < normPattern.length && (normSubIdx + i) < rawText.length; i++) {
      indices.push(normSubIdx + i);
    }
    return { matches: true, score, indices };
  }

  // Subsequence fuzzy match: characters of pattern must appear in sequence
  let pIdx = 0;
  let tIdx = 0;
  const indices: number[] = [];
  let score = 100;
  let prevMatchIdx = -2;

  while (pIdx < normPattern.length && tIdx < normText.length) {
    if (normPattern[pIdx] === normText[tIdx]) {
      indices.push(tIdx);
      if (tIdx === prevMatchIdx + 1) {
        score += 25; // consecutive match bonus
      }
      if (tIdx === 0 || /[\s\-_/(\[]/.test(normText[tIdx - 1])) {
        score += 20; // word start bonus
      }
      prevMatchIdx = tIdx;
      pIdx++;
    }
    tIdx++;
  }

  if (pIdx === normPattern.length) {
    const span = indices[indices.length - 1] - indices[0] + 1;
    score -= (span - normPattern.length) * 2; // span spread penalty
    return { matches: true, score, indices };
  }

  return { matches: false, score: -1, indices: [] };
}

/**
 * Splits text into segments indicating whether each part matched,
 * allowing clean rendering of highlighted characters without altering original text casing.
 */
export function getMatchedSegments(text: string, indices: number[]): MatchedSegment[] {
  if (!text) return [];
  if (!indices || indices.length === 0) {
    return [{ text, match: false }];
  }

  const indexSet = new Set(indices);
  const segments: MatchedSegment[] = [];
  let currentText = "";
  let isCurrentMatch = false;

  for (let i = 0; i < text.length; i++) {
    const isMatch = indexSet.has(i);
    if (i === 0) {
      isCurrentMatch = isMatch;
      currentText = text[i];
    } else if (isMatch === isCurrentMatch) {
      currentText += text[i];
    } else {
      segments.push({ text: currentText, match: isCurrentMatch });
      isCurrentMatch = isMatch;
      currentText = text[i];
    }
  }

  if (currentText) {
    segments.push({ text: currentText, match: isCurrentMatch });
  }

  return segments;
}
