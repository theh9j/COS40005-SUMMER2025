import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface ReplyBoxProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  submitLabel?: string;
}

const ReplyBox: React.FC<ReplyBoxProps> = ({
  onSubmit,
  placeholder = "Send a message",
}) => {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSubmit(text);
    setValue("");
  };

  return (
    <div className="w-full p-4 border-t">
      <div className="relative">
        <Textarea
          className="w-full min-h-[80px]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default ReplyBox;