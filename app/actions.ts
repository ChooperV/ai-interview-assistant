"use server";

import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type AIGeneratedQuestion = {
  title: string;
  content: string;
  category: string;
  difficulty: number;
  answer_hint: string;
};

/** 尝试修复常见 JSON 格式问题（尾部逗号、注释等） */
function tryFixJson(s: string): string {
  return s
    .replace(/,\s*([}\]])/g, "$1") // 尾部逗号
    .replace(/\/\*[\s\S]*?\*\//g, "") // 块注释
    .replace(/\/\/[^\n]*/g, ""); // 行注释
}

function parseAIResponse(text: string): { questions: AIGeneratedQuestion[]; parseError?: string; rawPreview?: string } {
  const raw = text.trim();
  let jsonStr = raw;

  // 提取 JSON：多种方式尝试
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  // 若当前没有数组/对象结构，从全文提取
  if (!jsonStr.startsWith("[") && !jsonStr.startsWith("{")) {
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonStr = arrayMatch[0];
    else {
      const objectMatch = raw.match(/\{[\s\S]*\}/);
      if (objectMatch) jsonStr = objectMatch[0];
    }
  }

  const rawPreview = raw.length > 400 ? raw.slice(0, 400) + "..." : raw;

  const parseAttempts = [jsonStr, tryFixJson(jsonStr), tryFixJson(raw)];
  for (const attempt of parseAttempts) {
    if (!attempt?.trim()) continue;
    const result = tryParse(attempt);
    if (result.questions.length > 0) return result;
  }

  return {
    questions: [],
    parseError: "JSON 解析失败",
    rawPreview,
  };
}

function tryParse(jsonStr: string): { questions: AIGeneratedQuestion[] } {
  try {
    const parsed = JSON.parse(jsonStr);
    // 支持 { questions: [...] } 或 { data: [...] } 或直接 [...]
    let arr: unknown[] = [];
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === "object") {
      arr = (parsed.questions ?? parsed.data ?? parsed.list ?? parsed.items ?? parsed.question ?? [parsed]) as unknown[];
      if (!Array.isArray(arr)) arr = [arr];
    }

    const questions = arr
      .filter((q: unknown): q is Record<string, unknown> => q != null && typeof q === "object")
      .map((q: Record<string, unknown>) => {
        const content = String(q.content ?? q.question ?? q.text ?? "");
        if (!content) return null;
        const rawTitle = String(q.title ?? "").trim();
        const title = rawTitle || content.trim().slice(0, 10) || "未命名题目";
        return {
          title,
          content,
          category: String(q.category ?? q.type ?? "其他"),
          difficulty: Math.min(5, Math.max(1, Number(q.difficulty ?? q.level ?? 1) || 1)),
          answer_hint: String(q.answer_hint ?? q.answerHint ?? q.answer ?? q.hint ?? ""),
        };
      })
      .filter((q): q is AIGeneratedQuestion => q !== null);

    return { questions };
  } catch {
    return { questions: [] };
  }
}

export async function testMinimaxConnection(params: {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  const { apiKey, baseUrl, modelName } = params;
  if (!apiKey?.trim()) return { error: "请先配置 API Key" };

  try {
    const client = new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: baseUrl?.trim() || "https://api.minimax.io/v1",
    });

    const completion = await client.chat.completions.create({
      model: modelName?.trim() || "MiniMax-M2.1-lightning",
      messages: [{ role: "user", content: "你好，请用一句话介绍你自己。" }],
    });

    const reply = completion.choices[0]?.message?.content;
    if (reply) {
      return { success: true, message: reply.trim() };
    }
    return { success: true, message: "连接成功（无回复内容）" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "连接失败";
    return { error: msg };
  }
}

