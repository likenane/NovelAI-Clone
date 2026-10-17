import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getValidThinkingLevel } from "../constants";

export interface GenerationMessage {
  role: "user" | "model" | "system";
  content: string;
}

export interface GenerationParams {
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  system: string;
  messages: GenerationMessage[];
  responseFormat?: "text" | "json";
  thinkingLevel?: string;
  repetitionPenalty?: number;
}

/**
 * Resolves the maximum allowed output tokens for a given model or provider.
 * Direct Gemini and modern high-capacity models (Gemini on OpenRouter, Claude 3.7, DeepSeek R1)
 * support massive token outputs (up to 60,000), while legacy or smaller models are safely clamped
 * to prevent 400 Bad Request errors.
 */
export function getModelMaxTokenLimit(modelName?: string, isDirectGemini: boolean = true): number {
  if (isDirectGemini) {
    return 60000;
  }
  if (!modelName) {
    return 8192;
  }
  const name = modelName.toLowerCase();
  // Gemini models on OpenRouter (support 65,536+)
  if (name.includes('gemini')) {
    return 60000;
  }
  // Claude 3.7 Sonnet (supports 64k)
  if (name.includes('claude-3-7') || name.includes('claude-3.7')) {
    return 60000;
  }
  // DeepSeek R1 (supports 64k)
  if (name.includes('deepseek-r1') || name.includes('deepseek/deepseek-r1')) {
    return 60000;
  }
  // OpenAI o1 / o3 reasoning models
  if (name.includes('o1') || name.includes('o3')) {
    return 60000;
  }
  // GPT-4o / GPT-4.5 / GPT-4 Turbo
  if (name.includes('gpt-4o') || name.includes('gpt-4.5') || name.includes('gpt-4-turbo')) {
    return 16384;
  }
  // Claude 3.5 Sonnet / Claude 3.5 Haiku
  if (name.includes('claude-3-5') || name.includes('claude-3.5')) {
    return 8192;
  }
  // Claude 3 Opus / Haiku
  if (name.includes('claude-3-opus') || name.includes('claude-3-haiku')) {
    return 4096;
  }
  // Safe default for unknown OpenRouter models
  return 8192;
}

/**
 * Calculates additional token headroom so that thinking/reasoning tokens do not consume
 * the user's allocated output tokens. Gemini API's maxOutputTokens covers BOTH thinking
 * tokens and response tokens.
 *
 * Automatically clamps to the provider/model maximum (up to 60,000) so large-output or
 * thinking-heavy tasks (like Refiner) never truncate, while protecting against API 400 errors.
 */
export function calculateEffectiveMaxTokens(
  targetTokens: number,
  thinkingLevel?: string,
  modelName?: string,
  isDirectGemini: boolean = true
): number {
  let thinkingBuffer = 0;
  const normalizedLevel = getValidThinkingLevel(thinkingLevel, modelName);

  if (normalizedLevel === 'HIGH') {
    thinkingBuffer = 5000;
  } else if (normalizedLevel === 'MEDIUM') {
    thinkingBuffer = 2500;
  } else if (normalizedLevel === 'LOW') {
    thinkingBuffer = 1500;
  } else if (normalizedLevel === 'MINIMAL') {
    thinkingBuffer = 500;
  }
  const requestedTotal = Math.max(targetTokens || 500, 50) + thinkingBuffer;
  const maxLimit = getModelMaxTokenLimit(modelName, isDirectGemini);

  return Math.min(requestedTotal, maxLimit);
}

