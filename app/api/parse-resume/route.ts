import "pdf-parse/worker";
import { PDFParse, VerbosityLevel } from "pdf-parse";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "请上传 PDF 文件" },
        { status: 400 }
      );
    }

    const contentType = file.type;
    if (contentType !== "application/pdf") {
      return NextResponse.json(
        { error: "仅支持 PDF 格式" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    const parser = new PDFParse({
      data: arrayBuffer,
      verbosity: VerbosityLevel.WARNINGS,
    });
    const result = await parser.getText();
    await parser.destroy();

    const text = result?.text ?? "";
    if (!text.trim()) {
      return NextResponse.json(
        { error: "未能从 PDF 中提取到文本，请检查文件" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Parse resume error:", err);
    return NextResponse.json(
      { error: "解析失败，请检查文件" },
      { status: 500 }
    );
  }
}
