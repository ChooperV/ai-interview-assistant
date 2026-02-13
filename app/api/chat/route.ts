import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, apiKey, baseUrl, model, question, resume } = body;

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

    const systemPrompt = `你是一个严厉且专业的面试官。当前面试题是：${question || "（无题目）"}。候选人简历：${resume || "（无简历）"}

请先让候选人回答问题。如果回答太简单，请进行追问。如果回答偏离，请打断纠正。
保持对话简洁，不要长篇大论。

【重要】你必须只针对当前题目进行面试。严禁主动扩展到其他无关题目。如果候选人回答完毕且没有追问必要，请直接回复「面试结束」，不要开启新话题。`;

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
