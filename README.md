# 🤖 AI Interview Assistant (AI 面试助手)

> 一个基于 Next.js + MiniMax AI（你可以替换成任何 AI）构建的智能化面试备战平台。
> 专为 PM 和开发者设计，提供从简历解析、题目生成到模拟面试的全流程闭环体验。

![Project Status](https://img.shields.io/badge/Status-Beta-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-5A67D8)
![AI](https://img.shields.io/badge/AI-MiniMax-green)

## ✨ 核心功能 (Features)

### 1. 🎯 智能题目生成
- **简历解析**: 集成 PDF 解析引擎，自动提取简历关键信息。
- **个性化出题**: 基于简历内容，AI 自动生成针对性面试题（如："针对你简历里的这个 0-1 项目..."）。
- **精准分类**: 自动提炼题目核心考点（Short Title），生成结构化题库。

### 2. 💬 沉浸式模拟面试
- **真实对话**: 模拟真实面试官的追问逻辑，支持多轮对话与压力测试。
- **范围控制**: 严格限定话题在当前题目内，避免 AI 发散，确保训练效率。
- **所见即所得编辑器**: 集成 **Tiptap** 富文本编辑器，支持 Markdown 快捷键，提供流畅的输入体验。

### 3. 📊 深度复盘与数据看板
- **STAR 原则报告**: 面试结束后，AI 自动生成结构化复盘报告（场景、任务、行动、结果）。
- **备战进度可视化**: 首页数据看板展示题库覆盖率、模拟次数和已准备题目比例。
- **一键入库**: 将优秀的面试回答一键保存为标准答案，构建个人专属题库。

### 4. 🛠️ 现代化技术栈
- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite + Prisma ORM
- **UI Component**: Shadcn UI + Tailwind CSS
- **AI Integration**: Vercel AI SDK + MiniMax API
- **Editor**: Tiptap (Headless WYSIWYG Editor)

## 🚀 快速开始 (Getting Started)

1. **下载项目**
   git clone https://github.com/ChooperV/ai-interview-master.git

2. **安装依赖**
   npm install

3. **初始化数据库**
   npx prisma db push

4. **启动开发服务器**
   npm run dev

启动成功后，打开浏览器访问 http://localhost:3000 即可开始使用。


## 📸 项目截图 (Screenshots)

<img width="2800" height="1598" alt="image" src="https://github.com/user-attachments/assets/dcb685e4-e6de-42a5-9af5-b7a3f546bac5" />

<img width="2788" height="1602" alt="image" src="https://github.com/user-attachments/assets/cfb7c374-77ec-49e7-9358-825570292de3" />

<img width="2778" height="1596" alt="image" src="https://github.com/user-attachments/assets/752f9462-92a4-49a8-b30e-d7230540eae9" />

<img width="2784" height="1590" alt="image" src="https://github.com/user-attachments/assets/26eebe90-d500-486f-a852-4bd4d5e87a7e" />

---

## 🤝 贡献 (Contribution)

如果你有任何建议或发现了 Bug，欢迎提交 Issue 或 Pull Request。
