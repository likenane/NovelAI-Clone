# Gemini API Prefill Deprecation 대응 분석 보고서

## 1. 목적 및 배경 (Purpose & Background)
현재 AI Novelist Studio 애플리케이션의 핵심 생성 기능들(소설 이어쓰기, 로어 생성, 자동 코덱스 등)은 Gemini API의 **Prefill(사전 채움) 기능**에 강하게 의존하고 있습니다. 
Prefill 방식이란 API 호출 시 메시지 배열의 가장 마지막 역할을 `role: "model"`로 지정하여, AI가 특정 문자열을 이미 출력한 것으로 간주하고 그 직후부터 텍스트를 이어서 작성하도록 강제하는 기법입니다.

하지만 최근 업데이트된 Gemini 3.7 Flash 및 3.8 등의 최신 모델에서는 **마지막 메시지가 `model` 역할인 것을 더이상 허용하지 않으며 (400 Bad Request 에러 발생)**, 해당 API 스펙이 사실상 Deprecate 되었습니다.
본 보고서는 기존의 출력 품질과 작동 방식을 완벽히 유지하면서, Prefill 기능에 의존하지 않는 구조로 마이그레이션하기 위해 현재 시스템의 작동 메커니즘을 해부하고 구체적인 대책을 분석합니다.

---

## 2. 현재 AI 생성 기능의 메커니즘 심층 분석

### 2.1 어떤 파일과 코드에 기반하여 작동하는가?
현재 Prefill 데이터 흐름은 **[데이터 준비] -> [템플릿 조립] -> [API 호출] -> [후처리]** 의 4단계 파이프라인으로 엄격하게 구성되어 있습니다.

**① 데이터 준비 계층 (`src/lib/contextProviders.ts`)**
- `buildTotalVariableDictionary()` 및 `processNovelContext()` 함수에서 에디터 내용의 끝부분 일정 길이(`continuationLength`, 기본 150자)를 잘라내어 **`prefillSuffix`**로 만듭니다.
- 이후 사용자가 설정한 기본 프롬프트(예: "Continue the story:")와 결합하여 `{{PREFILL_BLOCK_NOVEL}}` 같은 마크다운 변수를 생성합니다.

**② 템플릿 조립 계층 (`src/contexts/*.md` & `src/services/contextBuilder.ts`)**
- 템플릿 파일들(`novel-generation.md`, `autocodex-generation.md` 등)은 내부적으로 `<System>`, `<User>`, `<Prefill>` 세 개의 XML 태그 블록으로 구조화되어 있습니다.
- `contextBuilder.ts`의 `buildAIContext()` 함수가 정규식을 통해 이 3개의 블록을 파싱하여, `{ system, history, prefill }` 형태의 `AIContextPayload` 객체로 분리하여 반환합니다.

**③ API 호출 계층 (`src/services/aiService.ts` - 핵심 병목점)**
- `generateGeminiContent()` 함수 내부에서 다음 코드가 실행됩니다.
  ```typescript
  if (params.prefill) {
    contents.push({ role: "model", parts: [{ text: params.prefill }] });
  }
  ```
- **문제의 원인**: 바로 이 코드가 최신 Gemini API 모델에서 금지된 조작입니다. OpenRouter 역시 `role: "assistant"`로 이를 흉내내고 있습니다.

**④ 후처리 및 에디터 삽입 계층 (`src/hooks/useAIEngine.ts` 및 `useAutoCodex.ts`)**
- `aiService`는 AI가 Prefill '이후'부터 작성한 순수 텍스트만을 반환합니다.
- 프론트엔드의 `handleContinue` 함수는 기존 텍스트(Prefill Suffix)가 이미 에디터에 존재하므로, 반환된 AI 텍스트 앞의 줄바꿈 정도만 정리한 뒤 **Tiptap 에디터의 맨 끝(`docSize`)에 그대로 이어 붙입니다.**
- 자동 코덱스(`useAutoCodex.ts`)의 경우 JSON 포맷 강제를 위해 넣었던 `{\n  "globalAnalysis": ` 문자열을 AI 응답 앞에 수동으로 다시 붙여 파싱합니다 (`prefillStr + normalizedContent`).

