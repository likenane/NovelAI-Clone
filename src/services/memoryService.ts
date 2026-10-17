import { MemoryThoughtProcess, MemoryResponse, MemoryArchiveEntryDraft } from '../types';

export const MANDATORY_MEMORY_HEADERS = [
  '1. 이야기의 뿌리',
  '2. 지난 경과',
  '3. 미해결 단서',
  '4. 인물 상태와 관계',
  '5. 직전 장면 이음새'
];

export const MEMORY_CHAR_BUDGET_TARGET = 4000;

/**
 * 기존 레거시 메모리 형식(3대 또는 4대 구형 헤더)인지 판별합니다.
 */
export function isLegacyMemoryFormat(text: string): boolean {
  if (!text) return false;
  return /대서사\s*핵심\s*기점|시간순\s*주요\s*사건|현재\s*서사\s*도달점|현재\s*인물\s*동향/i.test(text);
}

/**
 * 5대 필수 계층 헤더의 누락 여부를 정규식으로 엄격히 검증합니다.
 * ([1. 이야기의 뿌리], [2. 지난 경과], [3. 미해결 단서], [4. 인물 상태와 관계], [5. 직전 장면 이음새])
 */
export function validateMemoryHeaders(memoryText: string, allowLegacy: boolean = false): void {
  if (!memoryText || !memoryText.trim()) {
    throw new Error("스토리 메모리 내용이 비어 있습니다.");
  }

  const missing: string[] = [];
  if (!/1\.\s*이야기의\s*뿌리|이야기의\s*뿌리/i.test(memoryText)) {
    missing.push("1. 이야기의 뿌리");
  }
  if (!/2\.\s*지난\s*경과|지난\s*경과/i.test(memoryText)) {
    missing.push("2. 지난 경과");
  }
  if (!/3\.\s*미해결\s*단서|미해결\s*단서/i.test(memoryText)) {
    missing.push("3. 미해결 단서");
  }
  if (!/(?:4\.\s*인물\s*상태와\s*관계|인물\s*상태와\s*관계|인물\s*상태\s*및\s*관계|인물\s*상태)/i.test(memoryText)) {
    missing.push("4. 인물 상태와 관계");
  }
  if (!/(?:5\.\s*직전\s*장면\s*이음새|직전\s*장면\s*이음새|직전\s*장면\s*이음|장면\s*이음새)/i.test(memoryText)) {
    missing.push("5. 직전 장면 이음새");
  }

  if (missing.length > 0) {
    if (allowLegacy && isLegacyMemoryFormat(memoryText)) {
      return;
    }
    throw new Error(
      `스토리 메모리 필수 계층 헤더 누락 (${missing.join(', ')}).\n5대 계층 헤더([1. 이야기의 뿌리], [2. 지난 경과], [3. 미해결 단서], [4. 인물 상태와 관계], [5. 직전 장면 이음새])를 준수해야 합니다.`
    );
  }
}

/**
 * 스토리 메모리 완결성 및 최소 분량 검증
 */
export function validateMemoryCompleteness(memoryText: string, allowLegacy: boolean = false): void {
  validateMemoryHeaders(memoryText, allowLegacy);

  if (memoryText.trim().length < 100) {
    throw new Error("스토리 메모리 분량이 너무 짧거나 불완전합니다. (최소 100자 이상의 온전한 5대 계층 구성 필요)");
  }
}

/**
 * 2-Tier 하이브리드 복원 파이프라인:
 * 1-Pass: 마크다운 코드 블록 및 제어 문자 방어 정제 후 표준 JSON.parse 시도
 * 2-Pass: 정규식/슬라이싱 복원 (thoughtProcess, finalMemoryText, archiveEntries 추출)
 * Fail-Fast & Fallback: JSON 파싱이 부분 실패하더라도 finalMemoryText가 유효하면 안전하게 회복
 */
export function parseAndValidateMemoryResponse(rawResponse: string): MemoryResponse {
  if (!rawResponse || !rawResponse.trim()) {
    throw new Error("AI 응답이 비어 있습니다.");
  }

  let cleaned = rawResponse.trim();
  // Markdown 코드 블록(```json ... ```) 제거 방어
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  }

  // 최외곽 { 와 } 슬라이싱 (서두 프리앰블 및 말미 노이즈 제거)
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed: any = null;

  // 1-Pass: 표준 JSON.parse 시도
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    // 2-Pass: 정규식 기반 안전 추출
    const finalMemoryMatch = cleaned.match(/"finalMemoryText"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"archiveEntries"|}|\n|$)/);
    if (finalMemoryMatch && finalMemoryMatch[1]) {
      const extractedText = finalMemoryMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');

      try {
        validateMemoryHeaders(extractedText, true);
        return {
          thoughtProcess: undefined,
          finalMemoryText: extractedText.trim(),
          archiveEntries: []
        };
      } catch (validationErr) {
        // 계속 진행하여 폴백 처리
      }
    }

    // 3-Pass: JSON이 아니지만 이미 5대 헤더가 포함된 평문 텍스트로 응답한 경우 (모델의 스키마 일탈 방어)
    try {
      validateMemoryHeaders(rawResponse, true);
      return {
        thoughtProcess: undefined,
        finalMemoryText: rawResponse.trim(),
        archiveEntries: []
      };
    } catch {
      throw new Error(`스토리 메모리 JSON 파싱 실패: ${err.message || '유효하지 않은 JSON 구조입니다.'}`);
    }
  }

  // parsed 객체 유효성 점검
  if (!parsed || typeof parsed !== 'object') {
    throw new Error("AI 응답이 올바른 JSON 객체 형식이 아닙니다.");
  }

  let finalMemoryText = (parsed.finalMemoryText || parsed.memoryText || parsed.storyMemory || '').trim();

  if (!finalMemoryText && typeof parsed === 'object') {
    try {
      validateMemoryHeaders(rawResponse, true);
      finalMemoryText = rawResponse.trim();
    } catch {
      // do nothing
    }
  }

  if (!finalMemoryText) {
    throw new Error("AI 응답에 'finalMemoryText' 필드가 누락되었거나 내용이 비어 있습니다.");
  }

  // 완결성 및 5대 계층 헤더 검증
  validateMemoryCompleteness(finalMemoryText, false);

  // archiveEntries 파싱 및 정제
  const rawEntries = parsed.archiveEntries;
  const validatedArchiveEntries: MemoryArchiveEntryDraft[] = [];

  if (Array.isArray(rawEntries)) {
    for (const item of rawEntries) {
      if (!item || typeof item !== 'object') continue;

      const rawType = String(item.type || '').trim();
      const type = (rawType === '막요약' || rawType === '정정') ? rawType : '사건';

      let tags: string[] = [];
      if (Array.isArray(item.tags)) {
        tags = item.tags.map((t: any) => String(t).trim()).filter(Boolean);
      } else if (typeof item.tags === 'string') {
        tags = item.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }

      const time = String(item.time || '').trim();
      const content = String(item.content || '').trim();
      const lasting = String(item.lasting || '없음').trim();

      // content가 있는 경우만 유효한 카드로 인정
      if (content) {
        validatedArchiveEntries.push({
          type,
          tags: tags.length > 0 ? tags : ['기타'],
          time: time || '해당 시점',
          content,
          lasting: lasting || '없음'
        });
      }
    }
  }

  return {
    thoughtProcess: parsed.thoughtProcess as MemoryThoughtProcess,
    finalMemoryText,
    archiveEntries: validatedArchiveEntries
  };
}
