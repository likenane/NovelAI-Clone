# Master Blueprint: Story Memory 3-Tier Hierarchy & Auto-Codex Evidence-First Discovery Optimization

---

## 1. Executive Summary & Strategic Architecture

본 마스터 계획서는 AI Novelist Studio의 핵심 지능형 컨텍스트 서브시스템인 **Story Memory(서사 기억)**와 **Auto-Codex(배경 로어북 자동 추출)**의 아키텍처적 결함을 해소하고, 대규모 장편 연재 환경에서도 왜곡 없이 작동하는 고밀도 단일 진실 공급원(SSOT)을 구축하기 위한 계획서입니다.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               AI Novelist Studio 컨텍스트 계층 구조                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. [The Codex]         : 세계관/인물/설정 불변 팩트 및 집필 디렉팅 앵커                      │
│ 2. [Story Memory]      : 과거~현재까지의 불가역적 역사 연표 및 현장 착지점 (3-Tier 누적 기록)   │
│ 3. [Plot Blueprint]    : 미래 서사 설계, 미해결 사건 플롯, 장기 복선 및 진행 과제 전담         │
│ 4. [Current Story]     : 집필 중인 소설 본문 (Ground Truth)                                    │
│ 5. [User Directive]    : 유저의 즉각적 인라인 지시 ({})                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Issue 1: Story Memory 3-Tier 아키텍처 재설계

### 2.1 철학적 배경 및 문제 분석
- **현상 및 모순점**: 기존 Story Memory의 `[3. 활성 스토리 스레드 및 당면 과제]`는 미래에 해결해야 할 과제 및 진행 중인 복선을 기록하고 있었음. 이는 "과거로부터 누적된 역사적 사실과 현재의 물리적 착지점"을 다루는 Story Memory의 회고적/누적적 본질에 어긋나며, `Plot Blueprint`의 `[3. 현재 진행 중인 사건 플롯]` 및 `[4. 장기 복선]`과 기능적으로 100% 중복되어 토큰 낭비와 서사 충돌을 유발함.
- **해결 원칙**:
  - 활성 스레드 및 향후 과제는 **Plot Blueprint**로 완전히 역할을 이관.
  - Story Memory는 순수하게 **과거의 불가역적 사실(과거사+연표)**과 **방금 끝난 본문의 현장 물리적 착지점(현재 상태)**에만 집중하는 **3-Tier 고밀도 누적 구조**로 재편.

### 2.2 3-Tier 계층 구조 규약 (Hard Budget: 4,000자)

```
[1. 대서사 핵심 기점 및 원인 (Macro Anchor & Root Causes)]
- 대서사의 발단, 주인공의 근원적 행동 동기, 세계관적 대전제 등 불변의 역사적 사실 1~3개 항목.
- 🔒 불변 보존 락(Immutable Preservation Lock): 과거에 기록된 기점은 임의로 삭제되거나 변형되지 않음.

[2. 시간순 주요 사건 연표 (Chronological Event Ledger)]
- 소설 전개에 따라 완결된 사건들을 시간순(Chronological)으로 누적 기록.
- 형식: `- [사건명/시기]: 원인 -> 전개 -> 결과 (불가역적 사실 변화)` 단일 줄 요약.
- 계층적 압축(Hierarchical Culling): 오래된 사소한 사건은 상위 개념으로 묶어 압축하고, 최근 사건은 구체성을 유지.

[3. 현재 서사 도달점 및 인물 상황 (Current Narrative Foothold & Actor States)]
- 직전 본문이 물리적/시간적으로 종료된 바로 그 현장의 착지 상태(Foothold).
- 1줄 3요소 인물 상태: `- [인물명]: 위치/상황 | 심리/동기 | 보유 아이템 및 직전 행동`
```

### 2.3 시스템 전반 영향도 및 코드 수정 계획
1. **`src/prompts/memory_system.md`**:
   - 4-Tier 템플릿을 3-Tier 템플릿으로 전면 교체.
   - `Immutable Preservation Lock`을 헤더 1(`Macro Anchor & Root Causes`)에 집중.
   - CoT 스키마의 `step2_causalityAndCulling`에서 불필요한 `activeThreads` / `chekhovGuns` 필드를 제거하고 `step2_rootCausesAndEventLedger`로 단순화.
2. **`src/services/memoryService.ts`**:
   - `MANDATORY_MEMORY_HEADERS`를 3개 필수 헤더로 갱신.
   - `validateMemoryHeaders()` 정규식을 개정하여 3대 헤더 검증 지원 및 구버전 4대 헤더 데이터의 무손실 파싱 역호환성 보장.
   - `cleanseMemoryResponse()`의 헤더 슬라이싱 로직 동기화.
3. **`src/types.ts`**:
   - `MemoryThoughtProcess` 인터페이스 내 `step2` 정의 갱신 (역호환 optional 필드 처리).