export async function generateQuestionsFromResume(params: {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  resumeContent: string;
}): Promise<{ questions?: AIGeneratedQuestion[]; error?: string }> {
  const { apiKey, baseUrl, modelName, resumeContent } = params;
  if (!apiKey?.trim()) return { error: "请先配置 API Key" };
  if (!resumeContent?.trim()) return { error: "请先在设置中保存简历" };

  try {
    const client = new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: baseUrl?.trim() || "https://api.minimax.io/v1",
    });

    const completion = await client.chat.completions.create({
      model: modelName?.trim() || "MiniMax-M2.1-lightning",
      messages: [
        {
          role: "system",
          content: `你是一个资深的面试官。根据简历生成 5-6 个原子化、具体化的面试题。

【核心原则：原子化问题】
每个问题里只包含一个方向，例如定价问题只问定价，问竞争策略就只问竞争，禁止生成复合型问题。如果一个项目涉及多个挑战（如从 0 到 1、商业化、团队管理、差异化竞争），请将它们拆分为多个独立的面试题，每个题目只聚焦一个具体点。

【具体化指令】
不要问宽泛问题，例如：「请介绍一下这个项目。」
要问具体问题，例如：
- 「在项目冷启动阶段，你是如何获取前 100 个种子用户的？」
- 「面对竞品 X 的功能，你在这个项目中做了哪些具体的差异化设计？」
- 「在 [简历中的具体指标] 指标上，你采用了哪些策略？」

【按照不同类型给问题分类】
我目前想到的是三类，个人类（例如为何转行做产品经理）、故事类（例如遇到的最有挑战的项目、做的失败的项目、做的 0-1 的项目）、战略类（例如如何定价、如何形成竞争差异）

【输出格式】
必须只返回一个 JSON 数组或对象，禁止其他文字或 markdown 代码块。

每个题目对象必须包含以下字段：
- title: 必须是 4-10 个字的短标题，提炼问题的核心考点（例如：「团队冲突解决」「竞品差异化策略」「从0到1的冷启动」）
- content: 完整的问题描述，包含具体的场景
- category: 分类（如：个人类、战略类、故事类
- answer_hint: 简短的参考思路

【JSON 格式示例】
[
  {
    "title": "从0到1的冷启动",
    "content": "在资源有限的情况下，你是如何获取首批 1000 个种子用户的？请结合数据说明。",
    "category": "故事类",
    "answer_hint": "可从渠道选择、数据指标、迭代策略等角度回答"
  }
]`,
        },
        { role: "user", content: `以下是候选人简历：\n\n${resumeContent}` },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { error: "AI 未返回有效内容" };

    const { questions, parseError, rawPreview } = parseAIResponse(content);
    if (!questions.length) {
      console.error("AI 原始返回:", content);
      const preview = rawPreview || content?.slice(0, 300) || "";
      return {
        error: `无法解析 AI 返回的题目${parseError ? ` (${parseError})` : ""}。原始返回预览：${preview}`,
      };
    }

    return { questions };
  } catch (err) {
    console.error("AI generate error:", err);
    const msg = err instanceof Error ? err.message : "AI 调用失败";
    return { error: msg };
  }
}

export type Question = {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty: number;
  answer: string | null;
  source: string;
  interviewCount: number;
  isUserAnswered: boolean;
  createdAt: Date;
};

export async function getQuestionById(id: string): Promise<Question | null> {
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) return null;
  return {
    ...q,
    difficulty: q.difficulty,
    answer: q.answer,
    source: q.source,
  };
}

export async function getQuestions(): Promise<Question[]> {
  const questions = await prisma.question.findMany({
    orderBy: { createdAt: "desc" },
  });
  return questions.map((q) => ({
    ...q,
    difficulty: q.difficulty,
    answer: q.answer,
    source: q.source,
  }));
}

export async function getQuestionCount(): Promise<number> {
  return prisma.question.count();
}

export type DashboardStats = {
  totalQuestions: number;
  preparedCount: number;
  totalInterviews: number;
  progressPercentage: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalQuestions, preparedResult, interviewSum] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { isUserAnswered: true } }),
    prisma.question.aggregate({ _sum: { interviewCount: true } }),
  ]);

  const preparedCount = preparedResult;
  const totalInterviews = interviewSum._sum.interviewCount ?? 0;
  const progressPercentage =
    totalQuestions > 0 ? Math.round((preparedCount / totalQuestions) * 100) : 0;

  return {
    totalQuestions,
    preparedCount,
    totalInterviews,
    progressPercentage,
  };
}

