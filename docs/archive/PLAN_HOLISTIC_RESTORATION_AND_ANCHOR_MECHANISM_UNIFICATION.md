# [MASTER BLUEPRINT] Refiner 전면 종합 탈고 패러다임 전환 및 소설 본문 생성 앵커(Anchor) 기계적 메커니즘 일원화

---

## 1. 철학적 배경 및 근본 원인 분석 (Root Cause & Philosophy)

### 1.1 어텐션 앵커링(Attention Anchoring)과 부분 땜질(Partial Patching)의 덫
- **문제 진단**:
  - 현재 4대 감사관(`critique_plot_system.md`, `critique_physical_system.md`, `critique_lore_epistemic_system.md`, `critique_stylistic_system.md`)은 핵심 쟁점을 도출하는 단계까지는 우수하게 동작함.
  - 그러나 제3섹션 하단의 고정 규약인 `[수석 문학 복원가를 위한 ... 가이드]`에서 **`보강 대상 구절: (반드시 <RAW_DRAFT> 내부에서 발췌한 보완 대상 문장)`**과 **`복원 처방: (구체적 대체 문장 작성)`**을 강제하고 있음.
- **근본 원인**:
  - LLM의 자기회귀적 어텐션(Autoregressive Attention) 메커니즘 특성상, 프롬프트에 특정 원문 구절이 인용되면 모델의 인지 자원은 **"해당 텍스트 좌표를 찾아내어 교체하는 치환(Find-and-Replace) 모드"**로 강하게 고착됨.
  - 이로 인해 최종 탈고 모델(Stage 3)은 전체 문체와 텐션을 가다듬지 못하고, 감사관들이 짚어준 몇 개 구절 주위만 어색하게 덧칠한 뒤 나머지는 원문 그대로 베끼는 **"특정 부위만 건드리고 마는 부분 땜질"**로 전락함.

### 1.2 4대 감사관의 미세 대필(Micro-Copywriting)로 인한 토큰 낭비 및 충돌
- **문제 진단**:
  - 4명의 감사관이 각자 독립적으로 본문 구절을 길게 인용하고 대체 문장 예시를 작성함.
- **부작용**:
  - **심각한 토큰 낭비**: 4개 에이전트가 각자 수백 토큰씩 발췌문과 대필문을 생성하여 감사 단계의 토큰 비용과 레이턴시가 무의미하게 급증함.
  - **대필 조각 간의 파편화 및 상충**: 플롯 감사관의 대사 처방, 문체 감사관의 윤문 처방, 물리 감사관의 동선 처방이 서로의 맥락을 모른 채 단편적으로 제시되어 최종 모델에 인지 과부하를 유발함.

### 1.3 최종 탈고 모델(Stage 3)의 자율적 총괄 감독권 박탈
- **문제 진단**:
  - 최종 탈고 모델의 본질은 "4대 전문 참모의 진단 브리핑을 흡수하여 글 전체를 원작자의 호흡으로 다시 빚어내는 총괄 소설가(Master Author)"여야 함.
  - 그러나 감사관들이 구체적인 수정 구절과 문장을 지정해 줌으로써, 최종 AI는 **"총괄 소설가"가 아니라 "피드백 체크리스트를 수행하는 말단 교정원"**처럼 행동하게 됨.

### 1.4 프롬프트 수식어(Prompt Pleading)의 허상과 앵커(Anchor) 안정성 위협
- **문제 진단**:
  - 글 전체를 종합적으로 가다듬게 할 때 가장 취약해지는 지점은 바로 소설 이어쓰기의 생명선인 **앵커(Anchor)**임.
  - "우주가 무너져도 앵커를 바꾸지 마라" 식의 텍스트 강조는 순전히 **AI의 지능과 자비에 호소하는 방식(Prompt Pleading)**에 불과하며, 모델이 창작 흐름을 타거나 온도가 바뀌면 첫 문장을 임의로 윤문하여 에디터 본문을 중복·훼손시키는 참사가 언제든 발생할 수 있음.
- **Stage 3의 구조적 배치 결함 발견**:
  - 현재 Stage 1(소설 본문 생성)은 **`## [Current Story Text]`(직전 본문 tail) 바로 뒤에 `### [Immediate Stitching Anchor]`를 붙여 모델의 첫 토큰 생성 지점에 직결(Recency Zone)**시킴으로써 완벽한 안정성을 달성하고 있음.
  - 반면, 현재 Stage 3는 `Current Story Text`가 프롬프트 최상단에 멀리 방치되어 있고, 그 뒤를 수천 글자의 `<RAW_DRAFT>`와 4대 보고서가 장벽처럼 가로막고 있으며, 최하단에는 앵커 블록만 덜렁 고립되어 있음.
  - 즉, 모델이 출력을 시작하려는 순간에는 **앞선 본문의 실제 물리적 호흡이 어텐션에서 소실된 상태**였기 때문에 앵커가 위태로웠던 것임.

---

## 2. 4대 핵심 차원 심층 자가 비판 (Deep Self-Critique)

### ① 구현 세밀도 (Feasibility & Granularity) - "로직이 충분히 구체적인가?"
- **비판**: 단순히 `Current Story Text`를 아래로 내린다고 했을 때, 본문이 수천 자에 달하면 전체 본문을 아래로 내릴 것인지, 아니면 Stage 1처럼 선행 본문(`STORY_CONTEXT_NOVEL`)과 말단 테일(`ANCHOR_TAIL_TEXT`)을 분리 배치할 것인지 명확해야 함.
- **해결 방안**:
  - Stage 1(`buildSyntheticHistoryMessages`)의 입증된 2분할 구조를 정확히 계승함.
  - 상단 배경 구역: `STORY_CONTEXT_NOVEL`(선행 본문 맥락)을 배치하여 앞선 사건의 인과를 온전히 인지하도록 함.
  - 최하단 Recency Zone: `## [Current Story Text]`에 `ANCHOR_TAIL_TEXT`(직전 본문의 마지막 150~300자)를 배치하고, 그 바로 아래에 `### [Immediate Stitching Anchor]`(`<anchor>` 태그)를 직결함.
  - 이를 통해 모델이 출력을 시작하는 첫 순간에 직전 본문의 물리적 호흡과 앵커가 0의 거리로 맞물리게 됨.

### ② 모듈화 및 파편화 방지 (Modularity & Anti-Fragmentation) - "지옥 같은 유지보수를 유발하지 않는가?"
- **비판**: Stage 1과 Stage 3가 서로 다른 앵커 문자열 생성 함수나 절단 로직을 갖게 되면, 한쪽을 수정했을 때 다른 쪽에서 앵커 중복/누락 버그가 재발할 위험이 있음.
- **해결 방안**:
  - `src/lib/contextProviders.ts`의 `formatAnchorBlock`을 100% SSOT 단일 함수로 공유.
  - `src/lib/utils.ts`의 `stitchAndTrimAnchor`를 사후 기계적 절단 단일 함수로 공유.
  - 프롬프트 조립 역시 `buildStandardNarrativeContext`와 `formatMasterSynthesisPrompt`에서 동일한 앵커 규약을 준수하도록 일원화.

### ③ 안정성 (Stability) - "데이터 오염이나 엣지 케이스는 없는가?"
- **비판**: 소설이 막 시작되어 본문 길이가 `continuationLength`보다 짧은 극초반부이거나, 사용자가 지시어만 입력한 상태에서 에러가 발생하지 않는가?
- **해결 방안**:
  - `ANCHOR_TAIL_TEXT`가 비어있는 극초반부(신규 소설 시작)의 경우 `formatAnchorBlock`이 빈 문자열을 반환하며, 앵커 강제 없이 자연스러운 시작을 지원.
  - `refinerService.ts`의 결과물 길이 안전 가드(`trimmedRefined.length < scopedDraft.length * 0.4`)를 유지하여, 탈고 모델이 비정상적으로 짧게 출력할 경우 안전하게 `scopedDraft`로 폴백.

### ④ 확장성 (Scalability) - "미래의 변화를 수용할 수 있는가?"
- **비판**: 추후 5번째 감사관이 추가되거나, 감사관 모델이 교체되더라도 구조가 유연하게 유지되는가?
- **해결 방안**:
  - 4대 감사관의 출력 프로토콜을 통일된 동적 쟁점 구조(`[영역별 전반 진단]`, `[핵심 쟁점 1, 2: 원인 분석 및 서사적 지향점]`)로 표준화하여, 새로운 감사관이 추가되어도 동일한 규약으로 Stage 3에 주입 가능하도록 설계.

---

## 3. 핵심 아키텍처 및 데이터 플로우 (Master Architecture)

```
========================================================================================
[Stage 1: Primary Model] 
- 에디터 본문 tail에서 anchor 추출 -> Verbatim Anchor Repeat 이어쓰기 초안 생성
- stitchAndTrimAnchor로 Stage 1 앵커 1차 트림 완료 -> scopedDraft 생성
========================================================================================
                                     ↓ (scopedDraft 전달)
========================================================================================
[Stage 2: 4 Auditor Models (Promise.allSettled 병렬 실행)]
- 입력: 표준 서사 배경 (앵커 배제) + <RAW_DRAFT>
- 임무: 구절 인용 및 미세 대필 100% 배제!
- 출력 포맷:
  [영역별 전반 진단: <영역명>] (전반적 호흡과 완성도 요약)
  [핵심 쟁점 1: <AI 자율 명명 쟁점>] (결함 원인 분석 + 서사적 지향 원칙 제시)
  [핵심 쟁점 2: <AI 자율 명명 쟁점>] (추가 결함 원인 분석 + 서사적 지향 원칙 제시)
  * 토큰 30~50% 절감, 에이전트 간 문장 충돌 원천 방지
========================================================================================
                                     ↓ (4대 종합 진단 브리핑 주입)
========================================================================================
[Stage 3: Master Literary Restorer (Primary Model)]
- 물리적 프롬프트 구조 (Recency-Biased Architecture):
  1) 상단 배경 브리핑:
     - [The Codex] -> [Novel Style & Directing Guide] -> [Plot Blueprint] -> [Story Memory]
     - ## [Preceding Story Context] (선행 본문 맥락: STORY_CONTEXT_NOVEL)
     - ## [User Directive]
  2) 중단 미완성 초안 및 진단 브리핑:
     - <RAW_DRAFT> (초안)
     - ## [Specialist Restoration Reports] (4대 전문 감사관 종합 진단 보고서)
  3) 최하단 실행 구역 (Recency Zone - 생성 직전 지점, Stage 1과 100% 동일):
     - ## [Current Story Text] (직전 본문 tail: ANCHOR_TAIL_TEXT)
     - ### [Immediate Stitching Anchor] (<anchor> 태그)
     - 종합 탈고 헌법: 특정 구절 땜질 금지, 4대 통찰을 흡수하여 글 전체를 유려하게 재집필
========================================================================================
                                     ↓ (최종 탈고 텍스트)
========================================================================================
[사후 처리 엔진: stitchAndTrimAnchor]
- Stage 3 텍스트에서 <anchor> 겹침 결정론적 트림
- 0.1초의 단절이나 중복 없이 에디터에 안전하게 결합!
========================================================================================
```

---

## 4. 세부 파일별 코드 실행 로직 (Detailed Implementation Steps)

### 4.1 감사관 시스템 프롬프트 개편 (미세 대필 제거 및 방향성 정제)

#### 1) `src/prompts/auditor_scope_protocol.md`
- **변경 내용**:
  - 감사관의 역할을 "미세 교정 대필"에서 **"심층 원인 진단 및 서사적 지향점 제시(Deep Diagnosis & Directional Principles)"**로 재정의.
  - 본문 구절의 기계적 발췌 인용(`보강 대상 구절`) 및 대체 문장 작성(`대안/복원 처방`)을 명시적으로 금지.
  - 직전 본문 및 앵커 영역에 대한 침범 금지 원칙 강화.

#### 2) `src/prompts/critique_plot_system.md`
- **변경 내용**:
  - 섹션 3 `[수석 문학 복원가를 위한 서사 정합성 복원 가이드]`(구절 인용 및 대체 문장 작성) 완전 삭제.
  - `[핵심 쟁점 1, 2]` 구조로 단일화:
    - `- 인과 및 연출 결함 원인: (어떤 극적 신호 손실이나 개연성 훼손이 발생했는가)`
    - `- 서사적 지향 원칙: (갈등의 심화, 복선, 씬의 스케일을 회복하기 위해 어떤 방향성으로 나아가야 하는가)`

#### 3) `src/prompts/critique_physical_system.md`
- **변경 내용**:
  - `[수석 문학 복원가를 위한 물리 인과 복원 가이드]`(구절 인용 및 대체 문장 작성) 완전 삭제.
  - `[핵심 쟁점 1, 2]` 구조로 단일화:
    - `- 공간 및 물리 모순 원인: (어떤 3차원 좌표 왜곡, 3개 손 오류, 동선 단절이 발생했는가)`
    - `- 물리적 연속성 지향 원칙: (동선의 현실감과 무게감을 복원하기 위해 어떤 공간 원칙을 지켜야 하는가)`