4. **`src/lib/contextProviders.ts`**:
   - `buildTaskMessages`의 `taskType === 'memory'` 블록 내 `[Output Protocol]` 템플릿을 3-Tier 규약으로 갱신.
5. **`src/components/PromptInspector.tsx`**:
   - Memory CoT 카드 렌더러에서 3-Tier 구조에 맞춰 시각화 레이아웃 정돈.

---

## 3. Issue 2: Auto-Codex Step 1 인지 분리형 트리아지 & 신규 발굴 아키텍처

### 3.1 문제 심층 진단 (The Cognitive Bottleneck in Step 1)
- **현상**: 로어북에 등록된 엔트리가 10~20개 이상 축적되면, AI가 본문의 새로운 인물/장소/세력/개념을 발굴하지 않고 기존 활성 엔트리(주인공, 메인 조연 등 3~4개)만 계속해서 갱신(`updates`)함.
- **근본 원인 (3대 결함)**:
  1. **동일 버킷 혼재**: 기존 `step1_semanticDiscovery.explicitEntities` 배열 안에 기존 엔트리 후보와 신규 엔트리 후보가 무분별하게 혼재됨.
  2. **어텐션 고착화 (Attention Anchoring)**: 본문에서 가장 활발히 움직이는 기존 주요 인물들이 배열의 상위 3~4칸을 먼저 차지해버려, 단일 배열 생성 토큰 한도에 걸려 신규 개체가 진입조차 못 함.
  3. **판단 선행의 역효과**: 근거 분석보다 결론(`true/false`)을 먼저 내리게 하면 자기회귀(Auto-regressive) 생성 특성상 기존 엔트리를 무조건 업데이트 대상으로 섣부르게 엮어버림.

### 3.2 해결 아키텍처: Evidence-First 경량 트리아지 & 순수 신규 발굴 2단계 분리

Step 1 단계는 **"심층 감사나 영구 보존성 판정"**(이는 Step 4의 4대 관문이 수행)을 하는 곳이 아니며, **"이번 본문에서 기존 엔트리에 손댈 만한 새로운 사실/변화 건덕지가 있는지를 가볍고 빠르게 스캔하여 털어내고, 온전한 주의력으로 본문의 순수 신규 개체를 발굴하는 단계"**로 재설계합니다.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Step 1: 2단계 인지 분리형 시맨틱 디스커버리 (Cognitive-Decoupled Semantic Discovery)              │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                │
│  [1-A. 기존 활성 로어의 변화 건덕지 경량 스캔 (Active Lore Lightweight Fact-Shift Triage)]        │
│   • 목표: 기존 활성 로어(ID: xxx)를 빠르게 훑으며, 이번 본문에서 실질적인 새 사실/변화 단서가      │
│           있는지 가볍게 스캔하여 인지적 부담을 즉시 털어냄(Clear).                               │
│   • LLM 사고 순서 (Evidence-First):                                                             │
│     ① observedFactShift : 본문에서의 구체적 사실 변화/단서 서술 (단순 행동/호명이면 "건덕지 없음") │
│     ② hasFactShift      : 위 분석에 따른 변화 건덕지 유무 판정 (true -> Step 4 심사 / false -> 패스)│
│                                                                                                │
│                                           │                                                    │
│                                           ▼ (기존 로어에 대한 생각을 정리하고 홀가분하게 진입)  │
│                                                                                                │
│  [1-B. 본문 순수 신규 개체 발굴 (Pure Novel Entity Discovery)]                                 │
│   • 목표: 기존 로어에 없는 완전히 새로운 실체를 본문 텍스트에서 집중 스캔 (기존 로어의 침범 불가)│
│   • Track 1: explicitNewEntities     (명시적 고유명사/인물/세력/장소/아이템)                    │
│   • Track 2: implicitEmergentEntities (미명명 암묵적/창발적 실체, 임시 앵커 타이틀 부여)       │
│   • Track 3: conceptualClusters      (본문의 단편적 복선/마법현상을 통합한 개념)              │
│                                                                                                │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 후속 스텝(Step 2 ~ Step 5)과의 유기적 연결 파이프라인

