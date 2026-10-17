/**
 * Lightweight Word-level Diff Engine (SSOT)
 * 
 * Implements Myers / LCS (Longest Common Subsequence) based token diffing
 * specifically optimized for Korean and multilingual novel prose.
 * Tokenizes text by words, whitespace, and punctuation to provide
 * fine-grained character/word-level revision tracking without external heavy dependencies.
 */

export type DiffChangeType = 'added' | 'removed' | 'unchanged';

export interface DiffToken {
  type: DiffChangeType;
  value: string;
}

export interface DiffStats {
  addedTokens: number;
  removedTokens: number;
  unchangedTokens: number;
  totalTokens: number;
  similarityRatio: number; // 0 to 100%
}

/**
 * Tokenize prose into words, whitespace, and punctuation units.
 * Preserves every character so reconstructing tokens yields the exact original text.
 */
export function tokenizeProseWords(text: string): string[] {
  if (!text) return [];
  // Matches whitespace clusters, Hangul/alphanumeric words, or individual punctuation marks
  const tokens = text.match(/[\s]+|[가-힣a-zA-Z0-9_]+|[^\s\w가-힣]/g);
  return tokens || [text];
}

/**
 * Computes word-level diff between before (raw draft) and after (refined text).
 */
export function computeWordDiff(beforeText: string, afterText: string): { tokens: DiffToken[]; stats: DiffStats } {
  const beforeTokens = tokenizeProseWords(beforeText);
  const afterTokens = tokenizeProseWords(afterText);

  const n = beforeTokens.length;
  const m = afterTokens.length;

  if (n === 0 && m === 0) {
    return {
      tokens: [],
      stats: { addedTokens: 0, removedTokens: 0, unchangedTokens: 0, totalTokens: 0, similarityRatio: 100 }
    };
  }

  if (n === 0) {
    return {
      tokens: [{ type: 'added', value: afterText }],
      stats: { addedTokens: m, removedTokens: 0, unchangedTokens: 0, totalTokens: m, similarityRatio: 0 }
    };
  }

  if (m === 0) {
    return {
      tokens: [{ type: 'removed', value: beforeText }],
      stats: { addedTokens: 0, removedTokens: n, unchangedTokens: 0, totalTokens: n, similarityRatio: 0 }
    };
  }

  // Fast path: if exact match
  if (beforeText === afterText) {
    return {
      tokens: [{ type: 'unchanged', value: beforeText }],
      stats: { addedTokens: 0, removedTokens: 0, unchangedTokens: n, totalTokens: n, similarityRatio: 100 }
    };
  }

  // Compute Longest Common Subsequence matrix
  // For long prose, limit DP matrix or use memory-efficient banded algorithm
  // Given typical single generation is 500~2,000 words, a standard or trimmed DP works smoothly.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (beforeTokens[i] === afterTokens[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack to assemble diff tokens
  const rawDiff: DiffToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeTokens[i - 1] === afterTokens[j - 1]) {
      rawDiff.push({ type: 'unchanged', value: beforeTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ type: 'added', value: afterTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ type: 'removed', value: beforeTokens[i - 1] });
      i--;
    }
  }

  rawDiff.reverse();

  // Merge adjacent tokens of the same type to minimize DOM node overhead
  const mergedTokens: DiffToken[] = [];
  for (const token of rawDiff) {
    const last = mergedTokens[mergedTokens.length - 1];
    if (last && last.type === token.type) {
      last.value += token.value;
    } else {
      mergedTokens.push({ ...token });
    }
  }

  // Calculate statistics (count non-whitespace tokens for meaningful stats)
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  for (const token of rawDiff) {
    const isWhitespace = /^\s+$/.test(token.value);
    if (!isWhitespace) {
      if (token.type === 'added') addedCount++;
      else if (token.type === 'removed') removedCount++;
      else if (token.type === 'unchanged') unchangedCount++;
    }
  }

  const meaningfulTotal = unchangedCount + Math.max(addedCount, removedCount);
  const similarityRatio = meaningfulTotal > 0
    ? Math.round((unchangedCount / meaningfulTotal) * 100)
    : 100;

  return {
    tokens: mergedTokens,
    stats: {
      addedTokens: addedCount,
      removedTokens: removedCount,
      unchangedTokens: unchangedCount,
      totalTokens: addedCount + removedCount + unchangedCount,
      similarityRatio
    }
  };
}