### 2.2 각 생성 기능별 Prefill의 목적
| 태스크 | 목적 | 의존도 |
|---|---|---|
| **소설 생성 (Novel)** | 끊김 없는 문맥 잇기. AI가 문장 중간에서 완벽한 톤앤매너로 이어쓰도록 유도. | **매우 높음** (제거 시 앞문장 반복 현상 발생 위험) |
| **코덱스 (Codex)** | 사용자의 지시사항이나 특정 포맷(예: 마크다운 헤더 등)으로 시작하도록 강제. | 보통 |
| **자동 코덱스 (Auto Codex)** | JSON 파싱 오류를 원천 차단하기 위해 응답의 첫 줄을 `{` 로 강제 시작. | **매우 높음** (JSON 파싱 에러 방어벽) |
| **정합성 검증 (Refiner)** | JSON 응답 강제 시작 및 `<critique>` 태그 시작 강제. | 높음 |

---

## 3. 핵심 대책: 동적 역할 분할을 통한 인컨텍스트 러닝 (Dynamic Synthetic Multi-turn History)

Prefill 기능을 단순히 제거하거나 System 프롬프트로 억제하는 1차원적 접근은 LLM의 할루시네이션(반복, 인사말 등)을 완전히 막을 수 없습니다. 따라서 **"사용자가 의도한 규칙(중간에 끊긴 문장부터 인사말 없이 바로 이어쓰기)을 AI가 이미 완벽하게 수행해 온 것처럼"** 과거의 소설 본문을 역산하여 가짜 대화 기록(Synthetic Multi-turn History)으로 조작해 API에 주입하는 고도화된 방식을 채택합니다.

### 3.1 쪼개기 알고리즘의 핵심 원리 (The Chunking Logic)