export async function addQuestion(formData: FormData) {
  const title = (formData.get("title") as string)?.trim() || "未命名题目";
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const answer = (formData.get("answer") as string) || null;
  const difficulty = parseInt((formData.get("difficulty") as string) || "1", 10) || 1;

  if (!content?.trim() || !category?.trim()) {
    return { error: "请填写题目标题、内容和分类" };
  }

  await prisma.question.create({
    data: {
      title,
      content: content.trim(),
      category: category.trim(),
      answer: answer?.trim() || null,
      difficulty: Math.min(5, Math.max(1, difficulty)),
      source: "手动录入",
    },
  });

  revalidatePath("/questions");
  return { success: true };
}

export async function updateQuestion(params: {
  id: string;
  title: string;
  content: string;
  category: string;
}): Promise<{ success?: boolean; error?: string }> {
  const { id, title, content, category } = params;
  if (!id?.trim()) return { error: "题目 ID 无效" };
  if (!title?.trim() || !content?.trim() || !category?.trim()) return { error: "请填写题目标题、内容和分类" };

  try {
    await prisma.question.update({
      where: { id },
      data: {
        title: title.trim(),
        content: content.trim(),
        category: category.trim(),
        isUserAnswered: true,
      },
    });
    revalidatePath("/questions");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "更新失败" };
  }
}

export async function deleteQuestion(id: string): Promise<{ success?: boolean; error?: string }> {
  if (!id?.trim()) return { error: "题目 ID 无效" };

  try {
    await prisma.question.delete({ where: { id } });
    revalidatePath("/questions");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "删除失败" };
  }
}

export async function bulkUpdateCategory(
  ids: string[],
  newCategory: string
): Promise<{ success?: boolean; error?: string }> {
  if (!ids?.length) return { error: "请选择要修改的题目" };
  if (!newCategory?.trim()) return { error: "请输入新分类" };

  try {
    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { category: newCategory.trim() },
    });
    revalidatePath("/questions");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "批量更新失败" };
  }
}

export async function bulkDeleteQuestions(
  ids: string[]
): Promise<{ success?: boolean; error?: string }> {
  if (!ids?.length) return { error: "请选择要删除的题目" };

  try {
    await prisma.question.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/questions");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "批量删除失败" };
  }
}

export async function addQuestionsFromAI(
  questions: Array<{ title: string; content: string; category: string; difficulty: number; answer: string | null }>
) {
  if (!questions?.length) return { error: "没有可保存的题目" };

  await prisma.question.createMany({
    data: questions.map((q) => ({
      title: (q.title?.trim() || "未命名题目"),
      content: q.content.trim(),
      category: q.category.trim(),
      difficulty: Math.min(5, Math.max(1, q.difficulty)),
      answer: q.answer?.trim() || null,
      source: "AI生成",
    })),
  });

  revalidatePath("/questions");
  return { success: true };
}

// Resume (单例)
export async function getResume(): Promise<string | null> {
  const resume = await prisma.resume.findFirst({ orderBy: { updatedAt: "desc" } });
  return resume?.content ?? null;
}

export type InterviewReport = {
  evaluation_expression: string;
  evaluation_content: string;
  refined_answer: string;
};

