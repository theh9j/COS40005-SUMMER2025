import * as React from 'react';
import { useState, useMemo } from 'react';
import ThreadItem from './ThreadItem'; // <-- Changed to default import
import { Thread, Tag } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth to get current user

const DiscussionThread: React.FC = () => {
  const { user } = useAuth(); // Get authenticated user

  // State for all threads
  const [threads, setThreads] = useState<Thread[]>([]);
  // State for the new post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostMessage, setNewPostMessage] = useState('');
  const [newPostTags, setNewPostTags] = useState<Tag[]>([]);
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | 'all'>('all');

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
      replyCount: 0,
    };

    setThreads([newThread, ...threads]); // Add new thread to the top
    // Reset form
    setNewPostTitle('');
    setNewPostMessage('');
    setNewPostTags([]);
    setShowNewPostModal(false); // Close the modal
  };

  const handleTagToggle = (tag: Tag) => {
    setNewPostTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag)
        : [...prevTags, tag]
    );
  };

  // Memoized filtering logic
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      // Filter by tag
      const tagMatch =
        selectedTag === 'all' || thread.tags.includes(selectedTag);

      // Filter by search term
      const searchMatch =
        searchTerm.trim() === '' ||
        thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.author.name.toLowerCase().includes(searchTerm.toLowerCase());

      return tagMatch && searchMatch;
    });
  }, [threads, searchTerm, selectedTag]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Discussions</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* New Post Dialog Trigger */}
          <Dialog open={showNewPostModal} onOpenChange={setShowNewPostModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Post
              </Button>
            </DialogTrigger>
            {/* New Post Dialog Content */}
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>
                  Start a new discussion. Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="col-span-3"
                    placeholder="Your post title..."
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="message" className="text-right pt-2">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={newPostMessage}
                    onChange={(e) => setNewPostMessage(e.target.value)}
                    className="col-span-3"
                    placeholder="Type your message..."
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Tags</Label>
                  <div className="col-span-3 flex gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tag-student"
                        checked={newPostTags.includes('student')}
                        onCheckedChange={() => handleTagToggle('student')}
                      />
                      <Label htmlFor="tag-student">Student</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tag-teacher"
                        checked={newPostTags.includes('teacher')}
                        onCheckedChange={() => handleTagToggle('teacher')}
                      />
                      <Label htmlFor="tag-teacher">Teacher</Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreatePost} disabled={!newPostTitle || !newPostMessage}>
                  Submit Post
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={selectedTag === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedTag('all')}
        >
          All Posts
        </Button>
        <Button
          variant={selectedTag === 'student' ? 'default' : 'outline'}
          onClick={() => setSelectedTag('student')}
        >
          Student
        </Button>
        <Button
          variant={selectedTag === 'teacher' ? 'default' : 'outline'}
          onClick={() => setSelectedTag('teacher')}
        >
          Teacher
        </Button>
      </div>

      {/* Post List */}
      <div className="flex flex-col gap-4">
        {filteredThreads.length > 0 ? (
          filteredThreads.map((thread) => (
            <ThreadItem key={thread.id} thread={thread} />
          ))
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No posts found.
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscussionThread;