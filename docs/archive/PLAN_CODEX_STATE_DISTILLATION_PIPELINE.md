# [MASTER BLUEPRINT] 코덱스 상태 증류 파이프라인 (Codex State Distillation Pipeline)

---

## 1. 철학적 맥락 및 문제 분석 (Philosophical & Architectural Context)

### 1.1 현상의 본질 (The Core Phenomenon)
- **사건 팩트의 끝없는 누적 (Endless Narrative Fact Accumulation)**: 오토 코덱스 및 수동 코덱스 생성 시, 본문에서 발생한 중요한 사건을 선별하는 것까지는 정상 작동하나, 그 사건을 코덱스에 반영할 때 **"어떤 형태로 가공하여 어느 헤더에 넣을 것인가"**에 대한 변환 메커니즘이 부재함.
- 그 결과, 스토리 메모리(Story Memory)에 기록되어야 할 "과거 시제의 시공간 사건 줄거리(Chronicle/Narrative Facts)"가 문학적으로 윤문된 채 코덱스 헤더 아래에 그대로 덤핑되는 현상이 지속됨.

### 1.2 근본 원인 (Root Causes)
1. **네거티브 규약의 한계**: 기존의 '안티-타임라인 상태 전이 규약'은 "사건을 나열하지 말라"는 금지 조항 위주로 서술되어 있어, 모델이 "그럼 발생한 사건에서 무엇을 추출하고 어떻게 가공해야 하는가?"에 대한 실질적 변환 방법론을 모름.
2. **헤더의 사전 규정 불가 (헤더 탄력성과의 상충)**: 헤더가 고정되어 있지 않고 사용자가 자유롭게 커스텀(`[고유 결계]`, `[세력 내 서열]`, `[약점]` 등)하므로, 특정 헤더 목록을 하드코딩하는 방식은 사용 불가.
3. **'시공간 탈색(De-chronologization)' 메커니즘 부재**: 사건(Event)에 포함된 [시공간 정황] + [동작의 연속적 경과] + [영구적 성질/결과] 3요소 중, 앞의 두 요소를 제거하고 마지막 속성만을 추출하는 연산이 프롬프트/CoT에 명시되지 않음.

---

## 2. 폐기된 대안과 그 이유 (Discarded Alternatives & Rationales)

| 대안 | 핵심 접근법 | 폐기 사유 (Why Discarded) |
| :--- | :--- | :--- |
| **대안 A: 정적 헤더 목록 하드코딩** | 프롬프트에 `[성격]`, `[외형]`, `[인간관계]` 등의 헤더별 가공 목적을 정적으로 나열 | 사용자의 자유로운 헤더 개설(`[고유 결계]`, `[세력 내 서열]` 등)을 지원하는 **헤더 탄력성(Header Elasticity)** 원칙을 위배하며, 장르별 특수 메커니즘(무협, SF 등)에 대응 불가. |
| **대안 B: 무조건적 상태 증류 CoT 강제** | 모든 활성 로어 엔트리에 대해 사건 상태 증류 과정을 무조건 수행 | 사소한 언급이나 일상 대화에 대해서도 불필요한 증류 CoT를 강제하여 **토큰 낭비 및 지연 시간(Latency) 폭증**. 나아가 상태 변화가 없는데도 억지로 변화를 지어내는 **과잉 해석(Hallucination)** 유발. |
| **대안 C: 기존 4대 감사 관문 축소/대체** | 고관성 감사(`inertia...`)나 단순 언급 감사(`mereMention...`)를 증류 필드로 대체 | 기존의 엄격한 캐릭터 성격 보호(Anti-Character Drift) 및 단순 언급 차단이라는 1차 안전망이 약화되어 데이터 오염 위험 증가. |

---

## 3. 종국적 해결 뼈대 (Core Architectural Framework)

### 3.1 원칙 1: 헤더의 암묵적 질문 역추적 (Implicit Teleological Query Inference)
- 임의의 사용자 정의 헤더 `[X]`에 대해, 모델은 다음 암묵적 질문을 자동 역추적한다:
  > **"지금 이 순간, 이 대상의 [X]라는 영역은 어떤 '영구적 성질 / 상태 / 조건 / 규칙 / 구조 / 메커니즘'을 지니고 있는가?"**
- 사건을 헤더에 우겨넣는 것이 아니라, **"이 사건이 어떤 헤더의 암묵적 질문에 대한 직접적인 '답(Answer)'이 되는가?"**를 역산하여 헤더를 매칭한다.

### 3.2 원칙 2: 시공간 탈색 및 상태 증류 연산 (De-chronologization & State Distillation)
- 본문 사건 데이터를 3요소로 분해하여 연산한다:
  1. **정황 (When, Where, Context)**: 특정 씬의 시공간, 날씨, 우연적 상황 $\to$ **100% 완전 증발 (Discard)**
  2. **동작 경과 (Action Sequence)**: 누가 무엇을 하고 어떻게 부딪혔는가 $\to$ **100% 완전 증발 (스토리 메모리로 격리)**
  3. **영구적 속성 (Permanent Property / Mechanism)**: 그로 인해 대상에게 각인된 성질, 불변의 신조, 변모한 대인 스탠스, 물리/마법적 제약과 반동 $\to$ **유일한 코덱스 서술 대상 (Extract)**

### 3.3 원칙 3: 2단계 관문형(Gated) CoT 파이프라인 (Fast-Fail & Short-Circuit)
- **1구간 (기존 3대 엄격 감사 및 1차 판정)**: `inertia...`, `revealedFacts...`, `mereMentionAudit`을 통해 먼저 영구적 사실 진전인지 철저히 감사한 뒤 `verdict: "UPDATE" | "DROP"`을 결정.
- **2구간 (조건부 상태 증류)**:
  - **`DROP` 판정 시**: `stateDistillation` 필드를 `null`로 완전히 비워두고 불필요한 토큰/지연을 원천 차단 (Fast-Fail).
  - **`UPDATE` 판정 시에만**: `stateDistillation` 필드를 열어 사건의 정황/경과를 증발시키고 타겟 헤더의 암묵 질문에 답하는 `distilledProseBullet`을 도출.
- **3구간 (무손실 병합)**: 증류된 불릿을 기존 본문의 위치에 `In-place Overwrite`하는 계획 수립.

### 3.4 원칙 4: 단일 진실 공급원(SSOT) 기반의 이중 연동
- `src/prompts/codex_formatting_rules.md`를 단일 진실 공급원(SSOT)으로 삼아 서식과 가공 원칙을 중앙 집중화.
- 오토 코덱스(`auto-codex-system.md`)는 이를 CoT로 강제하고, 수동 코덱스(`codex_system.md`)는 이를 프롬프트 지침으로 바인딩.

---

## 4. 극도로 세부적인 코드 실행 로직 (Detailed Implementation Blueprint)

### 4.1 `src/prompts/codex_formatting_rules.md` 수정안

제4조 `안티-타임라인 상태 전이 규약`을 **"안티-타임라인 상태 전이 및 시공간 탈색 상태 증류 규약"**으로 전면 고도화:
1. **제4.1항: 헤더의 암묵적 질문(Implicit Query) 역추적 원칙**:
   - 임의의 헤더 `[X]`는 항상 "지금 이 대상의 [X]는 어떤 성질/규칙/스탠스를 지니고 있는가?"를 묻는 연출 렌즈임을 명시.
2. **제4.2항: 시공간 탈색 연산 (De-chronologization Operation)**:
   - 본문 사건을 ① 정황(When/Where), ② 동작 경과(Action Sequence), ③ 영구 속성(Property/Mechanism)으로 분해.
   - ①과 ②는 완전 증발시키고 ③만을 완성형 한국어 서술문으로 가공하는 공식 명시.
3. **제4.3항: 서술의 닻(Anchor) 및 In-place Overwrite 원칙 유지**:
   - 문장의 뼈대를 대상의 본질과 상태에 두고 최신 상태로 덮어쓰기.
4. **제4.4항: 전 장르 통합 Before vs After 서술 비교표 대폭 보강**:
   - 인물 관계/스탠스, 신체/외형 흔적, 능력/제약, 사용자 정의 커스텀 헤더(`[고유 결계]`, `[세력 내 서열]`)에 대한 사건 일지 나열(금지) vs 상태 증류(권장) 대조군 수록.

### 4.2 `src/prompts/auto-codex-system.md` 수정안