#### 4) `src/prompts/critique_lore_epistemic_system.md`
- **변경 내용**:
  - `[수석 문학 복원가를 위한 인지 징검다리 묘사 복원 가이드]`(구절 인용 및 대체 문장 작성) 완전 삭제.
  - `[핵심 쟁점 1, 2]` 구조로 단일화:
    - `- 설정 및 지식경계 붕괴 원인: (어떤 독심술, 미해금 정보 유출, 코덱스 모순이 발생했는가)`
    - `- 인지적 징검다리 지향 원칙: (관찰 단서와 추론 징검다리를 자연스럽게 확보하기 위한 지향점)`

#### 5) `src/prompts/critique_stylistic_system.md`
- **변경 내용**:
  - `[수석 문학 복원가를 위한 한국어 고유 어감 윤문 가이드]`(구절 인용 및 대체 문장 작성) 완전 삭제.
  - `[핵심 쟁점 1, 2]` 구조로 단일화:
    - `- 문체 노이즈 및 번역투 원인: (어떤 외래 번역투, 어미 단조로움, 기계적 수식어가 호흡을 방해하는가)`
    - `- 한국어 미학 지향 원칙: (우리말의 리듬감과 서정성을 살리기 위한 문체적 지향점)`

---

### 4.2 Stage 3 탈고 시스템 프롬프트 개편 (전면 종합 탈고)

#### 1) `src/prompts/critique_synthesis_system.md`
- **변경 내용**:
  - **제2조 [Masterful Holistic Literary Restoration] 전면 개정**:
    - **부분 땜질(Partial Patching / Find-and-Replace) 엄격 금지**: 특정 문장만 찾아 바꾸고 나머지를 베끼는 행위를 원천 금지.
    - 4대 전문 보고서를 '종합 진단 브리핑(Diagnostic Dossier)'으로 완전히 내재화한 뒤, 초안의 서사적 뼈대를 바탕으로 **처음부터 끝까지 글 전체를 하나의 막힘없는 호흡과 일관된 문체로 다시 가다듬어(Holistic Overhaul & Resynthesis) 렌더링**하도록 명령.
  - **제1조 [Seamless Continuity via Anchor Stitching] 강화**:
    - 최하단 Recency Zone의 `<anchor>` 태그를 반드시 1글자의 오차도 없이 반복 출력한 뒤, 직전 본문 말단의 마지막 호흡에서 0.1초의 단절도 없이 매끄럽게 이어 쓰도록 규정.

#### 2) `src/contexts/consistency_critique_context.md`
- **변경 내용**:
  - 수석 문학 복원가의 총괄 감독권 및 종합 탈고 헌법 선언 동기화.

---

### 4.3 프롬프트 어텐션 구조 및 앵커 메커니즘 일원화 (핵심 엔지니어링)

