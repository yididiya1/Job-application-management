"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

// load editor only on client to avoid server-side DOM access
const Editor = dynamic(() => import('@toast-ui/react-editor').then((mod) => (mod as any).Editor), { ssr: false });

export default function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // keep editor in sync if external value changes
    const inst = editorRef.current?.getInstance?.();
    if (inst && inst.getMarkdown() !== value) {
      inst.setMarkdown(value || "");
    }
  }, [value]);

  return (
    <div>
      <Editor
        initialValue={value || ""}
        previewStyle="vertical"
        height="200px"
        initialEditType="wysiwyg"
        useCommandShortcut={true}
        ref={editorRef}
        onChange={() => {
          const inst = editorRef.current?.getInstance?.();
          if (!inst) return;
          const md = inst.getMarkdown();
          onChange(md);
        }}
        toolbarItems={[
          ["heading", "bold", "italic", "strike"],
          ["hr", "quote"],
          ["ul", "ol", "task"],
          ["table", "image", "link"],
          ["code", "codeblock"],
        ]}
      />
    </div>
  );
}
