"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Editor } from "@/components/Editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import type { Question } from "@/app/actions";
import {
  generateInterviewReport,
  updateQuestionAnswer,
  type InterviewReport,
} from "@/app/actions";
import {
  saveInterviewSession,
  loadInterviewSession,
  clearInterviewSession,
  type StoredMessage,
  type InterviewDifficulty,
} from "@/lib/interview-session";

const STORAGE_KEYS = {
  apiKey: "minimax_api_key",
  baseUrl: "minimax_base_url",
  modelName: "minimax_model_name",
} as const;
const DEFAULT_BASE_URL = "https://api.minimax.io/v1";
const DEFAULT_MODEL = "MiniMax-M2.1-lightning";

const HEADER_HEIGHT_PX = 56; // py-3 约 56px

type Props = { question: Question; resume: string };

export function InterviewRoom({ question, resume }: Props) {
  const [mounted, setMounted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const configRef = useRef({
    apiKey: "",
    baseUrl: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
    difficulty: "low" as InterviewDifficulty,
  });

  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("low");

  const { messages, sendMessage, status, error: chatError, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        ...configRef.current,
        question: question.content,
        resume,
        difficulty: configRef.current.difficulty,
      }),
    }),
  });

  const [input, setInput] = useState("");
  const [inputHtml, setInputHtml] = useState("");
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [refinedAnswer, setRefinedAnswer] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const key = localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
    const url = localStorage.getItem(STORAGE_KEYS.baseUrl) ?? DEFAULT_BASE_URL;
    const modelName = localStorage.getItem(STORAGE_KEYS.modelName) ?? DEFAULT_MODEL;
    setApiKey(key);
    setBaseUrl(url);
    setModel(modelName);
    configRef.current = { ...configRef.current, apiKey: key, baseUrl: url, model: modelName };
  }, []);

  useEffect(() => {
    configRef.current.difficulty = difficulty;
  }, [difficulty]);

  // 恢复未完成的面试
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const session = loadInterviewSession(question.id);
    if (session?.messages?.length) {
      setMessages(session.messages);
      if (session.difficulty) {
        setDifficulty(session.difficulty);
        configRef.current.difficulty = session.difficulty;
      }
    }
  }, [mounted, question.id, setMessages]);

  // 持久化面试对话（结束面试前）
  useEffect(() => {
    if (!mounted || interviewEnded || messages.length === 0) return;
    const toStore: StoredMessage[] = messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts.map((p) => ({ ...p })),
    }));
    saveInterviewSession(question.id, toStore, difficulty);
  }, [mounted, interviewEnded, question.id, messages, difficulty]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming") return;
    sendMessage({ text });
    setInput("");
    setInputHtml("");
  };

  const handleEditorSubmit = (ed: { getText: () => string; getHTML: () => string }) => {
    const text = ed.getText().trim();
    if (!text || status === "streaming") return;
    sendMessage({ text });
    setInput("");
    setInputHtml("");
  };

  const handleEndInterview = async () => {
    if (interviewEnded) return;
    setInterviewEnded(true);
    clearInterviewSession(question.id);
    setReportLoading(true);
    setReportError(null);

    const chatHistory = messages.map((msg) => {
      const content = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      return { role: msg.role, content };
    });

    const result = await generateInterviewReport({
      chatHistory,
      questionId: question.id,
      questionContent: question.content,
      apiKey: configRef.current.apiKey,
      baseUrl: configRef.current.baseUrl,
      model: configRef.current.model,
    });

    setReportLoading(false);
    if (result.error) {
      setReportError(result.error);
      setInterviewEnded(false);
      return;
    }
    if (result.report) {
      setReport(result.report);
      setRefinedAnswer(result.report.refined_answer);
    }
  };

  const handleSaveAnswer = async () => {
    if (!refinedAnswer.trim()) return;
    const result = await updateQuestionAnswer(question.id, refinedAnswer);
    if (result.error) {
      setReportError(result.error);
      return;
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const renderMessageList = () => (
    <>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <div className="space-y-1 text-sm break-words">
              {msg.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <p
                      key={`${msg.id}-${i}`}
                      className="whitespace-pre-wrap break-words"
                    >
                      {part.text}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      ))}
      {status === "streaming" && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5">
            <span className="inline-block h-4 w-2 animate-pulse rounded-full bg-muted-foreground/50" />
          </div>
        </div>
      )}
    </>
  );

  const renderReportCard = () =>
    report && (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">面试复盘报告</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="review">
            <TabsList>
              <TabsTrigger value="review">点评</TabsTrigger>
              <TabsTrigger value="answer">整理后的答案</TabsTrigger>
            </TabsList>
            <TabsContent value="review" className="mt-4 space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  表达技巧
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {report.evaluation_expression || "—"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  内容深度
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {report.evaluation_content || "—"}
                </p>
              </div>
            </TabsContent>
            <TabsContent value="answer" className="mt-4 space-y-4">
              <Textarea
                value={refinedAnswer}
                onChange={(e) => setRefinedAnswer(e.target.value)}
                placeholder="整理后的答案"
                rows={8}
                className="resize-none"
              />
              <Button
                size="sm"
                onClick={handleSaveAnswer}
                disabled={saveSuccess}
              >
                {saveSuccess ? "保存成功" : "保存为该题参考答案"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 固定顶部栏：返回 + 标题 + 结束面试 */}
      <header
        className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ height: HEADER_HEIGHT_PX }}
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/questions/${question.id}`} className="flex items-center gap-1.5" aria-label="返回题目详情">
              <ArrowLeft className="size-4" />
              返回
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">模拟面试</h1>
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              难度：{difficulty === "low" ? "低" : difficulty === "medium" ? "中" : "高"}
            </Badge>
          )}
        </div>
        {!interviewEnded && messages.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndInterview}
            disabled={status === "streaming"}
          >
            结束面试
          </Button>
        )}
      </header>

      {/* 左侧：固定题目卡片（仅桌面端） */}
      <aside
        className="fixed left-0 top-14 bottom-0 hidden w-[30%] overflow-y-auto border-r bg-background p-4 md:block"
      >
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-2">
            <Badge variant="secondary" className="w-fit">
              {question.category}
            </Badge>
            <h2 className="mt-2 text-sm font-medium">面试题目</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.content}
            </p>
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAnswer((v) => !v)}
              >
                {showAnswer ? "收起参考答案" : "查看参考答案"}
              </Button>
              {showAnswer && (
                <div className="mt-2 rounded-lg border bg-muted/50 p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">
                    {question.answer || "暂无参考答案"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* 移动端：题目卡片在顶部流式展示 */}
      <div className="block border-b bg-background p-4 md:hidden">
        <Card>
          <CardHeader className="shrink-0 pb-2">
            <Badge variant="secondary" className="w-fit">
              {question.category}
            </Badge>
            <h2 className="mt-2 text-sm font-medium">面试题目</h2>
          </CardHeader>
          <CardContent className="max-h-[40vh] space-y-4 overflow-y-auto">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.content}
            </p>
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowAnswer((v) => !v)}
              >
                {showAnswer ? "收起参考答案" : "查看参考答案"}
              </Button>
              {showAnswer && (
                <div className="mt-2 rounded-lg border bg-muted/50 p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">
                    {question.answer || "暂无参考答案"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 右侧：聊天区域 */}
      <main
        className="flex flex-col overflow-hidden md:ml-[30%]"
        style={{
          marginTop: HEADER_HEIGHT_PX,
          height: `calc(100vh - ${HEADER_HEIGHT_PX}px)`,
        }}
      >
          {reportLoading && (
            <div className="flex flex-1 items-center justify-center p-8">
              <p className="text-muted-foreground">正在生成面试复盘报告...</p>
            </div>
          )}
          {(reportError || chatError) && (
            <div className="mx-4 mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {reportError || chatError?.message}
            </div>
          )}
          <div className={`flex-1 min-h-0 overflow-y-auto p-4 ${reportLoading ? "hidden" : ""}`}>
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.length === 0 && !report && (
                <div className="space-y-4">
                  {apiKey && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="mb-3 text-sm font-medium text-foreground">面试难度</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={difficulty === "low" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDifficulty("low")}
                        >
                          低
                        </Button>
                        <Button
                          variant={difficulty === "medium" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDifficulty("medium")}
                        >
                          中
                        </Button>
                        <Button
                          variant={difficulty === "high" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDifficulty("high")}
                        >
                          高
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {difficulty === "low" && "面试官温和友好，以鼓励和引导为主"}
                        {difficulty === "medium" && "面试官专业中肯，适度追问和挑战"}
                        {difficulty === "high" && "面试官严厉苛刻，模拟高压面试"}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {!apiKey ? (
                      <>
                        请先在
                        <Link href="/settings" className="underline">
                          设置
                        </Link>
                        中配置 API Key 后再开始模拟面试。
                      </>
                    ) : (
                      "面试官已就绪，请开始回答题目。支持富文本编辑，Enter 发送。"
                    )}
                  </div>
                </div>
              )}

              {/* 面试结束后：报告在上，对话记录在下 */}
              {interviewEnded && report ? (
                <>
                  {renderReportCard()}
                  <h3 className="text-sm font-medium text-muted-foreground">
                    📜 面试对话记录
                  </h3>
                  {renderMessageList()}
                </>
              ) : (
                renderMessageList()
              )}
            </div>
          </div>

          <div className={`shrink-0 border-t bg-background p-4 ${reportLoading ? "hidden" : ""}`}>
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-2xl gap-2 items-end"
            >
              <div className="flex-1 min-w-0">
                <Editor
                  value={inputHtml}
                  onChange={(html) => {
                    setInputHtml(html);
                    const tmp = document.createElement("div");
                    tmp.innerHTML = html;
                    setInput(tmp.textContent || tmp.innerText || "");
                  }}
                  placeholder="输入你的回答...（Enter 发送，Shift+Enter 换行）"
                  disabled={status === "streaming" || interviewEnded}
                  minHeight="min-h-[44px]"
                  maxHeight="max-h-[120px]"
                  textSizeClass="prose prose-sm"
                  onSubmit={handleEditorSubmit}
                  submitKey="Enter"
                  className="flex-1"
                  showToolbar={true}
                />
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || status === "streaming" || !apiKey || interviewEnded}
              >
                发送
              </Button>
            </form>
          </div>
        </main>
    </div>
  );
}
