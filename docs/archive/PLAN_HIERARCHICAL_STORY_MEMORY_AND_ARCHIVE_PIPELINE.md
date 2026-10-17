# Architectural Blueprint: 2-Tier Hierarchical Story Memory & Deterministic Archive Pipeline

## 1. Executive Summary & Problem Diagnosis
기존 스토리 메모리는 4,000자 이내의 단일 버퍼(`finalMemoryText`)를 매 갱신마다 통째로 다시 쓰는 구조였습니다.
이는 세 가지 치명적인 구조적 결함을 야기했습니다:
1. **장편 연재 시 사실 유실 (Fact Truncation)**: 소설의 분량이 증가할수록 과거의 중요한 사건과 단서가 4,000자 상한에 밀려 영구히 소실됨.
2. **요약의 요약으로 인한 사실 변질 (Degradation & Hallucination)**: 전문을 매번 다시 쓰면서 사건의 팩트가 서서히 왜곡되고, 작가가 워크벤치에서 수동으로 교정한 문장까지 유실됨.
3. **인지적 정보 격차 및 미해결 단서 부재 (Epistemic Asymmetry Void)**: 누가 무엇을 알고 모르는지, 어떤 약속과 복선이 미해결 상태인지 관리되지 않아 검수기(MARS) 및 이어쓰기 모델의 캐붕/모순 방어가 어려움.

### 해결 전략
- **2-Tier 구조**: 항상 주입되는 핵심 기억(최대 4,000자) + 필요할 때만 결정론적으로 검색되어 주입되는 무제한 보관소 카드(Archive Cards).
- **계층형 압축 (Hierarchical Folding)**: 오래된 사건은 `진행 중인 막` -> `막 요약` -> `전체 흐름`으로 체계적으로 압축되며, 압축되어 사라지는 세부는 카드 형태로 보관소로 이동.
- **결정론적 태그 검색 (Deterministic Tag Retrieval)**: 설정집(Codex) 표제어 및 별칭 기반으로 본문/플롯에서 이름을 감지하고, 일치하는 카드를 우선순위(일치 개수 DESC, 최신순)로 N장 슬라이스하여 주입 (외부 벡터 DB/임베딩 종속성 0).
- **원자적 제안-승인 (Proposal-Commit Pattern)**: AI는 1회 호출로 `thoughtProcess`, `finalMemoryText`, `archiveEntries`를 생성하며, 작가가 워크벤치에서 [적용]을 누르기 전까지는 DB에 카드를 커밋하지 않음 (재시도 시 쓰레기 카드 누적 원천 차단).

---

## 2. Target Data Models & Firestore Schema

### 2.1. MemoryArchiveCard Interface (`src/types.ts`)
```typescript
export interface MemoryArchiveCard {
  id: string;               // UUID (클라이언트에서 부여)
  novelId: string;
  type: '사건' | '막요약' | '정정';
  tags: string[];           // 인물, 사물, 장소 정본 및 별칭
  time: string;             // 이야기 안의 시점 표현
  content: string;          // 독립 완결 문장
  lasting: string;          // 이후에도 남는 영향 또는 "없음"
  order: number;            // 시간순 정렬용 생성 인덱스 (Date.now())
  createdAt: number;
  updatedAt?: number;
}

export interface MemoryProposal {
  thoughtProcess?: MemoryThoughtProcess;
  finalMemoryText: string;
  archiveEntries: Array<{
    type: '사건' | '막요약' | '정정';
    tags: string[];
    time: string;
    content: string;
    lasting: string;
  }>;
}

export interface MemoryThoughtProcess {
  newEvents?: string[];
  stateChanges?: string[];
  clueChanges?: string[];
  existingMemoryReview?: string;
  foldingPlan?: string;
  sizeCheck?: string;
  [key: string]: any;
}
```

### 2.2. Novel & Firestore Sub-collection
- **문서 모델**: `Novel` 인터페이스에 `memoryCards?: MemoryArchiveCard[]`를 선택적 인메모리 필드로 유지.
- **서브 컬렉션**: `/novels/{novelId}/memoryCards/{cardId}`
  - Firestore 1MB 제한 방어 및 고성능 인덱싱.
  - 보안 규칙 (`firestore.rules`):
    ```
    match /memoryCards/{cardId} {
      allow read: if isDocOwner(novelId);
      allow create, update: if isDocOwner(novelId) && isValidMemoryCard(request.resource.data);
      allow delete: if isDocOwner(novelId);
    }
    ```
- **Envelope V2 백업 및 복원 (`src/lib/novelIO.ts`)**:
  - `NovelExportEnvelopeV2.data`에 `memoryCards?: MemoryArchiveCard[]`를 포함하여 오프라인 JSON 백업/복원 시 보관소 서고 100% 완전 보존.

---

## 3. Core Engine Pipeline & SSOT Modules

### 3.1. SSOT Name Matching & Archive Retrieval Engine (`src/lib/memoryArchiveUtils.ts`)
단일 진실 공급원(SSOT) 헬퍼 파일 신설:
1. `buildCodexNameDictionary(loreEntries: LoreEntry[])`:
   - 표제어(`title`) 및 키워드(`keywords`)를 파싱하여 정본-별칭 사전 맵 구축.
