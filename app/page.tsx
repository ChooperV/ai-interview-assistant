import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Layers, Library, Settings, Target } from "lucide-react";
import { getDashboardStats } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <main className="flex w-full max-w-2xl flex-col items-center gap-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
          面试助手
        </h1>
        <span className="text-sm text-muted-foreground">
          Interview Assistant
        </span>
        <p className="text-lg text-muted-foreground">
          刷题备考 · 模拟面试 · 本地运行，数据安心
        </p>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <Layers className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                {stats.totalQuestions}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                当前题库总容量
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Target className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                {stats.progressPercentage}%
              </p>
              <Progress
                value={stats.progressPercentage}
                className="mt-2 h-2 [&_[data-slot=progress-indicator]]:bg-green-600"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {stats.preparedCount}/{stats.totalQuestions} 题已完成标准答案
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Activity className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                {stats.totalInterviews}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                累计模拟面试次数
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <Button
            asChild
            size="lg"
            className="h-16 w-full text-xl font-semibold"
          >
            <Link href="/questions" className="flex items-center justify-center gap-3">
              <Library className="size-6" />
              进入题库
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="h-12 w-full text-base"
          >
            <Link href="/settings" className="flex items-center justify-center gap-2">
              <Settings className="size-5" />
              设置与简历
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
