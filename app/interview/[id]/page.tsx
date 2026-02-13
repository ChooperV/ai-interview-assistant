import { notFound } from "next/navigation";
import { getQuestionById, getResume } from "@/app/actions";
import { InterviewRoom } from "./interview-room";

export const dynamic = "force-dynamic";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [question, resume] = await Promise.all([
    getQuestionById(id),
    getResume(),
  ]);

  if (!question) notFound();

  return (
    <InterviewRoom
      question={question}
      resume={resume ?? ""}
    />
  );
}
