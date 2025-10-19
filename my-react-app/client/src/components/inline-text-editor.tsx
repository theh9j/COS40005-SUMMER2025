import { useState, useEffect, useRef } from "react";

interface InlineTextEditorProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  onComplete: (text: string) => void;
  onCancel: () => void;
}

export default function InlineTextEditor({ 
  x, 
  y, 
  width,
  height,
  color, 
  onComplete, 
  onCancel 
}: InlineTextEditorProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (text.trim()) {
        onComplete(text);
      } else {
        onCancel();
      }
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <textarea
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (text.trim()) {
          onComplete(text);
        } else {
          onCancel();
        }
      }}
      className="absolute border-2 px-2 py-1 rounded text-sm outline-none resize-none bg-white"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: width ? `${width}px` : "200px",
        height: height ? `${height}px` : "40px",
        borderColor: color,
        color: color,
        zIndex: 1000,
        overflow: "hidden",
      }}
      placeholder="Type text..."
    />
  );
}
