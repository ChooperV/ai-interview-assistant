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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { addQuestion } from "@/app/actions";

const CATEGORIES = ["HR", "技术", "产品思维", "其他"];

export function AddQuestionDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await addQuestion(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setOpen(false);
    form.reset();
    setPending(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          添加题目
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加题目</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">题目标题 *</Label>
            <Input
              id="title"
              name="title"
              placeholder="4-8 个字，提炼核心考点，如：定价策略"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">题目内容 *</Label>
            <Textarea
              id="content"
              name="content"
              placeholder="请输入题目内容"
              required
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类 *</Label>
            <Input
              id="category"
              name="category"
              placeholder="如：HR、技术、产品思维"
              list="categories"
              required
            />
            <datalist id="categories">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer">参考答案（可选）</Label>
            <Textarea
              id="answer"
              name="answer"
              placeholder="请输入参考答案"
              rows={6}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "提交中..." : "添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
