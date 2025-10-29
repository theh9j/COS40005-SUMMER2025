import React, { useEffect, useState } from "react";
import "./discussion.css";
import ThreadItem from "./ThreadItem";
import ReplyBox from "./ReplyBox";
import type { Thread } from "./types";
import { useAuth } from "@/hooks/use-auth";

interface DiscussionThreadProps {
  imageId: string;
}

const MOCK_MODE = true;

const DiscussionThread: React.FC<DiscussionThreadProps> = ({ imageId }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (MOCK_MODE) {
      const mock: Thread[] = [
        {
          id: 1,
          imageId,
          author: "Nguyen Van A",
          role: "Student",
          content: "I think there is an opacity in the right upper lobe.",
          timestamp: new Date().toLocaleString(),
          replies: [
            {
              id: 11,
              author: "Dr. Tran",
              role: "Instructor",
              content: "Good catch. Please compare with the contralateral side.",
              timestamp: new Date().toLocaleString(),
            },
          ],
        },
      ];
      setThreads(mock);
    }
  }, [imageId]);

  const authorName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    : "Anonymous";

  const authorRole =
    user?.role === "instructor" ? "Instructor" : "Student";

  const addNewThread = (text: string) => {
    if (!user) return; 

    const newThread: Thread = {
      id: Date.now(),
      imageId,
      author: authorName,
      role: authorRole,
      content: text,
      timestamp: new Date().toLocaleString(),
      replies: [],
    };
    setThreads((prev) => [...prev, newThread]);
  };

  const addReply = (threadId: number, text: string) => {
    if (!user) return; 

    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              replies: [
                ...t.replies,
                {
                  id: Date.now(),
                  author: authorName,
                  role: authorRole,
                  content: text,
                  timestamp: new Date().toLocaleString(),
                },
              ],
            }
          : t
      )
    );
  };

  return (
    <div className="discuss-panel">
      <h4 style={{ margin: "4px 0 8px" }}>Discussion</h4>
      <hr className="hr" />

      <div className="discuss-list">
        {threads.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 14 }}>No discussions yet</div>
        ) : (
          threads.map((t) => <ThreadItem key={t.id} thread={t} onReply={addReply} />)
        )}
      </div>

      <hr className="hr" />
      <ReplyBox onSubmit={addNewThread} placeholder="Start a new discussion…" submitLabel="Post" />
    </div>
  );
};

export default DiscussionThread;