export async function generateGeminiContent(params: GenerationParams) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const contents = params.messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  // Mapping repetitionPenalty (1.0 - 2.0) to Gemini's presence/frequency penalty (0.0 - 2.0)
  // Note: Gemini API requires the value to be strictly less than 2.0
  let geminiPenalty = params.repetitionPenalty ? (params.repetitionPenalty - 1.0) * 2.0 : undefined;
  if (geminiPenalty !== undefined && geminiPenalty >= 2.0) {
    geminiPenalty = 1.99;
  }

  const effectiveMaxTokens = calculateEffectiveMaxTokens(
    params.maxTokens,
    params.thinkingLevel,
    params.modelName,
    true
  );

  const config: any = {
    systemInstruction: params.system,
    temperature: params.temperature,
    maxOutputTokens: effectiveMaxTokens,
    topP: params.topP,
    topK: params.topK,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
  };

  if (params.responseFormat === 'json') {
    config.responseMimeType = "application/json";
  }

  if (geminiPenalty !== undefined && geminiPenalty > 0) {
    config.presencePenalty = geminiPenalty;
    config.frequencyPenalty = geminiPenalty;
  }

  // In-Flight Sanitization: 모델 지원 여부 검증
  const sanitizedThinkingLevel = getValidThinkingLevel(params.thinkingLevel, params.modelName);
  if (sanitizedThinkingLevel) {
    config.thinkingConfig = { thinkingLevel: sanitizedThinkingLevel as any };
  }

  try {
    const result = await ai.models.generateContent({
      model: params.modelName || "gemini-3.8-flash",
      contents,
      config
    });

    // Check for safety blocking or other finish reasons
    const candidate = result.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      if (candidate.finishReason === 'SAFETY') {
        throw new Error("Gemini blocked the response due to safety filters. Try adjusting your prompt or using OpenRouter.");
      }
      if (candidate.finishReason === 'RECITATION') {
        throw new Error("Gemini blocked the response due to copyright/recitation concerns.");
      }
      if (candidate.finishReason === 'PROHIBITED_CONTENT') {
        throw new Error("Gemini blocked the response due to prohibited content (e.g., child safety). This cannot be disabled.");
      }
      if (candidate.finishReason === 'MAX_TOKENS') {
        // For MAX_TOKENS, we might have partial text. Let's try to return it but it might be incomplete.
        // Alternatively, throw a helpful error.
        const partialText = result.text;
        if (partialText) return partialText; // Return what we have
        throw new Error("Gemini reached the maximum token limit. Try increasing 'Max Tokens' in settings.");
      }
      if ((candidate.finishReason as string) === 'MALFORMED_RESPONSE') {
        const partialText = result.text || candidate.content?.parts?.[0]?.text;
        if (partialText) return partialText;
        if (config.responseMimeType === 'application/json') {
          console.warn("Gemini returned MALFORMED_RESPONSE in JSON mode. Retrying in text mode with prompt-level JSON enforcement...");
          const fallbackConfig = { ...config };
          delete fallbackConfig.responseMimeType;
          const retryResult = await ai.models.generateContent({
            model: params.modelName || "gemini-3.8-flash",
            contents,
            config: fallbackConfig
          });
          const fallbackText = retryResult.text || retryResult.candidates?.[0]?.content?.parts?.[0]?.text;
          if (fallbackText) return fallbackText;
        }
      }
      throw new Error(`Gemini failed to generate: ${candidate.finishReason}`);
    }

    const text = result.text;
    if (!text) {
      throw new Error("Gemini returned an empty response without a specific error.");
    }
    return text;
  } catch (error: any) {
    // Handle thinkingLevel not supported error
    if (error?.message?.includes("Thinking level is not supported") && config.thinkingConfig) {
      console.warn("Thinking level not supported for this model, retrying without it...");
      const fallbackConfig = { ...config };
      delete fallbackConfig.thinkingConfig;
      
      const retryResult = await ai.models.generateContent({
        model: params.modelName || "gemini-3.8-flash",
        contents,
        config: fallbackConfig
      });
      return retryResult.text;
    }

    // If the error is about penalties not being enabled, retry without them
    if (error?.message?.includes("Penalty is not enabled for this model") && (config.presencePenalty || config.frequencyPenalty)) {
      console.warn("Penalties not supported for this model, retrying without them...");
      const fallbackConfig = { ...config };
      delete fallbackConfig.presencePenalty;
      delete fallbackConfig.frequencyPenalty;
      
      const retryResult = await ai.models.generateContent({
        model: params.modelName || "gemini-3.8-flash",
        contents,
        config: fallbackConfig
      });
      return retryResult.text;
    }
    
    // Enhance error message for quota issues
    if (error?.message?.includes("quota") || error?.status === "RESOURCE_EXHAUSTED") {
      throw new Error("Gemini API quota exceeded. Please wait a moment or switch to OpenRouter.");
    }

    throw error;
  }
}

