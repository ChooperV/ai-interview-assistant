"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveResume, testMinimaxConnection } from "@/app/actions";

const STORAGE_KEYS = {
  apiKey: "minimax_api_key",
  baseUrl: "minimax_base_url",
  modelName: "minimax_model_name",
} as const;

// 平台配置（含 Coding Plan 订阅计划）
const PLATFORMS = {
  // 国际用户 / Coding Plan：api.minimax.io
  new: { baseUrl: "https://api.minimax.io/v1", model: "MiniMax-M2.1-lightning" },
  // 中国用户 / Coding Plan：api.minimaxi.com
  china: { baseUrl: "https://api.minimaxi.com/v1", model: "MiniMax-M2.1-lightning" },
  old: { baseUrl: "https://api.minimax.chat/v1", model: "abab6.5s-chat" },
} as const;
const DEFAULT_BASE_URL = PLATFORMS.new.baseUrl;
const DEFAULT_MODEL = PLATFORMS.new.model;

type Props = { initialResume: string };

export function SettingsClient({ initialResume }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [resumeContent, setResumeContent] = useState(initialResume);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setResumeContent(initialResume);
  }, [initialResume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setApiKey(localStorage.getItem(STORAGE_KEYS.apiKey) ?? "");
    setBaseUrl(localStorage.getItem(STORAGE_KEYS.baseUrl) ?? DEFAULT_BASE_URL);
    setModelName(localStorage.getItem(STORAGE_KEYS.modelName) ?? DEFAULT_MODEL);
  }, []);

  function saveAIConfig() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
    localStorage.setItem(STORAGE_KEYS.baseUrl, baseUrl || DEFAULT_BASE_URL);
    localStorage.setItem(STORAGE_KEYS.modelName, modelName || DEFAULT_MODEL);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTestConnection() {
    setTestResult(null);
    setTesting(true);
    const result = await testMinimaxConnection({
      apiKey: apiKey.trim(),
      baseUrl: (baseUrl || DEFAULT_BASE_URL).trim(),
      modelName: (modelName || DEFAULT_MODEL).trim(),
    });
    setTesting(false);
    if (result.error) {
      setTestResult(`❌ ${result.error}。若为 2049：请确认 Key 来源，尝试切换上方平台按钮后重试。`);
    } else {
      setTestResult(`✅ 连接成功！AI 回复: ${result.message}`);
    }
  }

  async function handleSaveResume() {
    setPending(true);
    await saveResume(resumeContent);
    setPending(false);
    router.refresh();
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setParseLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "解析失败，请检查文件");
      }
      const text = data.text ?? "";
      setPending(true);
      await saveResume(text);
      setPending(false);
      setUploadedFileName(file.name);
      router.refresh();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "解析失败，请检查文件");
    } finally {
      setParseLoading(false);
      e.target.value = "";
    }
  }

  return (
    <Tabs defaultValue="ai" className="w-full max-w-2xl">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ai">AI 配置</TabsTrigger>
        <TabsTrigger value="resume">我的简历</TabsTrigger>
      </TabsList>
      <TabsContent value="ai" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>MiniMax API 配置</CardTitle>
            <CardDescription>
              配置保存在浏览器 localStorage。Coding Plan 订阅：国际用 minimax.io，国内用 minimaxi.com。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBaseUrl(PLATFORMS.new.baseUrl);
                  setModelName(PLATFORMS.new.model);
                }}
              >
                Coding Plan（国际 io）
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBaseUrl(PLATFORMS.china.baseUrl);
                  setModelName(PLATFORMS.china.model);
                }}
              >
                Coding Plan（国内 xi）
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBaseUrl(PLATFORMS.old.baseUrl);
                  setModelName(PLATFORMS.old.model);
                }}
              >
                旧版 minimax.chat
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key（请勿含首尾空格）</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="请输入 MiniMax API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder={DEFAULT_BASE_URL}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name</Label>
              <Input
                id="modelName"
                placeholder={DEFAULT_MODEL}
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveAIConfig}>
                {saved ? "已保存" : "保存到本地"}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !apiKey.trim()}
              >
                {testing ? "测试中..." : "测试连接"}
              </Button>
            </div>
            {testResult && (
              <p className={`text-sm ${testResult.startsWith("✅") ? "text-green-600" : "text-destructive"}`}>
                {testResult}
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="resume" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>我的简历</CardTitle>
            <CardDescription>粘贴简历内容或上传 PDF，支持 Markdown。用于 AI 生成针对性面试题</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="sr-only"
                id="pdf-upload"
                aria-label="上传 PDF 简历"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={parseLoading}
              >
                {parseLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    正在解析...
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    上传 PDF 简历
                  </>
                )}
              </Button>
              {parseError && (
                <span className="text-sm text-destructive">{parseError}</span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="resume">简历内容</Label>
              {uploadedFileName ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="text-sm text-muted-foreground">
                    已上传：{uploadedFileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 text-muted-foreground"
                    onClick={() => setUploadedFileName(null)}
                  >
                    手动编辑
                  </Button>
                </div>
              ) : (
                <Textarea
                  id="resume"
                  placeholder="在此粘贴您的简历文本..."
                  value={resumeContent}
                  onChange={(e) => setResumeContent(e.target.value)}
                  rows={16}
                  className="font-mono text-sm"
                />
              )}
            </div>
            {!uploadedFileName && (
              <Button onClick={handleSaveResume} disabled={pending}>
                {pending ? "保存中..." : "保存简历"}
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
