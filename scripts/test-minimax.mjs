/**
 * MiniMax API 调用测试脚本
 * 用法: API_KEY=你的key node scripts/test-minimax.mjs
 */

import OpenAI from "openai";

const apiKey = process.env.API_KEY || process.env.MINIMAX_API_KEY;
const baseUrl = process.env.BASE_URL || "https://api.minimax.io/v1";
const model = process.env.MODEL || "MiniMax-M2.1-lightning";

if (!apiKey) {
  console.error("请设置 API_KEY 环境变量，例如: API_KEY=你的key node scripts/test-minimax.mjs");
  process.exit(1);
}

async function test() {
  console.log(">>> 测试 MiniMax API 连接...");
  console.log("   Base URL:", baseUrl);
  console.log("   Model:", model);

  const client = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: baseUrl,
  });

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "user", content: "你好，请用一句话介绍你自己。" },
      ],
    });

    const reply = completion.choices[0]?.message?.content;
    if (reply) {
      console.log("\n✅ 调用成功！AI 回复:");
      console.log("  ", reply.trim());
    } else {
      console.log("\n⚠️ 调用成功但无回复内容:", completion);
    }
  } catch (err) {
    console.error("\n❌ 调用失败:", err.message);
    if (err.status) console.error("   状态码:", err.status);
    process.exit(1);
  }
}

test();
