"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Italic, List, Heading1, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isMarkdownLike(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith(">") ||
    /\n\n/.test(trimmed) ||
    /^\d+\.\s/m.test(trimmed)
  );
}

function toHtml(value: string): string {
  if (!value?.trim()) return "";
  if (value.trim().startsWith("<") && value.includes(">")) {
    return value;
  }
  if (isMarkdownLike(value)) {
    try {
      const { marked } = require("marked");
      return marked.parse(value, { async: false }) as string;
    } catch {
      return `<p>${value.replace(/\n/g, "</p><p>")}</p>`;
    }
  }
  return `<p>${value.replace(/\n/g, "</p><p>")}</p>`;
}

export interface EditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  /** 触发发送时调用，传入 editor 以便获取 getText() 或 getHTML() */
  onSubmit?: (editor: { getText: () => string; getHTML: () => string }) => void;
  submitKey?: "Enter" | "Mod-Enter";
  className?: string;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
}

export function Editor({
  value,
  onChange,
  placeholder = "请输入...",
  disabled = false,
  minHeight = "min-h-[120px]",
  onSubmit,
  submitKey = "Mod-Enter",
  className,
  showToolbar = true,
}: EditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toHtml(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none px-3 py-2",
          minHeight
        ),
      },
      handleKeyDown: (_view, event) => {
        const ed = editorRef.current;
        if (!onSubmit || !ed) return false;
        const isMod = event.metaKey || event.ctrlKey;
        if (submitKey === "Enter" && !event.shiftKey && event.key === "Enter") {
          event.preventDefault();
          onSubmit({ getText: () => ed.getText(), getHTML: () => ed.getHTML() });
          return true;
        }
        if (submitKey === "Mod-Enter" && isMod && event.key === "Enter") {
          event.preventDefault();
          onSubmit({ getText: () => ed.getText(), getHTML: () => ed.getHTML() });
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChangeRef.current(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const target = toHtml(value);
    const current = editor.getHTML();
    if (target !== current) {
      editor.commands.setContent(target, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background overflow-hidden",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="加粗"
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="斜体"
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="无序列表"
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="一级标题"
          >
            <Heading1 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="二级标题"
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-8", active && "bg-muted")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}
