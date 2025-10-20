import React, { useEffect, useState } from "react";
import "./discussion.css";
import ThreadItem from "./ThreadItem";
import ReplyBox from "./ReplyBox";
import type { Thread } from "./types";

interface DiscussionThreadProps {
  imageId: string;
  currentUser?: { name: string; role: "Student" | "Instructor" | "Admin" };
}

const MOCK_MODE = true;

const DiscussionThread: React.FC<DiscussionThreadProps> = ({
  imageId,
  currentUser = { name: "Do Duy Long", role: "Student" },
}) => {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (MOCK_MODE) {
      const mock: Thread[] = [
        {
          id: 1,
          imageId,
          author: "Do Duy Long",
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

  const addNewThread = (text: string) => {
    const newThread: Thread = {
      id: Date.now(),
      imageId,
      author: currentUser.name,
      role: currentUser.role,
      content: text,
      timestamp: new Date().toLocaleString(),
      replies: [],
    };
    setThreads((prev) => [...prev, newThread]);
  };

  const addReply = (threadId: number, text: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              replies: [
                ...t.replies,
                {
                  id: Date.now(),
                  author: currentUser.name,
                  role: currentUser.role,
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
