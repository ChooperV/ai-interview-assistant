import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getResume } from "@/app/actions";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const initialResume = await getResume();
  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/questions" className="flex items-center gap-1.5" aria-label="返回题库">
            <ArrowLeft className="size-4" />
            返回题库
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">设置与简历</h1>
      </div>
      <SettingsClient initialResume={initialResume ?? ""} />
    </div>
  );
}
