import { useState, useEffect, useCallback } from 'react';
import { getNovelCharCount, resetNovelCharCount, AutoCounterType, AUTO_COUNTER_EVENT } from '../lib/counterStorage';

/**
 * 소설별 Auto-Codex 및 Auto-Plot 누적 글자수를 실시간으로 관찰하고 리셋을 지원하는 React Hook
 * 
 * 1. Zero-Lag: 타이핑 중에도 에디터나 전체 앱을 리렌더링하지 않고, 이 훅을 구독하는 컴포넌트만 격리 렌더링
 * 2. Real-Time Sync: 커스텀 이벤트를 통해 글자수 타이핑 및 자동 스캔 리셋 발생 시 즉시 동기화
 * 3. Session Persistence: localStorage 기반으로 페이지 새로고침, 탭 전환 시에도 정확한 값 유지
 */
export function useAutoCounters(novelId: string | undefined) {
  const [codexCount, setCodexCount] = useState<number>(() => getNovelCharCount(novelId, 'autocodex'));
  const [plotCount, setPlotCount] = useState<number>(() => getNovelCharCount(novelId, 'autoplot'));

  useEffect(() => {
    setCodexCount(getNovelCharCount(novelId, 'autocodex'));
    setPlotCount(getNovelCharCount(novelId, 'autoplot'));
  }, [novelId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ novelId: string; type: AutoCounterType; count: number }>;
      if (!customEvent.detail || customEvent.detail.novelId !== novelId) return;

      if (customEvent.detail.type === 'autocodex') {
        setCodexCount(customEvent.detail.count);
      } else if (customEvent.detail.type === 'autoplot') {
        setPlotCount(customEvent.detail.count);
      }
    };

    window.addEventListener(AUTO_COUNTER_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(AUTO_COUNTER_EVENT, handleUpdate);
    };
  }, [novelId]);

  const resetCounter = useCallback((type: AutoCounterType) => {
    if (!novelId) return;
    resetNovelCharCount(novelId, type);
    if (type === 'autocodex') setCodexCount(0);
    if (type === 'autoplot') setPlotCount(0);
  }, [novelId]);

  return {
    codexCount,
    plotCount,
    resetCounter
  };
}
