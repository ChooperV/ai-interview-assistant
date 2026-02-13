"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { Question } from "@/app/actions";
import { deleteQuestion } from "@/app/actions";

interface QuestionCardProps {
  question: Question;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onMutate?: () => void;
}

export function QuestionCard({ question, selected, onSelectChange, onMutate }: QuestionCardProps) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const isPrepared = question.isUserAnswered === true;

  async function handleDelete() {
    if (!confirm("确定要删除这道题目吗？")) return;
    setPending(true);
    const result = await deleteQuestion(question.id);
    if (!result?.error) {
      router.refresh();
      onMutate?.();
    }
    setPending(false);
  }

  return (
    <>
      <Card className="flex h-[260px] w-full flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <Link href={`/questions/${question.id}`} className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="relative shrink-0 space-y-2 pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-h-[2.5rem] min-w-0 flex-1 flex-wrap items-center gap-2">
                <h3 className="min-h-[1.5rem] min-w-0 flex-1 truncate text-lg font-bold">
                  {question.title ?? "未命名题目"}
                </h3>
                <Badge variant="secondary" className="w-fit shrink-0">
                  {question.category}
                </Badge>
              </div>
              {onSelectChange && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected ?? false}
                    onCheckedChange={(v) => onSelectChange(v === true)}
                    className="mt-0.5 shrink-0"
                    aria-label={`选择题目 ${question.id}`}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={isPrepared ? "default" : "secondary"}
                className={
                  isPrepared
                    ? "bg-green-600/90 hover:bg-green-600 text-white"
                    : "bg-amber-500/90 hover:bg-amber-500 text-white"
                }
              >
                {isPrepared ? "已准备" : "待完善"}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                🔥 模拟 {(question.interviewCount ?? 0)} 次
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="min-h-[2.5rem] flex-1 overflow-y-auto pb-4">
            <p className="line-clamp-2 min-h-[2.5rem] whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {question.content}
            </p>
          </CardContent>
        </Link>
        <CardFooter className="flex shrink-0 flex-wrap items-center gap-2 border-t pt-4">
          <Button size="sm" asChild>
            <Link href={`/interview/${question.id}`}>
              开始模拟面试
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={pending}
            aria-label="删除"
          >
            <Trash2 className="size-4" />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