export async function generateOpenRouterContent(params: GenerationParams, apiKey: string) {
  const effectiveMaxTokens = calculateEffectiveMaxTokens(
    params.maxTokens,
    params.thinkingLevel,
    params.modelName,
    false
  );

  const body: any = {
    model: params.modelName,
    messages: [
      { role: "system", content: params.system },
      ...params.messages
    ],
    temperature: params.temperature,
    max_tokens: effectiveMaxTokens,
    top_p: params.topP,
    top_k: params.topK,
    repetition_penalty: params.repetitionPenalty,
  };

  if (params.responseFormat === 'json') {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (data.error) {
    // Retry if max_tokens exceeded model limit on OpenRouter
    if (data.error.message?.includes("max_tokens") && body.max_tokens > 4096) {
      console.warn("[generateOpenRouterContent] max_tokens error detected, retrying with safe fallback (4096)...", data.error.message);
      body.max_tokens = 4096;
      const retryRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const retryData = await retryRes.json();
      if (retryData.error) throw new Error(retryData.error.message || "OpenRouter Error");
      return retryData.choices[0].message.content;
    }
    throw new Error(data.error.message || "OpenRouter Error");
  }
  return data.choices[0].message.content;
}

/**
 * 소설의 전체 서사 맥락(코덱스, 플롯, 스토리 메모리, 본문)을 100% 온전히 분석하여
 * 소설에 가장 최적화된 고유 문체 및 연출 지침을 도출하는 AI 서비스 함수입니다.
 * 
 * SSOT 원칙 준수: buildTotalVariableDictionary 및 buildStandardNarrativeContext를 재사용합니다.
 */
export async function generateStyleDirectivesAI(params: {
  novel: import('../types').Novel;
  userPrompt?: string;
  openRouterKey?: string | null;
}): Promise<string> {
  const { buildTotalVariableDictionary, buildStandardNarrativeContext } = await import('../lib/contextProviders');
  const variables = buildTotalVariableDictionary(params.novel, undefined, { preserveLoreComments: false });
  const narrativeSections = buildStandardNarrativeContext(variables, { includeAnchor: false });

  const systemInstruction = `당신은 최고 수준의 서사 디렉터이자 한국어 웹소설/장르문학 수석 문체 감독(Master Stylistic Director)입니다.
제공된 소설의 전체 맥락([The Codex], [Plot Blueprint], [Story Memory], [Current Story Text])을 정밀히 분석하여,
이 작품의 고유한 개성, 분위기, 장르적 쾌감을 극대화할 수 있는 완벽한 [작품 문체 및 연출 지침]을 도출하십시오.

[출력 양식 규칙 (Hierarchy Contract)]
- 반드시 아래의 <소분류> 및 - 불릿 기호 규격만을 준수하여 출력하십시오.
- 마크다운 헤더(#, ##, ###)나 대괄호 헤더([])를 절대 사용하지 마십시오 (플롯 1번 헤더 내부에 직접 결합되기 위함입니다).
- 서두 인사나 군더더기 설명, 마크다운 코드블록(\`\`\`)을 일절 배제하고 오직 지침 본문만 출력하십시오.

[표준 출력 예시]
<시점 및 서술 어조>
- 1인칭 주인공 시점 ('나'의 냉소적인 내면 독백과 통찰 중심)
- 감정 과잉을 철저히 배제하고 긴장감 넘치는 단문 위주의 호흡

<장르 및 묘사 규칙>
- 피카레스크 다크 판타지: 폭력과 마법은 시각적·물리적 충격 위주로 건조하게 서술
- 작위적인 만화적 클리셰 감탄사 및 가벼운 서브컬처 유행어 지양

<대사 및 인물 텐션>
- 설명조의 긴 대사를 지양하고 상황적 행동과 교차되는 날카로운 핑퐁 대화 유지`;

  const userRequestText = params.userPrompt?.trim()
    ? `## [작가의 추가 희망 사항]\n${params.userPrompt.trim()}\n\n`
    : "";

  const userContent = [
    ...narrativeSections,
    `${userRequestText}위 소설 맥락을 종합 분석하여, 이 작품에 가장 완벽하게 부합하는 <시점 및 서술 어조>, <장르 및 묘사 규칙>, <대사 및 인물 텐션> 등의 고유 문체 지침을 작성해주세요.`
  ].join('\n\n');

  const model = params.novel.settings.model || 'gemini';
  const modelName = params.novel.settings.modelName || 'gemini-3.8-flash';

  const genParams: GenerationParams = {
    modelName,
    temperature: 0.4,
    maxTokens: 1500,
    topP: 0.95,
    topK: 40,
    system: systemInstruction,
    messages: [{ role: 'user', content: userContent }],
    thinkingLevel: 'LOW'
  };

  if (model === 'gemini') {
    const raw = await generateGeminiContent(genParams);
    return raw.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  } else {
    if (!params.openRouterKey) {
      throw new Error("OpenRouter API key is required to use this model.");
    }
    const raw = await generateOpenRouterContent(genParams, params.openRouterKey);
    return raw.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  }
}