#### 1) `src/lib/contextProviders.ts` (`formatMasterSynthesisPrompt`)
- **변경 내용**:
  - 물리적 프롬프트 조립 순서를 Stage 1과 완전히 대칭되도록 재배치:
    ```typescript
    export function formatMasterSynthesisPrompt(
      variables: Record<string, string>,
      rawDraft: string,
      auditReports?: {
        plotReport?: string;
        physicalReport?: string;
        loreReport?: string;
        stylisticReport?: string;
      }
    ): string {
      // 1. 상단 배경 컨텍스트 (선행 본문이 있는 경우 STORY_CONTEXT_NOVEL 주입)
      const narrativeSections: string[] = [];
      if (variables.ACTIVE_LORE_BLOCK?.trim()) narrativeSections.push(variables.ACTIVE_LORE_BLOCK.trim());
      if (variables.STYLE_DIRECTIVES_BLOCK?.trim()) narrativeSections.push(variables.STYLE_DIRECTIVES_BLOCK.trim());
      if (variables.PLOT_BLUEPRINT?.trim()) narrativeSections.push(variables.PLOT_BLUEPRINT.trim());
      if (variables.STORY_MEMORY_BLOCK?.trim()) narrativeSections.push(variables.STORY_MEMORY_BLOCK.trim());
      if (variables.STORY_CONTEXT_NOVEL?.trim()) {
        narrativeSections.push(`## [Preceding Story Context]\n${variables.STORY_CONTEXT_NOVEL.trim()}`);
      }
      if (variables.USER_DIRECTIVE_BLOCK?.trim()) narrativeSections.push(variables.USER_DIRECTIVE_BLOCK.trim());

      // 2. 중단 참고 자료 브리핑 (초안 + 4대 전문 감사 보고서)
      const briefingSections = [
        `<RAW_DRAFT>\n${rawDraft.trim()}\n</RAW_DRAFT>`,
        `================================================================================\n` +
        `## [Specialist Restoration Reports]\n` +
        `아래는 초안(<RAW_DRAFT>)에 대한 4대 전문 분석관의 독립 심층 진단 보고서입니다.\n` +
        `================================================================================`,
        `### 1. 서사 역동 및 인과 정합 진단 보고서\n${plotRep}`,
        `### 2. 시공간 물리 연속성 진단 보고서\n${physicalRep}`,
        `### 3. 로어 수호 및 인지 경계 진단 보고서\n${loreRep}`,
        `### 4. 한국어 문체 및 미학 진단 보고서\n${stylisticRep}`
      ];

      // 3. 최하단 실행 구역 (Recency Zone - 생성 직전 지점, Stage 1과 100% 동일 구조)
      const executionZoneSections: string[] = [];
      const tailProse = variables.ANCHOR_TAIL_TEXT?.trim() || variables.STORY_CONTEXT?.trim() || "";
      if (tailProse) {
        executionZoneSections.push(`## [Current Story Text]\n${tailProse}`);
      }

      const anchorBlock = formatAnchorBlock(variables.ANCHOR_TAIL_TEXT);
      if (anchorBlock) {
        executionZoneSections.push(anchorBlock);
      }

      executionZoneSections.push(
        `## [Final Directing for Master Literary Restorer]\n` +
        `위 4대 전문 진단 보고서의 통찰을 총체적으로 수렴하여, 미완성 초안(<RAW_DRAFT>)의 뼈대를 바탕으로 직전 본문([Current Story Text])의 마지막 호흡에서 0.1초의 단절도 없이 이어지는 완전한 완성본 소설 본문으로 종합 탈고(Holistic Literary Restoration)하십시오.\n` +
        `특정 구절만 기계적으로 땜질하는 행위를 엄격히 금지하며, 글 전체의 리듬과 긴장감을 일관된 거장의 문체로 처음부터 끝까지 완전하게 다시 빚어내십시오.\n\n` +
        `[CRITICAL: 어떤 분석 설명, 서두 인사, 마크다운 코드블록(\`\`\`) 없이, 독자가 읽을 최종 복원 완성본 소설 본문 텍스트만을 온전히 출력하십시오.]`
      );

      return [...narrativeSections, ...briefingSections, ...executionZoneSections].join('\n\n');
    }
    ```

#### 2) `src/services/refinerService.ts`
- **변경 내용**:
  - `runConsistencyPipeline` 내 Stage 3 호출 전후 데이터 정합성 검증.
  - `stitchAndTrimAnchor`를 통한 기계적 트림 유지 및 정밀 슬라이싱(`sliceProseByTokens(trimmedRefined, targetTokens)`) 확인.

---

## 5. 검증 체크리스트 (Verification Checklist)

1. **정적 빌드 및 타입 검사**:
   - `npm run lint` (`tsc --noEmit`) 무오류 통과.
   - `compile_applet` 빌드 성공.
2. **감사관 출력 포맷 검증**:
   - 4대 감사관 보고서에서 `보강 대상 구절:` 및 `복원 처방:` 등의 불필요한 구절 인용과 미세 대필이 완전히 사라졌는지 확인.
   - `[영역별 전반 진단]` 및 `[핵심 쟁점 1, 2]`만 압축 출력되어 토큰이 대폭 절감되는지 확인.
3. **Stage 3 종합 탈고 동작 검증**:
   - 프롬프트 최하단 Recency Zone에 `## [Current Story Text]`와 `### [Immediate Stitching Anchor]`가 나란히 배치되는지 확인.
   - 모델이 앵커를 100% 동일하게 읊으며 시작하고, 특정 부위 땜질이 아닌 글 전체를 매끄럽게 재탈고하는지 확인.
4. **앵커 결합 및 에디터 무결성 검증**:
   - `stitchAndTrimAnchor`가 정상 작동하여 에디터 본문 뒤에 글자 중복이나 단절 없이 정확히 이어 붙는지 확인.
