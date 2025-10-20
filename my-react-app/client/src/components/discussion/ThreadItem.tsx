import React from "react";
import ReplyBox from "./ReplyBox";
import type { Thread, Reply } from "./types";

interface ThreadItemProps {
  thread: Thread;
  onReply: (threadId: number, text: string) => void;
}

const badgeClass = (role: Thread["role"]) =>
  role === "Instructor" ? "badge badge-instructor"
  : role === "Admin" ? "badge badge-admin"
  : "badge badge-student";

const Initial: React.FC<{ name: string }> = ({ name }) => (
  <div className="avatar">{name?.[0]?.toUpperCase() ?? "U"}</div>
);

const ThreadItem: React.FC<ThreadItemProps> = ({ thread, onReply }) => {
  const handleReply = (text: string) => onReply(thread.id, text);

  return (
    <div>
      {/* Main comment */}
      <div className="comment">
        <Initial name={thread.author} />
        <div className="comment-body">
          <div className="comment-header">
            <span className="comment-author">{thread.author}</span>
            <span className={badgeClass(thread.role)}>{thread.role}</span>
            <span className="comment-time">{thread.timestamp}</span>
          </div>
          <p className="comment-text">{thread.content}</p>
        </div>
      </div>

      {/* Replies */}
      {thread.replies?.length > 0 && (
        <div className="replies">
          {thread.replies.map((r: Reply) => (
            <div key={r.id} className="comment">
              <Initial name={r.author} />
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">{r.author}</span>
                  <span className={badgeClass(r.role)}>{r.role}</span>
                  <span className="comment-time">{r.timestamp}</span>
                </div>
                <p className="comment-text">{r.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Box */}
      <div className="replies">
        <ReplyBox onSubmit={handleReply} placeholder="Write a reply…" submitLabel="Reply" />
      </div>
    </div>
  );
};

export default ThreadItem;
