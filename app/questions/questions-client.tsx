"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Settings } from "lucide-react";
import {
  getQuestions,
  bulkUpdateCategory,
  bulkDeleteQuestions,
  type Question,
} from "@/app/actions";
import { AddQuestionDialog } from "./add-question-dialog";
import { AIGenerateDialog } from "./ai-generate-dialog";
import { QuestionCard } from "@/components/QuestionCard";
import { getActiveSessionQuestionId } from "@/lib/interview-session";

const CATEGORIES = ["HR", "技术", "产品思维", "其他"];

export function QuestionsClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  const [bulkCategoryInput, setBulkCategoryInput] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeSessionQuestionId, setActiveSessionQuestionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setActiveSessionQuestionId(getActiveSessionQuestionId());
  }, []);

  async function refetchQuestions() {
    try {
      const data = await getQuestions();
      setQuestions(data);
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    }
  }

  useEffect(() => {
    getQuestions()
      .then(setQuestions)
      .catch((err) => {
        console.error("Failed to fetch questions:", err);
        setFetchError(err instanceof Error ? err.message : "加载题目失败");
      });
  }, []);

  const categories = Array.from(
    new Set(questions.map((q) => q.category).filter(Boolean))
  ).sort();

  const filteredQuestions =
    activeTab === "all"
      ? questions
      : questions.filter((q) => q.category === activeTab);

  const currentTabIds = new Set(filteredQuestions.map((q) => q.id));
  const allCurrentSelected =
    currentTabIds.size > 0 &&
    Array.from(currentTabIds).every((id) => selectedIds.has(id));

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAllCurrent() {
    if (allCurrentSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentTabIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentTabIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  async function handleBulkUpdateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkCategoryInput.trim()) return;
    setBulkPending(true);
    const result = await bulkUpdateCategory(
      Array.from(selectedIds),
      bulkCategoryInput.trim()
    );
    if (result?.error) {
      setBulkPending(false);
      return;
    }
    setBulkCategoryOpen(false);
    setBulkCategoryInput("");
    setSelectedIds(new Set());
    setBulkPending(false);
    router.refresh();
    refetchQuestions();
  }

  async function handleBulkDelete() {
    setBulkPending(true);
    const result = await bulkDeleteQuestions(Array.from(selectedIds));
    if (result?.error) {
      setBulkPending(false);
      return;
    }
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    setBulkPending(false);
    router.refresh();
    refetchQuestions();
  }

  if (fetchError) {
    return (
      <div className="container py-8 px-6 sm:px-8 lg:px-12">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold text-destructive">加载失败</h2>
          <p className="mt-2 text-sm text-muted-foreground">{fetchError}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            请确保已运行: npx prisma db push
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container pb-24 py-8 px-6 sm:px-8 lg:px-12">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label="返回首页">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">面试题库</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings" aria-label="设置">
              <Settings className="size-4" />
            </Link>
          </Button>
          <AIGenerateDialog onSuccess={refetchQuestions} />
          <AddQuestionDialog onSuccess={refetchQuestions} />
        </div>
      </div>

      {activeSessionQuestionId && (
        <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-sm text-amber-800 dark:text-amber-200">
            您有未完成的面试，可点击恢复继续
          </span>
          <Button size="sm" asChild>
            <Link href={`/interview/${activeSessionQuestionId}`}>
              恢复面试
            </Link>
          </Button>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          暂无题目，点击右上角「添加题目」开始添加
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="all">全部</TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allCurrentSelected}
                  onCheckedChange={toggleSelectAllCurrent}
                />
                <label
                  htmlFor="select-all"
                  className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                >
                  全选当前页
                </label>
              </div>
            </div>

            <TabsContent value="all" className="mt-4">
              <div className="grid auto-rows-[260px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    selected={selectedIds.has(q.id)}
                    onSelectChange={(checked) => toggleSelect(q.id, checked)}
                    onMutate={refetchQuestions}
                  />
                ))}
              </div>
            </TabsContent>
            {categories.map((cat) => (
              <TabsContent key={cat} value={cat} className="mt-4">
                <div className="grid auto-rows-[260px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {questions
                    .filter((q) => q.category === cat)
                    .map((q) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        selected={selectedIds.has(q.id)}
                        onSelectChange={(checked) => toggleSelect(q.id, checked)}
                        onMutate={refetchQuestions}
                      />
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedIds.size} 项
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkCategoryInput("");
                  setBulkCategoryOpen(true);
                }}
              >
                批量修改分类
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                批量删除
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批量修改分类</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkUpdateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-category">新分类名称 *</Label>
              <Input
                id="bulk-category"
                value={bulkCategoryInput}
                onChange={(e) => setBulkCategoryInput(e.target.value)}
                placeholder="如：HR、技术、产品思维"
                list="bulk-categories"
                required
              />
              <datalist id="bulk-categories">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkCategoryOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={bulkPending}>
                {bulkPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.size} 道题目吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">取消</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkPending}>
                {bulkPending ? "删除中..." : "确认删除"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