2. `extractMentionedEntities(text: string, dictionary: Record<string, string[]>)`:
   - 텍스트 내에서 한국어 조사 분리(`은/는/이/가/을/를/의/에게/과/와/으로/도`) 및 1글자 단어 경계(`\b` 및 문장부호)를 방어하여 고유명사 출현 리스트 추출.
3. `searchRelevantMemoryCards(cards: MemoryArchiveCard[], entityNames: string[], limit: number = 20)`:
   - 태그 일치 수 DESC -> 생성순(최신) 정렬 -> 상위 limit개 선택 -> 최종 반환 시에는 `order` 기준 시간순 오름차순 재정렬.
   - 검색된 카드 중 "정정" 카드가 있다면 관련된 원본 사건 카드도 함께 동반 주입.
4. `formatArchiveCardsForPrompt(cards: MemoryArchiveCard[])`:
   - AI 프롬프트에 주입할 표준 마크다운/텍스트 포맷터 SSOT.

### 3.2. Context Injection Pipeline (`src/lib/contextProviders.ts`)
3대 AI 진입로에 일관된 보관소 카드 주입:
1. **메모리 워크벤치 갱신 (`taskType: 'memory'`)**:
   - `직전 본문`에서 엔티티 추출 -> `searchRelevantMemoryCards` -> `## 관련 보관소 카드`에 주입.
   - 표준 라벨:
     - `## 설정집`
     - `## 플롯 청사진`
     - `## 기존 핵심 기억`
     - `## 관련 보관소 카드`
     - `## 직전 본문`
     - `## 작가 지시`
2. **소설 본문 이어쓰기 (`taskType: 'novel'`)**:
   - `본문 말미(Tail 400자) + 플롯`에서 엔티티 추출 -> 관련 카드 검색 -> `[Story Memory]` 하단에 `## [관련 보관소 과거 사실 (참고용)]` 블록으로 주입.
3. **MARS 다중 에이전트 검수 (`taskType: 'auditor'`)**:
   - 검수 초안(`<RAW_DRAFT>`)에서 엔티티 추출 -> 관련 카드 검색 -> 사실 기준표로 주입.

### 3.3. 프롬프트 & 검증 파이프라인 (`src/prompts/memory_system.md`, `src/services/memoryService.ts`)
- `src/prompts/memory_system.md`: 사용자 제시 신규 시스템 프롬프트로 전면 갱신.
- `src/services/memoryService.ts`:
  - 5대 필수 헤더 정규식 검증:
    1. `[1. 이야기의 뿌리]`
    2. `[2. 지난 경과]`
    3. `[3. 미해결 단서]`
    4. `[4. 인물 상태와 관계]`
    5. `[5. 직전 장면 이음새]`
  - JSON 파서 강화: `finalMemoryText`와 `archiveEntries` 파싱 및 유효성 검증(각 카드의 `type`, `tags`, `time`, `content`, `lasting` 방어 검증).

---

## 4. UI & Workbench Experience (`src/components/MemoryWorkbench.tsx`)

1. **상단 탭 구조 확장**:
   - `[핵심 기억 (Core)]` (기존 에디터 및 글자 수 표시, 4,000자 경고 배지)
   - `[보관소 서고 (Archive)]` (누적된 카드 목록, 태그 필터링, 검색, 수동 카드 추가/수정/삭제/정정 병합)
2. **AI 제안(Suggestion) 화면 고도화**:
   - 좌측: 현재 핵심 기억 vs 우측: 갱신 제안 핵심 기억 Diff.
   - 하단: **"이번 갱신에서 신규 발행될 보관소 카드 (N장)"** 프리뷰 카드 덱.
   - [적용(Apply)] 버튼 클릭 시: 핵심 기억 저장과 신규 카드 일괄 저장이 원자적으로 동시에 수행됨.

---

## 5. 단계별 실행 계획 (Execution Phases)
- **Phase 1**: 데이터 타입(`src/types.ts`), Firestore 보안 규칙(`firestore.rules`), 시스템 프롬프트(`src/prompts/memory_system.md`) 반영.
- **Phase 2**: 파서 및 검증 서비스(`src/services/memoryService.ts`), 결정론적 태그 매칭 SSOT(`src/lib/memoryArchiveUtils.ts`) 구현.
- **Phase 3**: 컨텍스트 주입 통합(`src/lib/contextProviders.ts`, `src/services/contextBuilder.ts`, `src/services/refinerService.ts`).
- **Phase 4**: Firestore 연동 훅 및 I/O(`src/hooks/useNovelContent.ts`, `src/hooks/useNovels.ts`, `src/lib/novelIO.ts`)에 카드 서브컬렉션 CRUD 및 백업 탑재.
- **Phase 5**: 워크벤치 UI 구현(`src/components/MemoryWorkbench.tsx`) - 서고 탭, 제안 카드 덱 프리뷰, 원자적 커밋.
- **Phase 6**: 빌드 검증(`compile_applet`), 문서화(`AGENTS.md`, `AUDIT_LOG.md`), 아카이빙.
