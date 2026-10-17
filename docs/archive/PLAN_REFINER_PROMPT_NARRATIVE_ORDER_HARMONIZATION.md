# [MASTER BLUEPRINT] Refiner (MARS Stage 3) 프롬프트 서사 인과 순서 일원화 및 본문 전진 배치

---

## 1. 개요 및 배경 (Background & Root Cause)
- **문제 진단**:
  - 기존 Refiner Stage 3(`formatMasterSynthesisPrompt`) 프롬프트는 앵커 스티칭의 최하단 어텐션 직결을 달성하는 과정에서, 소설 본문을 상단의 `[Preceding Story Context]`와 최하단의 `[Current Story Text]`(말단 150자 조각)로 인위적으로 양분하였음.
  - 이로 인해 `<RAW_DRAFT>`(초안)가 본문 말단보다 앞서 등장하여, 인과적 서사 흐름(`원고 본문` -> `초안` -> `감사 보고서` -> `최종 탈고`)이 왜곡되고, 최하단 150자 조각에 `Current Story Text`라는 명칭이 붙어 인지적 혼선이 발생함.
- **해결 원칙 (확정된 방안 A)**:
  - `contextWindow` 상한이 보장된 온전한 소설 본문 전체(`variables.STORY_CONTEXT`)를 `<RAW_DRAFT>` 앞으로 전진 배치하여 단일 `## [Current Story Text]` 블록으로 통일.
  - Stage 2 감사관 프롬프트(`formatAuditorPrompt` & `buildStandardNarrativeContext`)와 서사 맥락 배치 순서를 100% SSOT 수준으로 일원화.
  - 최하단 Recency Zone에는 중복 본문 조각을 제거하고 `## [Final Directing]`과 `### [Immediate Stitching Anchor]`(`<anchor>`)만을 직결 배치하여 어텐션 안정성 유지.

---

## 2. 세부 실행 계획
1. `src/lib/contextProviders.ts`의 `formatMasterSynthesisPrompt` 수정:
   - 상단 `upperSections`에서 `[Preceding Story Context]`를 제거하고 `## [Current Story Text]\n${currentStoryText}`를 단일 전진 배치.
   - 하단 `executionZoneSections`에서 중복 본문 조각(`## [Current Story Text]\n${tailProse}`) 제거.
   - 최하단에는 탈고 지침 및 `formatAnchorBlock` 앵커만 유지.
2. 문서화 및 감사 로그:
   - `docs/SYSTEM_SPECIFICATION.md`, `src/lib/AGENTS.md`, `src/services/AGENTS.md`, `AGENTS.md`, `AUDIT_LOG.md` 갱신.
3. 검증:
   - `lint_applet` (`tsc --noEmit`) 및 `compile_applet` 무오류 빌드 검증.
