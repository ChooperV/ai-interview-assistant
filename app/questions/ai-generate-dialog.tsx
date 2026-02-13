"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import { generateQuestionsFromResume, addQuestionsFromAI, getResume } from "@/app/actions";
import type { AIGeneratedQuestion } from "@/app/actions";

const STORAGE_KEYS = {
  apiKey: "minimax_api_key",
  baseUrl: "minimax_base_url",
  modelName: "minimax_model_name",
} as const;

const DEFAULT_BASE_URL = "https://api.minimax.io/v1";
const DEFAULT_MODEL = "MiniMax-M2.1-lightning";

export function AIGenerateDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AIGeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const router = useRouter();

  async function handleGenerate() {
    setError(null);
    setQuestions([]);
    setSelected(new Set());
    setGenerating(true);

    if (typeof window === "undefined") {
      setError("请在浏览器中操作");
      setGenerating(false);
      return;
    }

    const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
    const baseUrl = localStorage.getItem(STORAGE_KEYS.baseUrl) || DEFAULT_BASE_URL;
    const modelName = localStorage.getItem(STORAGE_KEYS.modelName) || DEFAULT_MODEL;

    const resumeContent = await getResume();
    const result = await generateQuestionsFromResume({
      apiKey: apiKey ?? "",
      baseUrl,
      modelName,
      resumeContent: resumeContent ?? "",
    });

    setGenerating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.questions?.length) {
      setQuestions(result.questions);
      setSelected(new Set(result.questions.map((_, i) => i)));
    }
  }

  async function handleSave() {
    const toSave = questions
      .filter((_, i) => selected.has(i))
      .map((q) => ({
        title: q.title || "未命名题目",
        content: q.content,
        category: q.category,
        difficulty: q.difficulty,
        answer: q.answer_hint || null,
      }));

    if (!toSave.length) {
      setError("请至少勾选一道题目");
      return;
    }

    setSaving(true);
    setError(null);
    const result = await addQuestionsFromAI(toSave);
    setSaving(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setQuestions([]);
    setSelected(new Set());
    router.refresh();
    onSuccess?.();
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(questions.map((_, i) => i)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="size-4" />
          基于简历生成题目
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>AI 生成面试题</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4">
          {!questions.length && !generating && (
            <p className="text-sm text-muted-foreground">
              请先在「设置与简历」中配置 API Key 和保存简历，然后点击生成
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {generating && (
            <p className="text-sm text-muted-foreground">AI 正在生成题目...</p>
          )}
          {questions.length > 0 && (
            <>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  取消全选
                </Button>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggleSelect(i)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{q.title || "未命名题目"}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{q.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.category} · 难度 {q.difficulty}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          {!questions.length ? (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "生成中..." : "生成题目"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setQuestions([]);
                  setSelected(new Set());
                  setError(null);
                }}
              >
                重新生成
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : `保存 (${selected.size})`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
