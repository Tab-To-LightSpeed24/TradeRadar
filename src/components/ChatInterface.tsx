"use client";

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2, Sparkles, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Message {
  role: "user" | "assistant";
  content: string;
  hasAction?: boolean;
  timestamp: string;
}

interface ChatHistory {
  messages: Message[];
  savedAt: string;
}

const CHAT_HISTORY_KEY = 'traderadar-chat-history';
const initialMessage: Message = {
  role: "assistant",
  content: "I am an AI assistant. I can create and list trading strategies, and define common trading terms.\n\nType **help** to see a list of commands, or try one of the suggestions below.",
  timestamp: new Date().toISOString(),
};

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedHistoryJSON = localStorage.getItem(CHAT_HISTORY_KEY);
      if (!savedHistoryJSON) return [initialMessage];

      const savedHistory: ChatHistory = JSON.parse(savedHistoryJSON);
      const now = new Date();
      const savedDate = new Date(savedHistory.savedAt);

      if (now.getTime() - savedDate.getTime() > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(CHAT_HISTORY_KEY);
        toast.info("Chat history has been cleared (older than 24 hours).");
        return [initialMessage];
      }
      
      return savedHistory.messages;
    } catch (error) {
      console.error("Failed to parse chat history from localStorage", error);
      return [initialMessage];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState(15);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    try {
      const historyToSave: ChatHistory = {
        messages: messages,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchUsage = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_usage')
        .select('market_data_requests')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        toast.error("Could not fetch usage data.");
      } else {
        const used = data?.market_data_requests || 0;
        setRemainingRequests(15 - used);
      }
    };
    fetchUsage();
  }, [user]);

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageContent, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

      const { data, error } = await supabase.functions.invoke('command-parser', {
        body: { messages: apiMessages },
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.reply,
        hasAction: data.success,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.remainingRequests !== undefined) {
        setRemainingRequests(data.remainingRequests);
      }
    } catch (error: any) {
      const errorMessageContent = `Error communicating with assistant: ${error.message}`;
      toast.error(errorMessageContent);
      const errorMessage: Message = { role: "assistant", content: "Sorry, I encountered an error. Please check the console or contact support.", timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClearChat = () => {
    setMessages([initialMessage]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    toast.info("Chat history cleared.");
  };

  const parseContent = (content: string) => {
    if (!content) {
      return { __html: '' };
    }
    let parsedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsedContent = parsedContent.replace(/`(.*?)`/g, '<code class="bg-muted text-foreground px-1 py-0.5 rounded-sm font-mono text-sm">$1</code>');
    return { __html: parsedContent };
  };

  const suggestionPrompts = [
    "Create a strategy for TSLA",
    "What is the price of GOOGL?",
    "Show me my strategies",
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bot />
          TradeRadar AI Assistant
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={handleClearChat} title="Clear chat history">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
        <div className="text-xs text-center text-muted-foreground p-2 bg-muted rounded-md flex items-center justify-center gap-2">
          <Info className="w-3 h-3" />
          Chat history is automatically cleared every 24 hours.
        </div>
        <ScrollArea className="flex-grow pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot size={20} /></AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col gap-1">
                  <div
                    className={cn(
                      "max-w-sm md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={parseContent(message.content)} />
                    {message.hasAction && (
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate('/strategies')}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          View Strategies
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className={cn("text-xs text-muted-foreground", message.role === 'user' ? 'text-right' : 'text-left')}>
                    {format(new Date(message.timestamp), 'h:mm a')}
                  </div>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><User size={20} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot size={20} /></AvatarFallback>
                </Avatar>
                <div className="bg-muted px-4 py-2 rounded-lg flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {messages.length <= 2 && !isLoading && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {suggestionPrompts.map((prompt, i) => (
              <Button key={i} variant="outline" size="sm" onClick={() => sendMessage(prompt)}>
                {prompt}
              </Button>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type 'help' or ask a question..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Market data requests remaining today: <strong>{remainingRequests}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};