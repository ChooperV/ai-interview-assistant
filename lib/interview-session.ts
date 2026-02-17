/**
 * 面试会话持久化：在点击「结束面试」之前，支持恢复未完成的面试
 */

const STORAGE_PREFIX = "interview_session_";
const ACTIVE_SESSION_KEY = "interview_session_active_question";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
};

export type InterviewDifficulty = "low" | "medium" | "high";

export type InterviewSession = {
  questionId: string;
  messages: StoredMessage[];
  difficulty?: InterviewDifficulty;
  timestamp: number;
};

function getStorageKey(questionId: string): string {
  return `${STORAGE_PREFIX}${questionId}`;
}

export function saveInterviewSession(
  questionId: string,
  messages: StoredMessage[],
  difficulty?: InterviewDifficulty
): void {
  if (typeof window === "undefined") return;
  if (messages.length === 0) return;
  try {
    const session: InterviewSession = {
      questionId,
      messages,
      difficulty,
      timestamp: Date.now(),
    };
    localStorage.setItem(getStorageKey(questionId), JSON.stringify(session));
    localStorage.setItem(ACTIVE_SESSION_KEY, questionId);
  } catch (e) {
    console.warn("Failed to save interview session:", e);
  }
}

export function loadInterviewSession(
  questionId: string
): InterviewSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(questionId));
    if (!raw) return null;
    const session = JSON.parse(raw) as InterviewSession;
    if (session.questionId !== questionId) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearInterviewSession(questionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getStorageKey(questionId));
    if (localStorage.getItem(ACTIVE_SESSION_KEY) === questionId) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch (e) {
    console.warn("Failed to clear interview session:", e);
  }
}

export function hasInterviewSession(questionId: string): boolean {
  return loadInterviewSession(questionId) !== null;
}

/** 获取当前有未完成面试的题目 ID（若有） */
export function getActiveSessionQuestionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(ACTIVE_SESSION_KEY);
    return id && hasInterviewSession(id) ? id : null;
  } catch {
    return null;
  }
}
