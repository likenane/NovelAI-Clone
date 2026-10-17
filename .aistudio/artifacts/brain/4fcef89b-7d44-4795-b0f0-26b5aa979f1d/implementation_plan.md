# Implementation Plan - Update AI Studio Default Settings

Update the default AI engine configurations in `src/constants.ts` and ensure clean migration/fallback handling in `src/lib/novelIO.ts`.

## Proposed Changes

### 1. `src/constants.ts`
Modify `GLOBAL_DEFAULTS` to set the new default settings requested by the user:

- **본문 생성 (Novel Generation)**:
  - 참조 길이 (`contextWindow`): `30000` (unchanged)
  - 모델 (`modelName`): `'gemini-3.8-flash'` (unchanged)
  - 추론 (`thinkingLevel`): `'LOW'` (updated from 'MEDIUM')
  - Max output (`maxTokens`): `800` (unchanged)

- **MARS (탈고 감사 / auditor & automation)**:
  - 기본 (`automation.enableStrictConsistency`): `false` (updated from true - Off by default)
  - 모델 (`auditor.modelName`): `'gemini-3.7-flash'` (updated from 'gemini-3.8-flash')
  - 추론 (`auditor.thinkingLevel`): `'HIGH'` (updated from 'MEDIUM')
  - Max output (`auditor.maxTokens`): `16000` (updated from 8000)

- **플롯 (Plot)**:
  - 모델 (`plot.modelName`): `'gemini-3.1-pro-preview'` (updated from 'gemini-3.7-flash')
  - 추론 (`plot.thinkingLevel`): `'HIGH'` (unchanged)

- **스토리 (Story Memory)**:
  - 모델 (`memory.modelName`): `'gemini-3.1-pro-preview'` (updated from 'gemini-3.7-flash')
  - 추론 (`memory.thinkingLevel`): `'LOW'` (updated from 'HIGH')

- **코덱스 (Codex)**:
  - 모델 (`codex.modelName`): `'gemini-3.1-pro-preview'` (updated from 'gemini-3.8-flash')
  - 추론 (`codex.thinkingLevel`): `'LOW'` (unchanged)

- **오토 코덱스 (Auto Codex)**:
  - 모델 (`autoCodex.modelName`): `'gemini-3.1-pro-preview'` (updated from 'gemini-3.7-flash')
  - 추론 (`autoCodex.thinkingLevel`): `'HIGH'` (unchanged)

## Verification Plan
- Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
- Run `compile_applet` to verify successful build.
- Inspect `GLOBAL_DEFAULTS` to ensure all requested default values match precisely.