```
                  ┌────────────────────────────────────────┐
                  │ Step 1: Cognitive-Decoupled Discovery  │
                  └───────────┬────────────────┬───────────┘
                              │                │
            [1-A. hasFactShift: true]    [1-B. 순수 신규 개체 목록]
                              │                │
                              │                ▼
                              │   ┌────────────────────────────────────────┐
                              │   │ Step 2: Alias & Existing Mapping       │
                              │   │ (신규 개체가 기존 로어의 단순 이명인지   │
                              │   │  확인, 독립 개체는 과잉 흡수 방지)     │
                              │   └────────────┬───────────────────────────┘
                              │                │
                              │                ▼
                              │   ┌────────────────────────────────────────┐
                              │   │ Step 3: New Entry Screening (4 Gateways)│
                              │   │ (서사지속성/독립식별성/무게감/비중복성)│
                              │   │  -> ACCEPT 판정 시 [newEntries] 등록   │
                              │   └────────────────────────────────────────┘
                              ▼
        ┌────────────────────────────────────────┐
        │ Step 4: Existing Update Evaluation     │
        │ (1-A에서 건덕지가 포착된 기존 엔트리만) │
        │ (관성감사/영구사실/단순호명배제/외과병합│
        │  -> UPDATE 판정 시 [updates] 등록      │
        └─────────────────────┬──────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │ Step 5: Global Synthesis               │
        │ (로어 궤적 및 집필 컨텍스트 종합 요약) │
        └────────────────────────────────────────┘
```

### 3.4 개정 CoT JSON 스키마 명세

```json
{
  "thoughtProcess": {
    "step1_semanticDiscovery": {
      "existingEntriesTriage": [
        {
          "entryId": "string",
          "title": "string",
          "observedFactShift": "string (본문에서 포착된 사실 변화/새로운 설정/관계 단서. 단순 행동 지속이나 단순 호명이면 '변화 건덕지 없음' 서술)",
          "hasFactShift": "boolean (true: 변화 건덕지 있음 -> Step 4 정밀 심사 대상으로 인계 / false: 갱신 불필요 -> 즉시 패스)"
        }
      ],
      "novelEntitiesDiscovery": {
        "explicitNewEntities": [
          {
            "candidateName": "string",
            "category": "string ([인물] | [세력] | [장소] | [개념] | [규칙] 등)",
            "mentionContext": "string (본문 내 등장 맥락 및 발언/행동 근거)",
            "distinctivenessBasis": "string (기존 로어에 없는 독립적 개체로서의 식별 근거)"
          }
        ],
        "implicitEmergentEntities": [
          {
            "temporaryAnchorTitle": "string (예: [세력] 성벽 뒤편의 복면 무리)",
            "category": "string",
            "descriptiveClues": "string (본문에 묘사된 외형/복장/행동/특징)",
            "recurrenceBasis": "string (향후 반복 등장 및 서사적 상호작용 가능성)"
          }
        ],
        "conceptualClusters": [
          {
            "proposedConceptTitle": "string (예: [개념] 마나 역류 현상)",
            "clusterEvidence": ["string (본문 증거 1)", "string (본문 증거 2)"],
            "abstractDefinition": "string (단편적 현상들을 관통하는 종합 정의)"
          }
        ]
      }
    },
    "step2_aliasAndExistingMapping": {
      "mappingAnalysis": [
        {
          "candidateTitle": "string",
          "mappingStatus": "PURE_NEW_ENTITY | EXISTING_UPDATE_CANDIDATE | REJECTED_NOISE",
          "targetExistingEntryId": "string (EXISTING_UPDATE_CANDIDATE인 경우 해당 ID, 아니면 null)",
          "mappingRationale": "string (독립 개체성 보존 이유 또는 기존 항목 이명 흡수 이유)"
        }
      ]
    },
    "step3_newEntryScreening": {
      "evaluations": [
        {
          "candidateTitle": "string",
          "category": "string",
          "narrativePermanenceAudit": "string (일회성 엑스트라 vs 향후 서사 지속성)",
          "functionalIdentityAudit": "string (독립적 식별자 및 기능성)",
          "narrativeStakesAudit": "string (갈등/사건/인물과의 역학 관계 및 비중)",
          "nonRedundancyAudit": "string (기존 로어와의 비중복 및 독립 관리 가치)",
          "verdict": "ACCEPT | REJECT",
          "verdictRationale": "string"
        }
      ]
    },
    "step4_updateEvaluation": {
      "evaluations": [
        {
          "entryId": "string",
          "entryTitle": "string",
          "inertiaAudit": "string (일시적 위기/상황적 착오를 영구 성격/설정으로 과잉 해석하지 않았는가)",
          "revealedFactsPermanence": "string (본문에서 확정된 불가역적 공식 설정/사건)",
          "mereMentionAudit": "string (단순 이름 언급이나 과거 회상이 아닌 실질적 사실 추가인가)",
          "surgicalMergePlan": "string (기존 3-Tier 브라켓 헤더를 보존하며 외과적으로 병합할 계획)",
          "verdict": "UPDATE | DROP",
          "verdictRationale": "string"
        }
      ]
    },
    "step5_globalSynthesis": {
      "loreTrajectorySummary": "string",
      "writingContextGuidance": "string"
    }
  },
  "newEntries": [
    {
      "title": "string",
      "category": "string",
      "keywords": "string",
      "description": "string (3-Tier 규약: [기본 정보], [개요] 등)",
      "rationale": "string"
    }
  ],
  "updates": [
    {
      "entryId": "string",
      "title": "string",
      "category": "string",
      "keywords": "string",
      "description": "string",
      "updateReason": "string"
    }
  ],
  "prune": []
}
```