**① 문장 중간 끊기 (Mid-Sentence Break) 모방 전략**
소설 이어쓰기의 본질은 "문장이나 단어가 완성되지 않은 지점에서 AI의 창의성으로 그 뒤를 잇는 것"입니다. 따라서 과거의 대화 기록(예시) 또한 정확히 이 패턴을 띠어야 합니다.
- 단순히 단락 단위로 User와 Model을 나누지 않습니다.
- 과거 본문을 파싱할 때, 특정 문장의 중간(예: 쉼표 뒤, 또는 조사 뒤)을 인위적으로 절단합니다.
- 절단된 앞부분은 `[User]` 턴의 마지막으로 할당하고, 절단된 뒷부분부터 그 다음 단락들까지를 `[Model]` 턴으로 할당합니다.
- **효과**: AI는 "아, User가 문장을 중간에 끊어서 주면, 나는 인사말 없이 그 잘린 단어 직후부터 문장을 자연스럽게 완성해야 하는구나"라는 패턴(Show, Don't Tell)을 프롬프트 없이도 완벽하게 체화하게 됩니다.

**② 출력 길이 동기화 (Output Length Anchoring)**
AI는 과거 대화(Model 턴)의 응답 길이를 무의식적으로 모방하려는 성질이 있습니다.
- 과거 기록을 `[Model]` 턴으로 할당할 때, 그 길이를 사용자가 설정한 `Max Tokens`나 예상 출력 길이(예: 300~500자)와 비슷하게 맞춥니다.
- **효과**: AI가 너무 짧게 대답하고 멈추거나, 지나치게 길게 폭주하는 현상을 구조적으로 안정화시킵니다.

**③ Fallback 전략 (짧은 본문 대응)**
만약 이제 막 쓰기 시작한 소설이라 본문 길이가 위 패턴을 만들 만큼 충분히 길지 않다면(예: 500자 미만), 시스템 내부에 하드코딩된 **"고품질 범용 모범 답안(Generic Synthetic History)"**을 첫 턴에 몰래 끼워 넣습니다. (예: User가 문장을 툭 끊고 -> Model이 깔끔하게 이어쓴 더미 데이터)

---

## 4. 구체적이고 세부적인 실현 계획 (Granular Action Plan)

이 아키텍처를 실현하기 위해서는 시스템 전반에 걸친 정교한 리팩토링이 필요합니다.

### Phase 1: Context Provider 개편 (`src/lib/contextProviders.ts`)
단순히 문자열 하나로 `STORY_CONTEXT`를 반환하던 구조를, `Message[]` 형태의 배열 구조로 변환하는 청킹(Chunking) 로직을 개발해야 합니다.

1. **`buildSyntheticHistory(rawText, directive, targetLength)` 함수 신설**:
   - **Step 1 (최종 턴 추출)**: 텍스트의 가장 마지막 부분(`continuationLength`)을 잘라냅니다. 이 부분은 마지막 `[User]` 턴의 텍스트가 되며, 여기에 `User Directive({})`가 결합됩니다.
   - **Step 2 (과거 턴 역추적 및 절단)**: 남은 텍스트를 뒤에서부터 탐색합니다. `targetLength`(예: 400자)만큼 거슬러 올라간 후, 가장 가까운 공백이나 쉼표(`,`)를 찾습니다. 마침표(`.`)가 아닌 곳에서 절단해야 완벽한 "Mid-Sentence Break" 예시가 만들어집니다.
   - **Step 3 (배열 조립)**: 절단된 텍스트의 앞부분을 과거의 `[User]`, 뒷부분을 과거의 `[Model]` 턴으로 객체화하여 배열에 담습니다. 텍스트가 충분히 길다면 이 작업을 2회 정도 반복하여 4-turn 대화로 만듭니다.
   - **Step 4 (반환)**: `[{ role: 'user', content: '...' }, { role: 'model', content: '...' }, { role: 'user', content: '...' }]` 형태의 배열을 반환합니다.

### Phase 2: AI Service 및 템플릿 인터페이스 변경 (`src/services/aiService.ts` & `contextBuilder.ts`)
1. **타입 변경**: `GenerationParams`의 `history`와 `prefill` 필드를 삭제하고, `messages: Array<{role: string, content: string}>` 필드로 대체합니다.
2. **템플릿 파싱 로직 (`contextBuilder.ts`) 변경**: 
   - 기존에는 `<User>`, `<Prefill>` 태그를 파싱했지만, 이제는 Phase 1에서 생성된 Message 배열을 직접 받아 API Payload 규격에 맞게 변환하는 역할을 수행하도록 수정합니다.
3. **JSON 모드 강제화 (Auto Codex & Refiner)**:
   - 코덱스나 정합성 검증 등 포맷 강제가 필요한 태스크는 위와 같은 가짜 대화 주입 방식보다는, `aiService.ts` 호출 시 파라미터로 `responseFormat: { type: "json_object" }` (OpenRouter/Gemini 최신 스펙)를 전달하도록 수정하여 파싱 에러를 원천 차단합니다.

### Phase 3: 프론트엔드 최후의 방어망 구축 (`src/hooks/useAIEngine.ts`)
가짜 대화 기록 주입으로 할루시네이션 확률을 99% 억제하더라도, 확률적 모델의 1% 예외를 막기 위한 클라이언트 사이드 보완책이 반드시 동반되어야 합니다.

1. **`removeOverlap(suffix, aiResponse)` 유틸리티 함수 구현**:
   - 에디터에 삽입 직전, 기존 에디터의 마지막 50자(Suffix)와 AI 응답 텍스트의 처음 50자를 교차 검증합니다.
   - LCS(Longest Common Substring) 또는 단순 `indexOf`/`startsWith`를 융합한 정규식으로 겹치는 구간을 찾아냅니다.
   - 만약 AI가 실수로 인사말을 하거나 기존 Suffix를 앵무새처럼 반복했다면, 겹치는 부분까지를 통째로 잘라내고(Slice) 순수한 신규 텍스트만 리턴합니다.
2. **무봉제선 삽입 (Seamless Insertion)**:
   - 오버랩이 제거된 텍스트를 Tiptap 에디터의 `docSize` 위치에 `insertContentAt`으로 삽입합니다. 유저는 API가 내부적으로 어떤 실수를 했는지 전혀 눈치채지 못합니다.

### 5. 결론
이 대책은 최신 Gemini API의 제약(Prefill 금지)을 우회하기 위한 수동적 대응을 넘어, **In-Context Learning의 원리를 극대화하여 소설 생성 품질 자체를 한 차원 높이는 능동적인 아키텍처 업그레이드**입니다. 과거 본문을 창의적 청킹 알고리즘으로 분해하여 가짜 대화를 조작하는 이 방식은 향후 어떠한 텍스트 생성 모델이 도입되더라도 일관된 퍼포먼스를 보장할 것입니다.
