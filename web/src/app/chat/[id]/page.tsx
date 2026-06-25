"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Trash2,
  Plus,
  ChevronDown,
  X,
  Paperclip,
  Copy,
  Check,
  FileText,
  ArrowLeft,
  Download,
  Search,
  Mic,
  RefreshCw,
  Book,
  Folder,
  Code,
  MoreHorizontal,
  User,
  ArrowUp,
  MessageSquarePlus,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: string;
}

export default function ChatDetailPage() {
  const params = useParams();
  const conversationId = params.id as string;
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState(conversationId === 'coder' ? "code" : "flash");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatListOpen, setChatListOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedChatForContext, setSelectedChatForContext] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const greetings = [
    "Where should we begin?",
    "Hello! How can I help you today?",
    "What would you like to work on?",
    "Ready to create something amazing?",
    "Let's get started!",
    "What's on your mind?",
    "How can I assist you?",
  ];

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  const models = {
    flash: "Bloomy Flash",
    core: "Bloomy Core",
    code: "Bloomy Code",
  };

  const parseFilesFromContent = (content: string): { name: string; content: string }[] => {
    const files: { name: string; content: string }[] = [];
    const fileRegex = /FILE: (\S+)\n```([\s\S]*?)```/g;
    let match;
    
    while ((match = fileRegex.exec(content)) !== null) {
      files.push({
        name: match[1],
        content: match[2].trim(),
      });
    }
    
    return files;
  };

  const downloadZip = async (content: string) => {
    const files = parseFilesFromContent(content);
    if (files.length === 0) return;

    try {
      const response = await fetch('/api/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bloomy-files.zip';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download zip:', error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConversations = localStorage.getItem('bloomy-conversations');
      if (savedConversations) {
        try {
          const parsed = JSON.parse(savedConversations);
          if (parsed && parsed.length > 0) {
            setConversations(parsed);
          }
        } catch (e) {
          console.error('Failed to load conversations:', e);
        }
      }
      
      // If conversation doesn't exist, create it
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        const exists = parsed?.find((c: Conversation) => c.id === conversationId);
        if (!exists) {
          const newConversation: Conversation = {
            id: conversationId,
            title: "New Conversation",
            messages: [],
            timestamp: new Date().toISOString(),
          };
          const updated = [newConversation, ...parsed];
          setConversations(updated);
          localStorage.setItem('bloomy-conversations', JSON.stringify(updated));
        }
      } else {
        const newConversation: Conversation = {
          id: conversationId,
          title: "New Conversation",
          messages: [],
          timestamp: new Date().toISOString(),
        };
        setConversations([newConversation]);
        localStorage.setItem('bloomy-conversations', JSON.stringify([newConversation]));
      }
    }
  }, [conversationId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && conversations.length > 0) {
      localStorage.setItem('bloomy-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, isTyping]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuOpen) {
        setContextMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenuOpen]);

  // Check authentication on load
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/login');
    } else if (status === "authenticated") {
      console.log("User is authenticated:", session);
    }
  }, [status, session, router]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    // Check if user is logged in
    if (!session) {
      router.push('/login');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedMessages = [...conv.messages, userMessage];
        return {
          ...conv,
          messages: updatedMessages,
          title: conv.title === "New Conversation" && updatedMessages.length === 1
            ? input.slice(0, 30) + (input.length > 30 ? "..." : "")
            : conv.title
        };
      }
      return conv;
    }));

    const messageToSend = input;
    const attachmentsToSend = attachments;
    setInput("");
    setAttachments([]);
    setIsTyping(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          model: selectedModel,
          conversationId: conversationId,
          attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', errorText);
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk') {
                  assistantContent += data.content;
                  setConversations(prev => prev.map(conv => {
                    if (conv.id === conversationId) {
                      const lastMsg = conv.messages[conv.messages.length - 1];
                      if (lastMsg?.role === 'assistant') {
                        return {
                          ...conv,
                          messages: [...conv.messages.slice(0, -1), { ...lastMsg, content: assistantContent }]
                        };
                      }
                      return conv;
                    }
                    return conv;
                  }));
                } else if (data.type === 'done') {
                  assistantContent = data.content || assistantContent;
                } else if (data.type === 'error') {
                  assistantContent = data.content || 'Error occurred';
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, messages: [...conv.messages, assistantMessage] };
        }
        return conv;
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, messages: [...conv.messages, errorMessage] };
        }
        return conv;
      }));
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: FileAttachment = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
        };
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === "user";
    const content = message.content;

    const parts = content.split(/(```[\s\S]*?```|\*\*[^*]+\*\*)/g);
    
    return (
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-dark-surface flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Bloomy" className="w-8 h-8 rounded-full" />
          </div>
        )}
        <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
          <div className={`inline-block max-w-3xl ${isUser ? 'bg-dark-card border border-dark-border' : 'bg-transparent border border-dark-border'} rounded-lg p-4 text-left`}>
            {isUser && session?.user?.image && (
              <div className="flex items-center gap-2 mb-2">
                <img src={session.user.image} alt="User" className="w-6 h-6 rounded-full" />
                <span className="text-xs text-dark-text-secondary">{session.user.name}</span>
              </div>
            )}
            {parts.map((part, i) => {
              if (part.startsWith('```')) {
                const codeContent = part.slice(3, -3).trim();
                const languageMatch = codeContent.match(/^(\w+)\n/);
                const language = languageMatch ? languageMatch[1] : 'text';
                const actualCode = languageMatch ? codeContent.slice(language.length + 1) : codeContent;
                
                return (
                  <div key={i} className="relative my-2">
                    <div className="flex items-center justify-between bg-dark-surface px-3 py-2 rounded-t-lg border border-dark-border">
                      <span className="text-xs text-dark-text-secondary">{language}</span>
                      <button
                        onClick={() => copyCode(actualCode)}
                        className="flex items-center gap-1 text-xs text-dark-text-secondary hover:text-dark-text"
                      >
                        {copiedCode === actualCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedCode === actualCode ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="bg-dark-bg p-4 rounded-b-lg overflow-x-auto border border-dark-border">
                      <code className="text-sm text-green-400">{actualCode}</code>
                    </pre>
                  </div>
                );
              } else if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-dark-text font-bold">{part.slice(2, -2)}</strong>;
              } else {
                return <span key={i} className="text-dark-text whitespace-pre-wrap">{part}</span>;
              }
            })}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {message.attachments.map(attachment => (
                  <div key={attachment.id} className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2 flex items-center gap-2">
                    {attachment.type.startsWith('image/') ? (
                      <img src={attachment.url} alt={attachment.name} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <FileText className="w-4 h-4 text-dark-text-secondary" />
                    )}
                    <span className="text-xs text-dark-text">{attachment.name}</span>
                    <span className="text-xs text-dark-text-secondary">({formatFileSize(attachment.size)})</span>
                  </div>
                ))}
              </div>
            )}
            {message.role === 'assistant' && parseFilesFromContent(message.content).length > 0 && (
              <button
                onClick={() => downloadZip(message.content)}
                className="mt-2 flex items-center gap-2 px-3 py-2 bg-bloomy-purple/20 hover:bg-bloomy-purple/30 rounded-lg text-sm text-dark-text transition-colors"
              >
                <Download className="w-4 h-4" />
                Download {parseFilesFromContent(message.content).length} file(s) as ZIP
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const currentConversation = conversations.find(c => c.id === conversationId);

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const filteredSidebarConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  const createNewConversation = () => {
    const newConversationId = Date.now().toString();
    router.push(`/chat/${newConversationId}`);
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedChatForContext(chatId);
    setContextMenuOpen(true);
  };

  const handleDeleteChat = (chatId: string) => {
    const updated = conversations.filter(c => c.id !== chatId);
    setConversations(updated);
    localStorage.setItem('bloomy-conversations', JSON.stringify(updated));
    setContextMenuOpen(false);
    if (chatId === conversationId) {
      router.push('/chat');
    }
  };

  const handleRenameChat = () => {
    if (selectedChatForContext && newChatName.trim()) {
      setConversations(prev => prev.map(conv => 
        conv.id === selectedChatForContext 
          ? { ...conv, title: newChatName.trim() }
          : conv
      ));
      localStorage.setItem('bloomy-conversations', JSON.stringify(conversations.map(conv => 
        conv.id === selectedChatForContext 
          ? { ...conv, title: newChatName.trim() }
          : conv
      )));
      setRenameDialogOpen(false);
      setNewChatName('');
      setContextMenuOpen(false);
    }
  };

  const openRenameDialog = () => {
    const chat = conversations.find(c => c.id === selectedChatForContext);
    if (chat) {
      setNewChatName(chat.title);
      setRenameDialogOpen(true);
      setContextMenuOpen(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-screen flex bg-dark-bg">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 260 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-dark-surface border-r border-dark-border flex flex-col shrink-0"
          >
            <div className="p-4 flex items-center justify-start">
              <img src="/logo.png" alt="Bloomy AI" className="w-8 h-8" />
            </div>
            
            <div className="px-3 pb-2 flex flex-col gap-1">
              <button
                onClick={createNewConversation}
                className="flex items-center gap-2 px-3 py-2 bg-dark-card hover:bg-dark-surface rounded-md transition-colors text-sm text-dark-text"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>New chat</span>
              </button>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary" />
                <input
                  type="text"
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  placeholder="Search chats"
                  className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 pl-9 pr-3 placeholder-dark-text-secondary text-dark-text"
                />
              </div>
            </div>

            <div className="px-3 py-2 flex flex-col gap-1">
              <Link href="/library" className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-dark-text-secondary hover:bg-dark-surface">
                <Book className="w-4 h-4" />
                <span>Library</span>
              </Link>
              <Link href="/projects" className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-dark-text-secondary hover:bg-dark-surface">
                <Folder className="w-4 h-4" />
                <span>Projects</span>
              </Link>
              <div 
                onClick={() => {
                  setSelectedModel("code");
                  const coderConversationId = 'coder';
                  const existingCoderChat = conversations.find(c => c.id === coderConversationId);
                  if (!existingCoderChat) {
                    const newCoderChat = {
                      id: coderConversationId,
                      title: 'Bloomy Coder',
                      messages: [],
                      timestamp: new Date().toISOString(),
                    };
                    setConversations(prev => [...prev, newCoderChat]);
                    localStorage.setItem('bloomy-conversations', JSON.stringify([...conversations, newCoderChat]));
                  }
                  router.push(`/chat/${coderConversationId}`);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-dark-text-secondary hover:bg-dark-surface cursor-pointer"
              >
                <Code className="w-4 h-4" />
                <span>Coder</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm text-dark-text-secondary hover:bg-dark-surface cursor-pointer w-full"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>More</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {moreDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-dark-border rounded-md shadow-xl z-50">
                    <button
                      onClick={() => {
                        setMoreDropdownOpen(false);
                        // Handle image generation
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-dark-text-secondary hover:bg-dark-surface transition-colors flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Image</span>
                    </button>
                    <button
                      onClick={() => {
                        setMoreDropdownOpen(false);
                        // Handle deep research
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-dark-text-secondary hover:bg-dark-surface transition-colors flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      <span>Deep Research</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 text-xs font-medium text-dark-text-secondary mt-2 uppercase tracking-wider">
              Recents
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              {filteredSidebarConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => router.push(`/chat/${conv.id}`)}
                  onContextMenu={(e) => handleContextMenu(e, conv.id)}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer ${
                    conv.id === conversationId ? 'bg-dark-surface' : 'hover:bg-dark-surface'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-dark-text-secondary shrink-0" />
                  <span className="flex-1 text-sm text-dark-text truncate">{conv.title}</span>
                </div>
              ))}
            </div>

            <div className="p-3 mt-auto border-t border-dark-border relative">
              <button
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="w-full flex items-center justify-between hover:bg-dark-surface transition-colors cursor-pointer rounded-t-xl"
              >
                <div className="flex items-center gap-3">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bloomy-pink to-bloomy-purple flex items-center justify-center text-white font-bold text-xs">
                      {session?.user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AN'}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-dark-text font-medium">{session?.user?.name || "Account Name"}</span>
                  </div>
                </div>
              </button>
              
              {accountDropdownOpen && session && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-dark-card border border-dark-border rounded-md shadow-xl z-50">
                  <button
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      signOut({ callbackUrl: '/login' });
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-dark-surface transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat List Popup */}
      <AnimatePresence>
        {chatListOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setChatListOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-dark-text">All Chats</h2>
                  <button
                    onClick={() => setChatListOpen(false)}
                    className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-dark-text-secondary" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full bg-dark-surface border border-dark-border rounded-lg px-10 py-3 text-dark-text placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-bloomy-purple/50"
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-dark-text-secondary" />
                    <p className="text-dark-text-secondary mb-4">No conversations found</p>
                    <button
                      onClick={createNewConversation}
                      className="px-6 py-3 bg-bloomy-purple hover:bg-bloomy-purple/80 rounded-lg text-white transition-colors"
                    >
                      Start a new conversation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => { router.push(`/chat/${conv.id}`); }}
                        className="bg-dark-surface hover:bg-dark-card border border-dark-border rounded-lg p-4 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-bloomy-purple" />
                              <h3 className="text-dark-text font-medium">{conv.title}</h3>
                            </div>
                            <p className="text-sm text-dark-text-secondary">
                              {conv.messages.length > 0
                                ? conv.messages[conv.messages.length - 1].content.slice(0, 100) +
                                  (conv.messages[conv.messages.length - 1].content.length > 100 ? "..." : "")
                                : "No messages yet"}
                            </p>
                            <p className="text-xs text-dark-text-secondary mt-2">{formatDate(conv.timestamp)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = conversations.filter(c => c.id !== conv.id);
                              setConversations(updated);
                              localStorage.setItem('bloomy-conversations', JSON.stringify(updated));
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-dark-border rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-dark-text-secondary" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenuOpen && (
        <div
          className="fixed bg-dark-card border border-dark-border rounded-lg shadow-xl z-50 min-w-[150px]"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
          onClick={() => setContextMenuOpen(false)}
        >
          <button
            onClick={openRenameDialog}
            className="w-full px-4 py-2 text-left text-dark-text hover:bg-dark-border rounded-t-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => selectedChatForContext && handleDeleteChat(selectedChatForContext)}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-dark-border rounded-b-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Rename Dialog */}
      {renameDialogOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-dark-text mb-4">Rename Chat</h2>
            <input
              type="text"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="Enter new name"
              className="w-full bg-dark-surface border border-dark-border rounded-lg px-4 py-3 text-dark-text placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-bloomy-purple/50 mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleRenameChat();
                if (e.key === 'Escape') setRenameDialogOpen(false);
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRenameDialogOpen(false)}
                className="px-4 py-2 bg-dark-surface hover:bg-dark-border rounded-lg text-dark-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameChat}
                className="px-4 py-2 bg-bloomy-purple hover:bg-bloomy-purple/80 rounded-lg text-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-dark-surface border-b border-dark-border flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-dark-border rounded-lg transition-colors"
            title="Toggle sidebar"
          >
            <Sparkles className="w-5 h-5 text-dark-text-secondary" />
          </button>
          <div className="relative">
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-dark-card hover:bg-dark-surface rounded-md transition-colors text-sm text-dark-text"
            >
              <img src="/new-chat.png" alt="New chat" className="w-13 h-6 object-contain" />
              <ChevronDown className={`w-4 h-4 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {modelDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-dark-card border border-dark-border rounded-md shadow-xl z-50">
                <button
                  onClick={() => {
                    setSelectedModel("flash");
                    setModelDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-dark-surface transition-colors ${selectedModel === "flash" ? "text-dark-text" : "text-dark-text-secondary"}`}
                >
                  Flash
                </button>
                <button
                  onClick={() => {
                    setSelectedModel("core");
                    setModelDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-dark-surface transition-colors ${selectedModel === "core" ? "text-dark-text" : "text-dark-text-secondary"}`}
                >
                  Core
                </button>
              </div>
            )}
          </div>
          <div className="flex-1" />
          <button
            className="p-2 hover:bg-dark-border rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-dark-text-secondary" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentConversation?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              {conversationId === 'coder' ? (
                <>
                  <h1 className="text-2xl font-semibold text-dark-text mb-2">Welcome to Bloomy Coder</h1>
                  <p className="text-xl text-dark-text-secondary">What are we building today?</p>
                </>
              ) : (
                <h1 className="text-3xl font-semibold text-dark-text mb-8">{randomGreeting}</h1>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {currentConversation?.messages.map(message => renderMessage(message))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-dark-surface flex items-center justify-center shrink-0">
                    <img src="/logo.png" alt="Bloomy" className="w-8 h-8 rounded-full" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-transparent rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-dark-text-secondary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-dark-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-dark-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-dark-surface border-t border-dark-border p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            {currentConversation?.messages.length === 0 ? (
              <div className="w-full max-w-2xl relative">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-3 py-2">
                        {attachment.type.startsWith('image/') ? (
                          <img src={attachment.url} alt={attachment.name} className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <FileText className="w-4 h-4 text-dark-text-secondary" />
                        )}
                        <span className="text-xs text-dark-text">{attachment.name}</span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="p-1 hover:bg-dark-border rounded"
                        >
                          <X className="w-3 h-3 text-dark-text-secondary" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-dark-card rounded-full border-2 border-dark-border flex items-center p-2 px-4 shadow-lg focus-within:ring-2 focus-within:ring-bloomy-purple/50 transition-all">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-dark-text-secondary hover:text-dark-text transition-colors"
                    title="Attach files"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask anything"
                    className="flex-1 bg-transparent border-none focus:ring-0 text-dark-text placeholder-dark-text-secondary px-3 outline-none resize-none text-base"
                    rows={1}
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-dark-text-secondary hover:text-dark-text transition-colors"
                      title="Voice input"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-3 py-2">
                        {attachment.type.startsWith('image/') ? (
                          <img src={attachment.url} alt={attachment.name} className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <FileText className="w-4 h-4 text-dark-text-secondary" />
                        )}
                        <span className="text-xs text-dark-text">{attachment.name}</span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="p-1 hover:bg-dark-border rounded"
                        >
                          <X className="w-3 h-3 text-dark-text-secondary" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2 bg-dark-card border-2 border-dark-border rounded-lg p-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-dark-border rounded-lg transition-colors"
                    title="Attach files"
                  >
                    <Paperclip className="w-5 h-5 text-dark-text-secondary" />
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message Bloomy AI..."
                    className="flex-1 bg-transparent text-dark-text placeholder-dark-text-secondary resize-none focus:outline-none text-sm"
                    rows={1}
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && attachments.length === 0) || isTyping}
                    className="p-2 bg-gradient-to-r from-bloomy-purple to-bloomy-pink rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-bloomy-purple/25"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
