/**
 * Precision Token Slicer for Fiction Prose Continuation
 * 
 * Accurately models LLM BPE/SentencePiece token density for Korean/English text
 * and slices the generated prose strictly at the user-configured maxTokens limit.
 * This guarantees predictable output length while preserving the physical cutoff aesthetic.
 */

export interface SliceResult {
  slicedText: string;
  consumedTokens: number;
  wasCutoff: boolean;
  totalTokens: number;
}

/**
 * Calculates the estimated token weight for a single character or token cluster.
 */
function getCharTokenWeight(char: string): number {
  const code = char.charCodeAt(0);

  // Korean Hangul Syllables (가 - 힣: 0xAC00 - 0xD7A3)
  // In Gemini SentencePiece, Hangul syllables typically consume ~0.65 to 0.75 tokens per syllable
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return 0.7;
  }

  // Korean Jamo (ㄱ - ㅎ, ㅏ - ㅣ)
  if ((code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F)) {
    return 0.8;
  }

  // ASCII Whitespace (space, newline, tab)
  if (char === ' ' || char === '\n' || char === '\r' || char === '\t') {
    return 0.3;
  }

  // ASCII Alphabets (English prose: ~4 chars per token -> ~0.25 per char)
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
    return 0.25;
  }

  // ASCII Digits and Common Punctuation
  if (code >= 32 && code <= 126) {
    return 0.35;
  }

  // CJK Ideographs / Full-width symbols
  if (code >= 0x4E00 && code <= 0x9FFF) {
    return 0.85;
  }

  // Default fallback for other unicode characters (emojis, rare symbols)
  return 1.0;
}

/**
 * Measures the total estimated tokens of a given text.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total += getCharTokenWeight(text[i]);
  }
  return Math.round(total);
}

/**
 * Slices a prose string precisely when cumulative token count reaches `maxTokens`.
 * 
 * @param text The pure generated prose (after anchor trimming).
 * @param maxTokens The target token boundary configured by the user.
 */
export function sliceProseByTokens(text: string, maxTokens: number): SliceResult {
  if (!text) {
    return { slicedText: "", consumedTokens: 0, wasCutoff: false, totalTokens: 0 };
  }

  const limit = Math.max(1, maxTokens);
  let accumulated = 0;
  let cutoffIndex = text.length;
  let wasCutoff = false;

  for (let i = 0; i < text.length; i++) {
    const weight = getCharTokenWeight(text[i]);
    if (accumulated + weight > limit) {
      cutoffIndex = i;
      wasCutoff = true;
      break;
    }
    accumulated += weight;
  }

  const slicedText = wasCutoff ? text.slice(0, cutoffIndex) : text;
  const totalTokens = wasCutoff ? estimateTokens(text) : Math.round(accumulated);

  return {
    slicedText,
    consumedTokens: Math.round(accumulated),
    wasCutoff,
    totalTokens
  };
}

// ---------------------------------------------------------------------------
// Dynamic Inspection Window Slicing for Consistency Refiner
// ---------------------------------------------------------------------------

export interface ProseSlice {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
}

/**
 * Splits draft text into optimal inspection slices (~250-350 chars)
 * using newline delimiters as the primary boundary to preserve dialogue and rhythm.
 * If newlines are sparse, sentence endings ([.!?]) are used as secondary boundaries.
 */
export function sliceProseIntoInspectionWindows(text: string, targetLength: number = 300): ProseSlice[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text;
  const totalLength = cleanText.length;

  // Edge case: if the total text is short (< 380 chars), evaluate as a single slice
  if (totalLength <= 380) {
    return [{
      index: 1,
      text: cleanText,
      startChar: 0,
      endChar: totalLength
    }];
  }

  const slices: ProseSlice[] = [];
  let currentStart = 0;
  let sliceIndex = 1;

  while (currentStart < totalLength) {
    const remainingLength = totalLength - currentStart;

    // If remaining text is short enough to be a final slice, take it all
    if (remainingLength <= 380) {
      slices.push({
        index: sliceIndex++,
        text: cleanText.slice(currentStart),
        startChar: currentStart,
        endChar: totalLength
      });
      break;
    }

    // Look for split boundary starting around targetLength (e.g. 230 ~ 380 chars)
    const minSearchPos = currentStart + 220;
    const maxSearchPos = Math.min(totalLength, currentStart + 380);
    const windowSubstr = cleanText.slice(minSearchPos, maxSearchPos);

    // Primary priority: Split at newline ('\n')
    let splitOffset = -1;
    const newlineMatch = windowSubstr.lastIndexOf('\n');
    if (newlineMatch !== -1) {
      splitOffset = minSearchPos + newlineMatch + 1; // Include the newline in current slice
    } else {
      // Secondary priority: Split at sentence punctuation followed by whitespace or quote
      const punctMatches = Array.from(windowSubstr.matchAll(/[.!?]["'”’]?(\s+|$)/g));
      if (punctMatches.length > 0) {
        const lastPunct = punctMatches[punctMatches.length - 1];
        if (lastPunct.index !== undefined) {
          splitOffset = minSearchPos + lastPunct.index + lastPunct[0].length;
        }
      }
    }

    // Tertiary fallback: If no newline or punctuation found, split at whitespace or maxSearchPos
    if (splitOffset === -1 || splitOffset <= currentStart) {
      const spaceMatch = windowSubstr.lastIndexOf(' ');
      if (spaceMatch !== -1) {
        splitOffset = minSearchPos + spaceMatch + 1;
      } else {
        splitOffset = maxSearchPos;
      }
    }

    const sliceText = cleanText.slice(currentStart, splitOffset);
    slices.push({
      index: sliceIndex++,
      text: sliceText,
      startChar: currentStart,
      endChar: splitOffset
    });

    currentStart = splitOffset;
  }

  // Final sanity check: If the last slice is too small (< 70 chars) and there's a preceding slice, merge it
  if (slices.length > 1) {
    const lastSlice = slices[slices.length - 1];
    if (lastSlice.text.trim().length < 70) {
      const prevSlice = slices[slices.length - 2];
      prevSlice.text = prevSlice.text + lastSlice.text;
      prevSlice.endChar = lastSlice.endChar;
      slices.pop();
    }
  }

  return slices;
}

/**
 * Formats sliced draft with unambiguous demarcations for the consistency refiner prompt.
 */
export function formatDraftWithSliceTags(slices: ProseSlice[]): string {
  if (slices.length === 0) return "";
  if (slices.length === 1) {
    return `[Slice 1 (${slices[0].text.length}자)]\n${slices[0].text}`;
  }

  return slices.map(s => `[Slice ${s.index} (${s.text.length}자)]\n${s.text}`).join('\n\n');
}

