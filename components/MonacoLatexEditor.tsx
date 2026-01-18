"use client";

import dynamic from "next/dynamic";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export default function MonacoLatexEditor({ value, onChange }: Props) {
  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-neutral-200">
      <Monaco
        height="100%"
        defaultLanguage="latex"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </div>
  );
}
