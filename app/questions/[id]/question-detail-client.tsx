"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Editor } from "@/components/Editor";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import type { Question } from "@/app/actions";
import { updateQuestionContentAndAnswer } from "@/app/actions";

const CATEGORIES = ["HR", "技术", "产品思维", "其他"];

function isHtml(text: string): boolean {
  return text.trim().startsWith("<") && text.includes(">");
}

function RichContent({ content }: { content: string }) {
  if (!content) return <p className="text-muted-foreground">暂无内容</p>;
  if (isHtml(content)) {
    return (
      <div
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

interface QuestionDetailClientProps {
  question: Question;
}

export function QuestionDetailClient({ question: initialQuestion }: QuestionDetailClientProps) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialQuestion);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(question.title ?? "未命名题目");
  const [editContent, setEditContent] = useState(question.content);
  const [editAnswer, setEditAnswer] = useState(question.answer ?? "");
  const [editCategory, setEditCategory] = useState(question.category);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function isEmptyHtml(html: string): boolean {
    if (!html?.trim()) return true;
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return !stripped;
  }

  async function handleSave() {
    if (!editTitle.trim() || isEmptyHtml(editContent) || !editCategory.trim()) return;
    setError(null);
    setPending(true);
    const result = await updateQuestionContentAndAnswer({
      id: question.id,
      title: editTitle.trim(),
      content: editContent.trim(),
      answer: (editAnswer.trim() && !isEmptyHtml(editAnswer)) ? editAnswer.trim() : null,
      category: editCategory.trim(),
    });
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setQuestion((prev) => ({
      ...prev,
      title: editTitle.trim(),
      content: editContent.trim(),
      answer: (editAnswer.trim() && !isEmptyHtml(editAnswer)) ? editAnswer.trim() : null,
      category: editCategory.trim(),
    }));
    setEditing(false);
    setPending(false);
    router.refresh();
  }

  function startEdit() {
    setEditTitle(question.title ?? "未命名题目");
    setEditContent(question.content);
    setEditAnswer(question.answer ?? "");
    setEditCategory(question.category);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditTitle(question.title ?? "未命名题目");
    setEditContent(question.content);
    setEditAnswer(question.answer ?? "");
    setEditCategory(question.category);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="fixed left-0 right-0 top-0 z-50 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/questions" className="flex items-center gap-1.5">
                <ArrowLeft className="size-4" />
                返回题库
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">题目详情</h1>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <Button size="sm" asChild>
                  <Link href={`/interview/${question.id}`}>
                    开始模拟面试
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="mr-1.5 size-4" />
                  编辑
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={pending}>
                  <X className="mr-1 size-4" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={pending || !editTitle.trim() || isEmptyHtml(editContent) || !editCategory.trim()}
                >
                  <Check className="mr-1 size-4" />
                  {pending ? "保存中..." : "保存"}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container pt-16 pb-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {editing ? (
            /* 编辑模式：题目、答案、分类统一编辑，带 Markdown 预览 */
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">编辑题目</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 题目标题 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-title">题目标题 *</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="4-8 个字，提炼核心考点"
                  />
                </div>
                {/* 分类 */}
                <div className="space-y-2">
                  <Label htmlFor="edit-category">分类 *</Label>
                  <Input
                    id="edit-category"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="如：HR、技术、产品思维"
                    list="edit-categories"
                  />
                  <datalist id="edit-categories">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* 题目内容：所见即所得编辑 */}
                <div className="space-y-2">
                  <Label>题目内容 *</Label>
                  <Editor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="请输入题目内容..."
                    minHeight="min-h-[200px]"
                    showToolbar={true}
                  />
                </div>

                {/* 标准答案：所见即所得编辑 */}
                <div className="space-y-2">
                  <Label>标准答案</Label>
                  <Editor
                    value={editAnswer}
                    onChange={setEditAnswer}
                    placeholder="请输入标准答案（可选）..."
                    minHeight="min-h-[300px]"
                    showToolbar={true}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            /* 展示模式 */
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold">{question.title ?? "未命名题目"}</h2>
                    <Badge variant="secondary" className="w-fit">
                      {question.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <RichContent content={question.content} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">标准答案</h2>
                </CardHeader>
                <CardContent>
                  {question.answer ? (
                    <RichContent content={question.answer} />
                  ) : (
                    <p className="text-muted-foreground">暂无标准答案</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
