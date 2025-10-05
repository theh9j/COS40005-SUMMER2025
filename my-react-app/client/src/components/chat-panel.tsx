import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockChatMessages } from "@/lib/mock-data";
import { MessageCircle, Send } from "lucide-react";

export default function ChatPanel() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockChatMessages);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      userId: "1",
      userName: "You",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32",
      message: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 p-4 border-b border-border" data-testid="chat-panel">
      <h3 className="font-semibold mb-4 flex items-center">
        <MessageCircle className="h-4 w-4 mr-2" />
        Collaboration Chat
      </h3>
      
      <ScrollArea className="h-48 mb-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex items-start space-x-2 ${
                msg.userName === "You" ? "justify-end" : ""
              }`}
              data-testid={`message-${msg.id}`}
            >
              {msg.userName !== "You" && (
                <img 
                  src={msg.avatar} 
                  alt={msg.userName} 
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
              )}
              <div className={`p-2 rounded-lg text-sm max-w-xs ${
                msg.userName === "You" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-secondary-foreground"
              }`}>
                <p className="font-medium text-xs mb-1">{msg.userName}</p>
                <p>{msg.message}</p>
              </div>
              {msg.userName === "You" && (
                <img 
                  src={msg.avatar} 
                  alt={msg.userName} 
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="flex space-x-2">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 text-sm"
          data-testid="input-message"
        />
        <Button 
          size="sm"
          onClick={handleSendMessage}
          disabled={!message.trim()}
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
