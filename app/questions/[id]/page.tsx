import { notFound } from "next/navigation";
import { getQuestionById } from "@/app/actions";
import { QuestionDetailClient } from "./question-detail-client";

export const dynamic = "force-dynamic";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getQuestionById(id);
  if (!question) notFound();

  return <QuestionDetailClient question={question} />;
}
