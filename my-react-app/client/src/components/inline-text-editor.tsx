import { useState, useEffect, useRef } from "react";

interface InlineTextEditorProps {
  x: number;
  y: number;
  color: string;
  onComplete: (text: string) => void;
  onCancel: () => void;
}

export default function InlineTextEditor({ 
  x, 
  y, 
  color, 
  onComplete, 
  onCancel 
}: InlineTextEditorProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
    <input
      ref={inputRef}
      type="text"
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
      className="absolute border-2 px-2 py-1 rounded text-sm outline-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        borderColor: color,
        color: color,
        minWidth: "100px",
        zIndex: 1000,
      }}
      placeholder="Type text..."
    />
  );
}