#### A. JSON Schema 수정 (`step4_updateEvaluation`)
```json
{
  "thoughtProcess": {
    "step4_updateEvaluation": [
      {
        "targetEntryId": "string (기존 로어북 항목 ID)",
        "targetTitle": "string (항목 제목)",
        "isLocked": false,
        "inertiaAndAntiOverinterpretationAudit": "string (인물 본질의 고관성 및 보수적 상태 전이 검증)",
        "revealedFactsPermanenceEval": "string (본문에서 새롭게 드러난 사실이 되돌릴 수 없는 영구적 설정 진전인가?)",
        "mereMentionAudit": "string (단순 호명이나 과거 행적의 단순 거론, 일상적 동선에 불과한지 감사)",
        "verdict": "UPDATE | DROP",
        "verdictRationale": "string (위 3가지 감사를 종합한 1차 판정 사유)",
        "stateDistillation": {
          "rawObservedEvent": "string (본문에서 포착된 핵심 사건 팩트)",
          "dechronologization": {
            "evaporatedContextAndActions": "string (증발시킬 일시적 씬 정황, 시공간, 동작 경과 적출)",
            "distilledPermanentProperty": "string (정황과 경과를 털어내고 남은, 대상의 영구적 속성/스탠스/규칙/메커니즘만 순수 추출)"
          },
          "headerTeleologyMapping": {
            "targetHeader": "string (추출된 속성이 들어갈 최적의 헤더, 예: [인간관계] <vs 대상명>, [성격], [신규헤더])",
            "implicitHeaderQuestion": "string (해당 헤더가 던지는 암묵적 질문: '지금 이 대상의 [X]는 어떤 상태/규칙인가?')",
            "distilledProseBullet": "string (시공간 경과가 완전히 탈색되고 질문에 직접 답하는 완성형 한국어 불릿 서술문: '- 주어는 본질/스탠스, 술어는 상태/성질')"
          }
        },
        "surgicalMergePlan": "string (verdict가 DROP인 경우 '상태 변동 없으므로 갱신 생략' 1문장 기술. UPDATE인 경우 증류된 distilledProseBullet을 기존 본문의 어느 위치에 In-place Overwrite할지, 기존 어휘 질감을 어떻게 100% 무손실 계승할지 최종 계획)"
      }
    ]
  }
}
```
*(주의: `stateDistillation` 필드에 대한 설명에 `verdict가 DROP인 경우 null로 비워두고, UPDATE인 경우에만 객체를 채운다`는 주석 지침 명시)*

#### B. Decision Rules 제4조 갱신
- Step 4 검증 관문에 **"조건부 상태 증류 게이팅(Conditional State Distillation Gating)"** 규칙을 명시:
  - 1구간 감사에서 `DROP` 판정 시 `stateDistillation: null` 처리하여 즉시 조기 종료(Early Exit).
  - `UPDATE` 판정 시 반드시 `stateDistillation`을 가동하여 사건에서 시공간을 증발시키고 타겟 헤더의 암묵 질문에 답하는 순수 상태 불릿을 생성하도록 강제.

### 4.3 `src/prompts/codex_system.md` 수정안
- 제4항 '안티-타임라인 상태 전이'에 **"헤더의 암묵적 질문 역추적 및 시공간 탈색 연산"**을 결합:
  - 작가의 수동 지시나 본문 씬을 반영할 때, 사건의 시간·장소·동작 경과를 증발시키고 헤더의 질문에 답하는 영구 상태문으로 가공하여 작성하도록 명시.

---

## 5. 실행 절차 (Execution Steps)

1. **Step 1: SSOT 갱신**
   - `src/prompts/codex_formatting_rules.md`에 헤더 암묵적 질문 역추적 및 시공간 탈색 상태 증류 규약 신설.
2. **Step 2: 오토 코덱스 프롬프트 갱신**
   - `src/prompts/auto-codex-system.md`의 JSON 스키마 및 Step 4 규칙을 조건부 상태 증류 CoT로 갱신.
3. **Step 3: 수동 코덱스 프롬프트 갱신**
   - `src/prompts/codex_system.md`에 상태 증류 원칙 동기화.
4. **Step 4: 빌드 및 린트 검증**
   - `lint_applet` 및 `compile_applet`을 수행하여 구문 오류 및 번들 무결성 검증.
5. **Step 5: Living Documentation 동기화**
   - `AGENTS.md` 및 `src/prompts/AGENTS.md`에 코덱스 상태 증류 파이프라인 정식 등재.

---

## 6. 검증 체크리스트 (Verification Checklist)

- [ ] **Fast-Fail 조기 종료 동작 검증**:
  - 본문의 단순 일상 대화/이동에 대해 활성 로어가 `verdict: "DROP"` 처리되고, `stateDistillation: null`로 비워지는지 확인.
- [ ] **중대 사건 상태 증류 동작 검증**:
  - 인물 간 배신/중상/계약 체결 등 비가역적 사건 발생 시 `verdict: "UPDATE"` 처리되고, `stateDistillation` 객체가 올바르게 생성되는지 확인.
  - `evaporatedContextAndActions`에 시공간/동작 소음이 적출되고, `distilledPermanentProperty`에 순수 상태가 추출되는지 확인.
- [ ] **헤더 암묵 질문 및 서술문 닻 검증**:
  - `implicitHeaderQuestion`이 타겟 헤더명에 맞추어 정상 역추적되는지 확인.
  - `distilledProseBullet`의 주어/서술어가 사건 일지(`~를 겪음`)가 아닌 상태 규약(`~한 스탠스/제약을 지님`)으로 완성되는지 확인.
- [ ] **사용자 정의 커스텀 헤더 적응 검증**:
  - `[고유 결계]`, `[약점]` 등 표준 외의 자유 헤더에서도 줄거리 없이 작동 원리만 깔끔히 증류되는지 확인.
- [ ] **앱 빌드 및 린트 통과 여부**:
  - 컴파일 오류 없이 100% 정상 빌드 완료.
