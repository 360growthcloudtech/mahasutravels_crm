"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  RemoveFormatting,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeight = "80px",
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);

  // Synchronize external value changes with div contenteditable without disrupting cursor position
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const executeCommand = (command: string, valueArgument: string = "") => {
    document.execCommand(command, false, valueArgument);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAddLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  return (
    <div className={cn("rounded-md border border-border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-marigold/30 focus-within:border-marigold", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border-soft bg-slate-50/90 px-1.5 py-1 dark:bg-slate-800/40">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-slate hover:bg-slate-200/70 dark:hover:bg-slate-700"
          onClick={() => executeCommand("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-slate hover:bg-slate-200/70 dark:hover:bg-slate-700"
          onClick={() => executeCommand("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-slate hover:bg-slate-200/70 dark:hover:bg-slate-700"
          onClick={() => executeCommand("underline")}
          title="Underline (Ctrl+U)"
        >
          <Underline className="size-3" />
        </Button>
        <div className="h-3.5 w-px bg-border-soft mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-slate hover:bg-slate-200/70 dark:hover:bg-slate-700"
          onClick={() => executeCommand("insertUnorderedList")}
          title="Bullet List"
        >
          <List className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-slate hover:bg-slate-200/70 dark:hover:bg-slate-700"
          onClick={() => executeCommand("insertOrderedList")}
          title="Numbered List"
        >
          <ListOrdered className="size-3" />
        </Button>
        <div className="h-3.5 w-px bg-border-soft mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-slate hover:bg-slate-200/70 dark:hover:bg-slate-700"
          onClick={handleAddLink}
          title="Insert Link"
        >
          <LinkIcon className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-slate hover:bg-slate-200/70 dark:hover:bg-slate-700"
          onClick={() => executeCommand("removeFormat")}
          title="Clear Formatting"
        >
          <RemoveFormatting className="size-3" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="prose prose-sm max-w-none p-2.5 text-xs text-ink-text outline-none focus:outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
