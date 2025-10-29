import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Thread } from './types';

interface ThreadItemProps {
  thread: Thread;
}

// Helper function to format the timestamp
const formatTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Helper function to get initials from a name
const getInitials = (name: string) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('');
};

const ThreadItem: React.FC<ThreadItemProps> = ({ thread }) => {
  // Truncate content for the card view
  const truncatedContent =
    thread.content.length > 150
      ? `${thread.content.substring(0, 150)}...`
      : thread.content;

  return (
    <Card className="w-full transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
        <Avatar>
          <AvatarImage src={thread.author.avatarUrl} alt={thread.author.name} />
          <AvatarFallback>{getInitials(thread.author.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold">{thread.author.name}</span>
          <span className="text-sm text-muted-foreground">
            {formatTimestamp(thread.timestamp)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <CardTitle className="mb-2 text-lg">{thread.title}</CardTitle>
        <CardDescription>{truncatedContent}</CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
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
        <Button variant="ghost" size="sm" className="gap-1.5">
          <MessageSquare className="h-4 w-4" />
          {thread.replyCount}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ThreadItem;