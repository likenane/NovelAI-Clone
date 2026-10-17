import { LoreEntry, MemoryArchiveCard, MemoryCardType } from '../types';

/**
 * [SSOT Engine] 설정집(The Codex)의 표제어 및 키워드(별칭)로부터
 * 정본-별칭 사전 맵을 구성합니다.
 */
export interface EntityDictionaryEntry {
  canonicalName: string;
  aliases: string[];
}

export function buildCodexNameDictionary(loreEntries: LoreEntry[] = []): EntityDictionaryEntry[] {
  const dictionary: EntityDictionaryEntry[] = [];
  const seenCanonical = new Set<string>();

  for (const entry of loreEntries) {
    if (!entry || entry.enabled === false) continue;
    const rawTitle = (entry.title || '').trim();
    if (!rawTitle || seenCanonical.has(rawTitle)) continue;

    seenCanonical.add(rawTitle);

    const aliases: string[] = [];
    if (entry.keywords) {
      const parts = entry.keywords.split(',').map(k => k.trim()).filter(Boolean);
      for (const p of parts) {
        if (p !== rawTitle && !aliases.includes(p)) {
          aliases.push(p);
        }
      }
    }

    dictionary.push({
      canonicalName: rawTitle,
      aliases
    });
  }

  return dictionary;
}

/**
 * 한국어 조사 및 1글자 단어 경계 방어 정규식 빌더
 */
const KOREAN_PARTICLES = '(?:은|는|이|가|을|를|의|에게|과|와|으로|로|도|만|에|에서|한테|이나|나|란|이란|이며|며)';

function buildEntityMatcher(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (name.length === 1) {
    // 1글자 표제어: 따옴표, 괄호, 공백 등 명확한 경계가 있는 경우만 안전하게 매칭
    return new RegExp(`(?:^|[\\s"'\`\\[\\(])${escaped}(?:${KOREAN_PARTICLES}|[\\s"'\`\\],\\.\\?!]|$)`, 'u');
  }
  // 2글자 이상 표제어: 조사 결합 또는 단어 경계/문장 부호 매칭
  return new RegExp(`${escaped}(?:${KOREAN_PARTICLES}|[\\s"'\`\\],\\.\\?!]|$)`, 'u');
}

/**
 * 텍스트(직전 본문, 플롯, 초안 등)에서 설정집 표제어 및 별칭을 추출합니다.
 * 반환값: 매칭된 정본 이름 및 별칭 리스트 (중복 제거)
 */
export function extractMentionedEntities(text: string, loreEntries: LoreEntry[] = []): string[] {
  if (!text || !text.trim() || !loreEntries || loreEntries.length === 0) {
    return [];
  }

  const dictionary = buildCodexNameDictionary(loreEntries);
  const matchedEntities = new Set<string>();

  for (const item of dictionary) {
    // 1. 정본 표제어 검사
    const canonicalMatcher = buildEntityMatcher(item.canonicalName);
    if (canonicalMatcher.test(text)) {
      matchedEntities.add(item.canonicalName);
    }

    // 2. 별칭 검사
    for (const alias of item.aliases) {
      const aliasMatcher = buildEntityMatcher(alias);
      if (aliasMatcher.test(text)) {
        matchedEntities.add(item.canonicalName);
        matchedEntities.add(alias);
      }
    }
  }

  return Array.from(matchedEntities);
}

/**
 * [결정론적 검색] 언급된 엔티티 이름들과 태그가 일치하는 보관소 카드를 검색합니다.
 * 
 * 정렬 및 상한 규칙:
 * 1. 태그 일치 개수 많은 순 (DESC)
 * 2. 일치 개수 같으면 최신순 (order DESC)
 * 3. 상한 N장(기본 20장) 슬라이스
 * 4. "정정" 카드가 선택되면 원본 대상 카드도 동반 추출
 * 5. 최종 결과는 시간순(order ASC)으로 재배열하여 반환 (같은 사안은 뒤의 카드가 우선)
 */
export function searchRelevantMemoryCards(
  cards: MemoryArchiveCard[] = [],
  mentionedEntities: string[],
  limit: number = 20
): MemoryArchiveCard[] {
  if (!cards || cards.length === 0 || !mentionedEntities || mentionedEntities.length === 0) {
    return [];
  }

  const normalizedEntities = new Set(
    mentionedEntities.map(e => e.trim().toLowerCase()).filter(Boolean)
  );

  interface ScoredCard {
    card: MemoryArchiveCard;
    matchCount: number;
  }

  const scored: ScoredCard[] = [];

  for (const card of cards) {
    if (!card.tags || !Array.isArray(card.tags)) continue;
    let count = 0;
    for (const tag of card.tags) {
      const cleanTag = (tag || '').trim().toLowerCase();
      if (cleanTag && normalizedEntities.has(cleanTag)) {
        count++;
      }
    }
    if (count > 0) {
      scored.push({ card, matchCount: count });
    }
  }

  if (scored.length === 0) {
    return [];
  }

  // 1. 태그 일치 개수 내림차순, 동일 시 order(생성순서) 내림차순(최신순)
  scored.sort((a, b) => {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount;
    }
    return (b.card.order || b.card.createdAt || 0) - (a.card.order || a.card.createdAt || 0);
  });

  const selectedCardsMap = new Map<string, MemoryArchiveCard>();
  const selectedCards = scored.slice(0, limit).map(s => s.card);
  selectedCards.forEach(c => selectedCardsMap.set(c.id, c));

  // 2. 정정 카드 동반 규칙: 만약 선택된 카드 중 '정정' 카드가 있다면, 원본 카드가 아직 안 들어있을 경우 보강
  const correctionCards = selectedCards.filter(c => c.type === '정정');
  if (correctionCards.length > 0) {
    for (const corr of correctionCards) {
      const corrTags = new Set(corr.tags.map(t => t.trim().toLowerCase()));
      // 전체 카드 중 동일 태그를 가진 이전 사건/막요약 카드 탐색
      const matchingOriginal = cards.find(c => 
        c.id !== corr.id && 
        c.type !== '정정' &&
        c.tags.some(t => corrTags.has(t.trim().toLowerCase()))
      );
      if (matchingOriginal && !selectedCardsMap.has(matchingOriginal.id)) {
        selectedCardsMap.set(matchingOriginal.id, matchingOriginal);
      }
    }
  }

  const finalCards = Array.from(selectedCardsMap.values());

  // 3. 최종 반환은 시간순(order 오름차순, 생성순)으로 재배열
  finalCards.sort((a, b) => {
    return (a.order || a.createdAt || 0) - (b.order || b.createdAt || 0);
  });

  return finalCards;
}

/**
 * 프롬프트 주입용 마크다운 형식으로 보관소 카드들을 포맷팅합니다.
 */
export function formatArchiveCardsForPrompt(cards: MemoryArchiveCard[] = []): string {
  if (!cards || cards.length === 0) {
    return "없음";
  }

  const lines: string[] = [];
  cards.forEach((card, idx) => {
    const tagStr = Array.isArray(card.tags) ? card.tags.join(', ') : '';
    const lastingStr = card.lasting && card.lasting.trim() !== '없음' ? ` (잔존 영향: ${card.lasting})` : '';
    lines.push(
      `[카드 ${idx + 1} | 유형: ${card.type} | 시점: ${card.time}] (태그: ${tagStr})\n` +
      `- 사실: ${card.content}${lastingStr}`
    );
  });

  return lines.join('\n\n');
}
