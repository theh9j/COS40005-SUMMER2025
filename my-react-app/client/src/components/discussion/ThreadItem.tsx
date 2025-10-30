import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock } from 'lucide-react';
import { Thread } from './types';

interface ThreadItemProps {
  thread: Thread;
  onSelectThread: (id: string) => void;
  isSelected: boolean;
}

export const formatTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('');
};

const ThreadItem: React.FC<ThreadItemProps> = ({ thread, onSelectThread, isSelected }) => {
  const truncatedContent =
    thread.content.length > 150
      ? `${thread.content.substring(0, 150)}...`
      : thread.content;

  return (
    <Card 
      className={`w-full transition-all hover:shadow-md cursor-pointer ${
        isSelected ? 'border-primary shadow-md' : ''
      }`}
      onClick={() => onSelectThread(thread.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex gap-2 mb-2">
          {thread.tags.map((tag) => (
            <Badge
              key={tag}
              variant={tag === 'teacher' ? 'default' : 'secondary'}
              className={
                tag === 'teacher'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : ''
              }
            >
              {tag}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-xl">{thread.title}</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <CardDescription>
          <span className="font-semibold text-primary">{thread.author.name}</span>
          : {truncatedContent}
        </CardDescription>
      </CardContent>
      <CardFooter className="pt-2 pb-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <MessageSquare size={14} />
          <span>{thread.replies.length + 1} replies</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock size={14} />
          <span>{formatTimestamp(thread.timestamp)}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ThreadItem;