---

## 4. Detailed Implementation Strategy & Code-Level Touchpoints

### Phase 1: Story Memory 3-Tier 리팩토링
- **Target 1**: `src/prompts/memory_system.md`
  - 3-Tier 명세 및 불변 보존 락 강화.
  - CoT 구조 `step2_rootCausesAndEventLedger`로 개정.
- **Target 2**: `src/services/memoryService.ts`
  - `MANDATORY_MEMORY_HEADERS` 3대 헤더 정의.
  - `validateMemoryHeaders` 정규식 갱신 및 레거시 데이터 파싱 안전성 보장.
- **Target 3**: `src/types.ts`
  - `MemoryThoughtProcess` 타입 정의 업데이트.
- **Target 4**: `src/lib/contextProviders.ts`
  - `buildTaskMessages` memory 템플릿 갱신.
- **Target 5**: `src/components/PromptInspector.tsx`
  - Memory CoT 카드 뷰어 정렬.

### Phase 2: Auto-Codex Evidence-First Triage & Discovery 구현
- **Target 1**: `src/prompts/auto-codex-system.md`
  - Step 1을 `existingEntriesTriage` (observedFactShift -> hasFactShift)와 `novelEntitiesDiscovery`로 완전 분리.
  - 신규 개체 독립 보존 규칙(Anti-Absorption Rule) 및 쿼터 보장 지침 삽입.
- **Target 2**: `src/types.ts`
  - `AutoCodexThoughtProcess`의 `step1_semanticDiscovery` 인터페이스에 `existingEntriesTriage`와 `novelEntitiesDiscovery` 구조 추가 및 레거시 필드(`explicitEntities`) optional 역호환 유지.
- **Target 3**: `src/hooks/useAutoCodex.ts`
  - CoT 일관성 가드(`filterConsistentProposals`)에서 개정된 CoT 스키마의 Step 3 판정(`ACCEPT`)과 Step 4 판정(`UPDATE`)을 정확하게 추적하여 필터링.
- **Target 4**: `src/components/PromptInspector.tsx`
  - Step 1 뷰어 카드에서 (1) 기존 엔트리 변화 건덕지 트리아지 표와 (2) 발굴된 순수 신규 개체 목록을 각각 명확하게 렌더링하도록 UI 고도화.

### Phase 3: 빌드 검증 및 Living Documentation 동기화
- **Target 1**: `compile_applet` 실행으로 TypeScript 타입 검증 및 번들링 확인.
- **Target 2**: `/AGENTS.md`, `/src/components/AGENTS.md`, `/src/services/AGENTS.md`, `/src/prompts/AGENTS.md` 등 전 계층 문서 100% 동기화.

---

## 5. Risk Assessment & Self-Critique

| 검토 항목 | 분석 내용 | 방어 메커니즘 |
| :--- | :--- | :--- |
| **1. 기존 4-Tier Memory 호환성** | 사용자가 이미 작성해둔 기존 메모리에 3번째 헤더가 남아있을 경우 파싱 에러 우려 | `memoryService.ts`의 유효성 검사 및 정제 로직에서 기존 4-Tier 헤더도 파싱 가능하도록 유연한 정규식 및 마이그레이션 fallback 유지 |
| **2. Auto-Codex 역호환성** | 이전에 저장된 `lastAutoCodexPromptInfo`가 새 PromptInspector에서 렌더링될 때 크래시 위험 | `PromptInspector.tsx`에서 `thoughtProcess.step1_semanticDiscovery`의 구버전 필드(`explicitEntities`)와 신버전 필드(`existingEntriesTriage`, `novelEntitiesDiscovery`)를 안전하게 conditional rendering |
| **3. 토큰 오버플로우 방지** | Step 1-A에서 모든 기존 엔트리를 분석하면 토큰이 낭비될 수 있는지 여부 | Step 1-A는 1줄의 경량 팩트 체크(`observedFactShift`)만 수행하도록 엄격 제한하여 토큰 소모 최소화 |

---

## 6. Execution Readiness Checklist
- [x] 문제 원인 및 해결 철학 정립 완료
- [x] Story Memory 3-Tier 아키텍처 및 CoT 스키마 확정
- [x] Auto-Codex Step 1 인지 분리형(Evidence-First) 트리아지 & 신규 발굴 아키텍처 확정
- [x] 데이터 타입 및 컴포넌트 영향도 분석 완료
- [ ] **사용자 최종 구현 승인 대기 (STP Step 4 완료)**
