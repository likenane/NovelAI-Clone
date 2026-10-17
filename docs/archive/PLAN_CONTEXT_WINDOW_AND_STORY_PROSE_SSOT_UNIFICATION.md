# Master Blueprint: Context Window & Story Prose Slicing SSOT Unification

---

## 1. Philosophical Context & Problem Diagnosis
- **발견된 결함**: 사용자가 UI에서 "본문 참조 길이(Context Window)"를 3,000자, 5,000자 등으로 지정하여도, 소설 1단계 초안 생성(Stage 1 Novel Generation) 시 소설 맨 처음(0번째 글자)부터 최신 부분까지 **전체 본문(수만 자 이상)**이 그대로 모델에 전송되는 치명적인 결함이 존재함.
- **원인 분석**:
  1. `src/lib/contextProviders.ts`의 `buildTotalVariableDictionary`에서 본문 관련 변수가 `RAW_PLAIN_TEXT`, `CLEAN_STORY_CONTEXT`, `STORY_CONTEXT`, `STORY_CONTEXT_NOVEL`, `STORY_CONTEXT_CODEX`, `STORY_CONTEXT_MEMORY`, `STORY_CONTEXT_AUTOCODEX`, `RECENT_CONTEXT` 등 무려 8개 이상으로 무질서하게 파편화되어 있었음.
  2. 개발 과정에서 변수명의 혼동으로 인해, 잘려진 `STORY_CONTEXT` 대신 지시어만 제거되고 길이 제한은 전혀 없는 전체 본문 `CLEAN_STORY_CONTEXT`를 `buildTaskMessages`의 `case 'novel'`에 주입함.
  3. 멀티턴 메시지 빌더인 `buildSyntheticHistoryMessages`는 입력 텍스트의 길이를 전혀 검증하지 않아, 소설 1자부터의 전체 본문이 Turn 1 (User)의 `## [Current Story Text]`에 고스란히 담김.
  4. 컨텍스트 윈도우 상한선을 보장하는 불변 가드(Invariant Guard)가 없어 이 결함이 런타임에 탐지되지 않고 방치됨.

---

## 2. Deep Self-Critique (4대 핵심 차원 심층 자가 비판)

### ① 구현 세밀도 (Feasibility & Granularity)
- **비판**: 단순히 `CLEAN_STORY_CONTEXT`를 `STORY_CONTEXT`로 바꾸는 지엽적 수정은 또 다른 모호한 변수 사용으로 인한 동일 버그의 재발을 막을 수 없다.
- **해결책**:
  - `resolveStoryContextEngine(htmlContent, options)`라는 강력한 단일 진실 공급원(SSOT) 함수를 구축.
  - 전처리 순서 엄격화: **(1) HTML 태그 제거 및 텍스트 정규화 -> (2) 최하단 lookback 범위 내 `{}` 작가 지시어 완전 추출 및 격리 제거 -> (3) [불변 원칙] 순수 본문에서 최근 `contextWindow` 글자 수만큼 후방 슬라이싱 -> (4) `continuationLength`에 따른 본체(proseBody)와 앵커 테일(anchorTail) 분리**.
  - 지시어를 먼저 제거하고 슬라이싱하므로 지시어로 인해 본문 참조 길이가 줄어드는 왜곡이 발생하지 않음.

### ② 모듈화 및 파편화 방지 (Modularity & Anti-Fragmentation)
- **비판**: 여러 파일(`promptService.ts`, `refinerService.ts`, `contextProviders.ts`)에서 각자 본문을 자르거나 슬라이싱하면 추후 유지보수 시 파편화가 다시 일어난다.
- **해결책**:
  - 기존 `processNovelContext`를 `resolveStoryContextEngine`으로 흡수 통합하고, 하위 호환성을 위해 `processNovelContext`는 `resolveStoryContextEngine`을 호출하는 래퍼로 단순화.
  - `buildTotalVariableDictionary`의 반환 필드들을 완전히 정리하여, 모든 태스크가 오직 `resolveStoryContextEngine`에서 추출된 엄격 슬라이스 본문만을 사용하도록 강제.

