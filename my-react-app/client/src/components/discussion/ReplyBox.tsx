import React, { useState } from "react";

interface ReplyBoxProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  submitLabel?: string;
}

const ReplyBox: React.FC<ReplyBoxProps> = ({
  onSubmit,
  placeholder = "Write a comment…",
  submitLabel = "Post",
}) => {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
    setValue("");
  };

  return (
    <div>
      <textarea
        className="textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
      />
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={submit}>{submitLabel}</button>
        <span style={{ marginLeft: 8, color: "#6b7280", fontSize: 12 }}>
          Press ⌘/Ctrl + Enter to submit
        </span>
      </div>
    </div>
  );
};

export default ReplyBox;
