export interface BuildContextParams {
  templateRaw: string;
  variables: Record<string, string>;
}

export interface AIContextPayload {
  system: string;
}

/**
 * .md 템플릿과 변수 객체를 받아 AI API에 전달할 Context Payload를 조립합니다.
 */
export function buildAIContext({ templateRaw, variables }: BuildContextParams): AIContextPayload {
  // 1. HTML 주석(<!-- ... -->) 제거 (주석 뒤의 줄바꿈 한 개까지 포함하여 제거하여 유령 공백 방지)
  // 템플릿 파일 내의 개발자용 메모를 파싱 전에 안전하게 제거합니다.
  let processedText = templateRaw.replace(/<!--[\s\S]*?-->\n?/g, '');

  // 2. 변수 치환 (Variable Interpolation)
  // [Fail-Fast] 템플릿에 선언된 {{VAR}}가 variables 객체에 없으면 즉시 에러 발생
  processedText = processedText.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    if (variables[key] === undefined) {
      throw new Error(`[ContextBuilder] Critical Error: Variable '${key}' is missing in the provided variables object.`);
    }
    return variables[key];
  });

  // 3. 섹션 파싱 (Section Parsing using Regex)
  // 앵커(^, $)와 멀티라인(m) 플래그를 사용하여 본문 내의 우연한 태그 매칭 방지
  const systemMatch = processedText.match(/^<System>\n([\s\S]*?)\n<\/System>$/im);

  // 4. 페이로드 조립 및 반환 (trim을 통해 불필요한 공백 제거)
  return {
    system: systemMatch ? systemMatch[1].trim() : ""
  };
}
