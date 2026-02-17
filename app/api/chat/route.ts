import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, apiKey, baseUrl, model, question, resume, difficulty } = body;

    if (!apiKey?.trim()) {
      return Response.json(
        { error: "请先在设置中配置 API Key" },
        { status: 400 }
      );
    }

    const provider = createOpenAICompatible({
      name: "minimax",
      baseURL: baseUrl?.trim() || "https://api.minimax.io/v1",
      apiKey: apiKey.trim(),
    });

    const modelId = model?.trim() || "MiniMax-M2.1-lightning";

    const difficultyLevel = difficulty === "high" ? "high" : difficulty === "medium" ? "medium" : "low";

    const PROMPTS: Record<string, string> = {
      low: `你是一个温和、友好且专业的面试官。当前面试题是：${question || "（无题目）"}。候选人简历：${resume || "（无简历）"}

请先让候选人回答问题。以鼓励和引导为主，适当追问帮助候选人完善回答。即使回答不够完美，也给予肯定和建设性反馈，营造轻松的面试氛围。

【重要】你必须只针对当前题目进行面试。严禁主动扩展到其他无关题目。如果候选人回答完毕且没有追问必要，请直接回复「面试结束」，不要开启新话题。`,

      medium: `你是一个专业、中肯的面试官。当前面试题是：${question || "（无题目）"}。候选人简历：${resume || "（无简历）"}

请先让候选人回答问题。可以适度追问和挑战，指出逻辑漏洞或表述不清之处，但保持专业和尊重。要求候选人给出更具体、有说服力的回答，帮助其提升表达质量。

【重要】你必须只针对当前题目进行面试。严禁主动扩展到其他无关题目。如果候选人回答完毕且没有追问必要，请直接回复「面试结束」，不要开启新话题。`,

      high: `你是一个严厉、苛刻且追求完美的面试官。当前面试题是：${question || "（无题目）"}。候选人简历：${resume || "（无简历）"}

请先让候选人回答问题。可以随时打断、尖锐追问、否定模糊或逻辑不严密的回答。要求候选人给出结构清晰、有数据支撑、逻辑严密的回答。态度冷峻、直接，模拟高压面试场景。

【重要】你必须只针对当前题目进行面试。严禁主动扩展到其他无关题目。如果候选人回答完毕且没有追问必要，请直接回复「面试结束」，不要开启新话题。`,
    };

    const systemPrompt = PROMPTS[difficultyLevel] ?? PROMPTS.low;

    const result = streamText({
      model: provider(modelId),
      system: systemPrompt,
      messages: await convertToModelMessages(messages ?? []),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "聊天请求失败" },
      { status: 500 }
    );
  }
}