### ③ 안정성 및 엣지 케이스 방어 (Stability)
- **비판**: 소설 본문이 `contextWindow`보다 짧은 극초반부(예: 100자), 또는 `continuationLength`보다 본문이 짧을 때의 인덱싱 오작동 위험이 있음.
- **해결책**:
  - `Math.max(0, ...)` 및 안전 슬라이싱 가드를 적용하여 본문이 극히 짧은 경우 단일 턴 모드로 자연스럽게 폴백.
  - `buildSyntheticHistoryMessages` 내부에도 `contextWindow` 파라미터를 넘겨받아 `text.slice(-contextWindow)` 2차 심층 방어(Defense-in-Depth)를 추가.

### ④ 확장성 (Scalability)
- **비판**: 향후 새로운 AI 태스크가 추가될 때 다시 본문이 무단 노출될 수 있음.
- **해결책**:
  - `assertContextWindowGuard(messages, maxAllowedChars)`를 도입하여 프롬프트 빌더 종료 시점에 최종 메시지 페이로드의 본문 블록 길이가 설정된 상한선을 넘지 않는지 런타임 검증 및 자동 클리핑.

---

## 3. Detailed Execution Blueprint (세부 실행 계획)

### [Step 1] `src/lib/contextProviders.ts` - SSOT 엔진 `resolveStoryContextEngine` 구현
```typescript
export interface ResolvedStoryContext {
  windowProse: string;       // 엄격히 최근 contextWindow만큼 슬라이스된 본문 (지시어 제거 완료)
  windowProseNovel: string;  // 앵커 테일을 제외한 본문 (이어쓰기 멀티턴 및 탈고 본체용)
  anchorTailText: string;    // 이어쓰기 접합용 직전 미세 앵커 텍스트
  userDirectiveBlock: string;// 추출된 사용자 지시문 블록 (## [User Directive] ...)
  cleanFullContent: string;  // 전체 본문 (오직 단어수 카운트 등 비-프롬프트 용도로만 제한)
  isTruncated: boolean;      // 본문이 contextWindow보다 길어 상단이 잘렸는지 여부
}
```

### [Step 2] `buildSyntheticHistoryMessages` 이중 방어벽 및 contextWindow 파라미터 적용
- `buildSyntheticHistoryMessages`의 첫 번째 인자로 전달되는 텍스트를 내부에서도 `plainText.slice(-contextWindow)`로 2차 보증.

### [Step 3] `buildTaskMessages` 전면 정비
- `case 'novel'`: `variables.STORY_CONTEXT` 및 `contextWindow` 파라미터를 주입하여 전체 본문 누출 원천 차단.
- `case 'memory'`, `case 'plot'`, `case 'codex'`, `case 'autocodex'`, `case 'consistency'`:
  - 모두 동일한 `resolveStoryContextEngine` 산출물을 일관되게 주입받도록 일원화.

### [Step 4] Invariant Assertion Guard `assertContextWindowGuard` 구현
- `generateTaskContext` 최종 반환 직전, `messages`의 `## [Current Story Text]` 블록 길이가 `contextWindow + 여유버퍼(continuationLength)`를 넘지 않는지 검증 및 안전 클리핑.

### [Step 5] 검증 및 문서화
- `lint_applet` (`tsc --noEmit`) 및 `compile_applet` 실행.
- `AGENTS.md` (루트 및 `src/lib/AGENTS.md`, `src/services/AGENTS.md`) 갱신.
- `AUDIT_LOG.md` 기록.
- `PLAN_*.md`를 `docs/archive/`로 아카이브 및 `GEMINI.md` 락 해제.
- 사용자에게 Verification Checklist 제공.
