import * as React from 'react';
import { useState, useMemo } from 'react';
import ThreadItem from './ThreadItem';
import ReplyBox from './ReplyBox';
import { Thread, Tag, Reply } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Tag as TagIcon, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatTimestamp } from './ThreadItem';

const DiscussionThread: React.FC = () => {
  const { user } = useAuth();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostMessage, setNewPostMessage] = useState('');
  const [newPostTags, setNewPostTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | 'all'>('all');

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const handleCreatePost = () => {
    if (!newPostTitle || !newPostMessage || !user) return;

    const newThread: Thread = {
      id: crypto.randomUUID(),
      author: {
        name: user.firstName ? `${user.firstName} ${user.lastName}` : 'Anonymous User',
        avatarUrl: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`,
      },
      title: newPostTitle,
      content: newPostMessage,
      timestamp: new Date().toISOString(),
      tags: newPostTags,
      replies: [],
    };

    setThreads([newThread, ...threads]);
    setNewPostTitle('');
    setNewPostMessage('');
    setNewPostTags([]);
    setIsCreatingPost(false);
  };

  const handleTagToggle = (tag: Tag) => {
    setNewPostTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag)
        : [...prevTags, tag]
    );
  };

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const tagMatch =
        selectedTag === 'all' || thread.tags.includes(selectedTag);

      const searchMatch =
        searchTerm.trim() === '' ||
        thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.author.name.toLowerCase().includes(searchTerm.toLowerCase());

      return tagMatch && searchMatch;
    });
  }, [threads, searchTerm, selectedTag]);

  const selectedThread = useMemo(() => {
    if (!selectedThreadId) return null;
    return threads.find((t) => t.id === selectedThreadId);
  }, [threads, selectedThreadId]);

  const handlePostReply = (replyContent: string) => {
    if (!selectedThreadId || !user) return;

    const newReply: Reply = {
      id: crypto.randomUUID(),
      author: {
        name: user.firstName ? `${user.firstName} ${user.lastName}` : 'Anonymous User',
        avatarUrl: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`,
      },
      content: replyContent,
      timestamp: new Date().toISOString(),
    };

    setThreads((prevThreads) =>
      prevThreads.map((thread) =>
        thread.id === selectedThreadId
          ? { ...thread, replies: [...thread.replies, newReply] }
          : thread
      )
    );
  };
  
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <div className="flex flex-row gap-6 p-4 md:p-6 h-[85vh]">
      <div 
        className={`${
          selectedThread ? 'w-1/2' : 'w-full'
        } flex flex-col gap-6 transition-all duration-300 h-full`}
      >
        <div className="flex flex-col gap-4">
          <div className="w-full">
            {!isCreatingPost ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search posts..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsCreatingPost(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Post
                </Button>
              </div>
            ) : (
              <div className="p-4 border rounded-lg shadow-sm">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="title" className="mb-2 block font-medium">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      placeholder="Your post title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="message" className="mb-2 block font-medium">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      value={newPostMessage}
                      onChange={(e) => setNewPostMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={5}
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant={newPostTags.includes('TestTag1') ? 'default' : 'outline'}
                        onClick={() => handleTagToggle('TestTag1')}
                        size="sm"
                        className={`rounded-full ${
                          newPostTags.includes('TestTag1')
                            ? 'border border-transparent'
                            : ''
                        }`}
                      >
                        TestTag1
                      </Button>
                      <Button
                        variant={newPostTags.includes('TestTag2') ? 'default' : 'outline'}
                        onClick={() => handleTagToggle('TestTag2')}
                        size="sm"
                        className={`rounded-full ${
                          newPostTags.includes('TestTag2')
                            ? 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
                            : ''
                        }`}
                      >
                        TestTag2
                      </Button>
                    </div>
                  </div>
                  
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsCreatingPost(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost} disabled={!newPostTitle || !newPostMessage}>
                    Submit Post
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedTag === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedTag('all')}
          >
            All Posts
          </Button>
          <Button
            variant={selectedTag === 'TestTag1' ? 'default' : 'outline'}
            onClick={() => setSelectedTag('TestTag1')}
          >
            TestTag1
          </Button>
          <Button
            variant={selectedTag === 'TestTag2' ? 'default' : 'outline'}
            onClick={() => setSelectedTag('TestTag2')}
          >
            TestTag2
          </Button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1">
          {filteredThreads.length > 0 ? (
            filteredThreads.map((thread) => (
              <ThreadItem 
                key={thread.id} 
                thread={thread}
                onSelectThread={setSelectedThreadId}
                isSelected={thread.id === selectedThreadId} 
              />
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No posts found.
            </div>
          )}
        </div>
      </div>

      {selectedThread && (
        <div className="w-1/2 border rounded-lg bg-blue-50 dark:bg-card flex flex-col h-full overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex justify-between items-start">
              <h2 className="text-4xl font-bold">{selectedThread.title}</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedThreadId(null)}
                className="text-muted-foreground -mt-2 -mr-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2 pb-4 border-b">
              {selectedThread.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tag === 'TestTag2' ? 'default' : 'secondary'}
                  className={
                    tag === 'TestTag2'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : ''
                  }
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-6 space-y-4">
              <div key={selectedThread.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedThread.author.avatarUrl} alt={selectedThread.author.name} />
                  <AvatarFallback>
                    {getInitials(selectedThread.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-base">{selectedThread.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(selectedThread.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedThread.content}</p>
                </div>
              </div>

              {selectedThread.replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={reply.author.avatarUrl} alt={reply.author.name} />
                    <AvatarFallback>
                      {getInitials(reply.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-base">{reply.author.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(reply.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
          
          <ReplyBox onSubmit={handlePostReply} />
        </div>
      )}
    </div>
  );
};

export default DiscussionThread;