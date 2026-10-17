/**
 * 소설별 백그라운드 자동화(Auto-Codex, Auto-Plot) 누적 글자수 영속 스토리지 SSOT 유틸리티
 * 
 * 1. Zero-I/O: Firestore 읽기/쓰기를 발생시키지 않고 브라우저 localStorage에 소설 ID 기반으로 안전하게 격리 보관
 * 2. 세션 지속성: 새로고침(F5), 브라우저 탭 닫기, 사이드바 소설 전환, 설정 토글 시에도 누적 글자수가 100% 보존됨
 * 3. 예외 안전성: 시크릿 모드나 QuotaExceededError 등 브라우저 스토리지 장애 환경에서도 Graceful Degradation 지원
 */

export type AutoCounterType = 'autocodex' | 'autoplot';

export const AUTO_COUNTER_EVENT = 'novel-counter-updated';

export interface AutoCounterEventDetail {
  novelId: string;
  type: AutoCounterType;
  count: number;
}

function getStorageKey(novelId: string, type: AutoCounterType): string {
  return `novel_counter_${type}_${novelId}`;
}

/**
 * 특정 소설의 누적 글자수를 조회합니다. (저장된 값이 없거나 에러 시 0 반환)
 */
export function getNovelCharCount(novelId: string | undefined, type: AutoCounterType): number {
  if (!novelId) return 0;
  try {
    const raw = localStorage.getItem(getStorageKey(novelId, type));
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch (err) {
    console.warn(`[counterStorage] Failed to read counter for novel ${novelId}:`, err);
    return 0;
  }
}

/**
 * 특정 소설의 누적 글자수를 저장합니다. (0 미만은 0으로 클램프)
 * 이벤트 디스패치를 통해 실시간 UI 동기화를 지원합니다.
 */
export function setNovelCharCount(novelId: string | undefined, type: AutoCounterType, count: number): void {
  if (!novelId) return;
  const safeCount = Math.max(0, Math.floor(count));
  try {
    localStorage.setItem(getStorageKey(novelId, type), String(safeCount));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTO_COUNTER_EVENT, {
        detail: { novelId, type, count: safeCount }
      }));
    }
  } catch (err) {
    console.warn(`[counterStorage] Failed to save counter for novel ${novelId}:`, err);
  }
}

/**
 * 특정 소설의 누적 글자수를 0으로 리셋합니다.
 */
export function resetNovelCharCount(novelId: string | undefined, type: AutoCounterType): void {
  if (!novelId) return;
  try {
    localStorage.setItem(getStorageKey(novelId, type), '0');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTO_COUNTER_EVENT, {
        detail: { novelId, type, count: 0 }
      }));
    }
  } catch (err) {
    console.warn(`[counterStorage] Failed to reset counter for novel ${novelId}:`, err);
  }
}

/**
 * 소설 삭제 시 해당 소설의 누적 카운터 항목들을 정리합니다.
 */
export function purgeNovelCounters(novelId: string | undefined): void {
  if (!novelId) return;
  try {
    localStorage.removeItem(getStorageKey(novelId, 'autocodex'));
    localStorage.removeItem(getStorageKey(novelId, 'autoplot'));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTO_COUNTER_EVENT, {
        detail: { novelId, type: 'autocodex', count: 0 }
      }));
      window.dispatchEvent(new CustomEvent(AUTO_COUNTER_EVENT, {
        detail: { novelId, type: 'autoplot', count: 0 }
      }));
    }
  } catch (err) {
    console.warn(`[counterStorage] Failed to purge counters for novel ${novelId}:`, err);
  }
}