export async function generateInterviewReport(params: {
  chatHistory: Array<{ role: string; content: string }>;
  questionId: string;
  questionContent: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}): Promise<{ report?: InterviewReport; error?: string }> {
  const { chatHistory, questionId, questionContent, apiKey, baseUrl, model } = params;
  if (!apiKey?.trim()) return { error: "请先在设置中配置 API Key" };
  if (!chatHistory?.length) return { error: "对话记录为空" };

  const chatText = chatHistory
    .map((m) => `【${m.role === "user" ? "候选人" : "面试官"}】\n${m.content}`)
    .join("\n\n");

  try {
    const client = new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: baseUrl?.trim() || "https://api.minimax.io/v1",
    });

    const completion = await client.chat.completions.create({
      model: model?.trim() || "MiniMax-M2.1-lightning",
      messages: [
        {
          role: "system",
          content: `你是一位资深面试教练。请根据以下面试对话记录，生成复盘报告。
必须只返回一个 JSON 对象，不要包含其他文字或 markdown 代码块。

【refined_answer 字段】请强制按照以下 Markdown 结构输出（不要用纯文本段落）：
### 1. 场景 (Situation): 简述背景。
### 2. 任务 (Task): 面临的核心挑战是什么。
### 3. 行动 (Action): 我具体做了什么（列出 1-2-3 点）。
### 4. 结果 (Result): 最终的数据表现或产出。

【evaluation_content 字段】内容深度点评时，重点点评候选人是否缺少了上述 STAR 环节（场景、任务、行动、结果）中的哪一个，以及覆盖程度如何。

格式：{"evaluation_expression":"表达技巧点评（语气、逻辑清晰度）","evaluation_content":"内容深度点评（是否覆盖 STAR 各环节、有无亮点）","refined_answer":"基于候选人回答整理润色后的标准答案，第一人称，必须严格按上述 Markdown 结构输出"}`,
        },
        {
          role: "user",
          content: `面试题目：${questionContent}\n\n对话记录：\n${chatText}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { error: "AI 未返回有效内容" };

    let jsonStr = content.trim();
    const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    if (!jsonStr.startsWith("{")) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) jsonStr = m[0];
    }
    jsonStr = tryFixJson(jsonStr);

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const report: InterviewReport = {
      evaluation_expression: String(parsed.evaluation_expression ?? ""),
      evaluation_content: String(parsed.evaluation_content ?? ""),
      refined_answer: String(parsed.refined_answer ?? ""),
    };

    await prisma.question.update({
      where: { id: questionId },
      data: { interviewCount: { increment: 1 } },
    });
    revalidatePath("/questions");
    revalidatePath(`/questions/${questionId}`);
    revalidatePath(`/interview/${questionId}`);

    return { report };
  } catch (err) {
    console.error("generateInterviewReport error:", err);
    return { error: err instanceof Error ? err.message : "生成报告失败" };
  }
}

export async function updateQuestionAnswer(
  id: string,
  answer: string
): Promise<{ success?: boolean; error?: string }> {
  if (!id?.trim()) return { error: "题目 ID 无效" };

  try {
    await prisma.question.update({
      where: { id },
      data: {
        answer: answer.trim() || null,
        isUserAnswered: true,
      },
    });
    revalidatePath("/questions");
    revalidatePath(`/interview/${id}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "保存失败" };
  }
}

export async function updateQuestionContentAndAnswer(params: {
  id: string;
  title: string;
  content: string;
  answer: string | null;
  category: string;
}): Promise<{ success?: boolean; error?: string }> {
  const { id, title, content, answer, category } = params;
  if (!id?.trim()) return { error: "题目 ID 无效" };
  if (!title?.trim()) return { error: "请填写题目标题" };
  if (!content?.trim()) return { error: "请填写题目内容" };
  if (!category?.trim()) return { error: "请填写分类" };

  try {
    await prisma.question.update({
      where: { id },
      data: {
        title: title.trim(),
        content: content.trim(),
        answer: answer?.trim() || null,
        category: category.trim(),
        isUserAnswered: true,
      },
    });
    revalidatePath("/questions");
    revalidatePath(`/questions/${id}`);
    revalidatePath(`/interview/${id}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "保存失败" };
  }
}

export async function saveResume(content: string) {
  const existing = await prisma.resume.findFirst({ orderBy: { updatedAt: "desc" } });
  if (existing) {
    await prisma.resume.update({
      where: { id: existing.id },
      data: { content },
    });
  } else {
    await prisma.resume.create({ data: { content } });
  }
  revalidatePath("/settings");
  return { success: true };
}
