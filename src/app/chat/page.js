"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, MessageSquare, Bot, User, Trash2, Edit3, Menu, X, Home, Calendar, CheckSquare, History } from 'lucide-react';
import Link from 'next/link';

const formatMarkdown = (text) => {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/```(.*?)```/gs, '<pre class="bg-gray-100 p-2 rounded text-sm overflow-x-auto my-2"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4">• $1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n/g, '<br>');
  formatted = formatted.replace(/(<li class="ml-4">.*?<\/li>(?:<br>)?)+/g, (match) => {
    return '<ul class="my-2">' + match.replace(/<br>/g, '') + '</ul>';
  });
  formatted = formatted.replace(/(<li class="ml-4 list-decimal">.*?<\/li>(?:<br>)?)+/g, (match) => {
    return '<ol class="my-2 ml-4">' + match.replace(/<br>/g, '').replace(/class="ml-4 list-decimal"/g, '') + '</ol>';
  });

  return formatted;
};

const Message = ({ message, isUser }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Avatar untuk assistant */}
      {!isUser && (
        <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot size={18} className="text-white" />
        </div>
      )}
      
      {/* Bubble pesan */}
      <div className={`max-w-3xl ${
        isUser 
          ? 'bg-red-500 text-white rounded-2xl rounded-br-md px-4 py-3' 
          : 'bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
      }`}>
        <div className={`${isUser ? 'text-white' : 'text-gray-900'} prose prose-sm max-w-none`}>
          {isUser ? (
            message.content.split('\n').map((line, i) => (
              <div key={i}>
                {line}
                {i < message.content.split('\n').length - 1 && <br />}
              </div>
            ))
          ) : (
            <div 
              dangerouslySetInnerHTML={{ 
                __html: formatMarkdown(message.content) 
              }} 
            />
          )}
        </div>
        <div className={`text-xs mt-2 ${
          isUser ? 'text-red-100' : 'text-gray-400'
        }`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
      
      {/* Avatar untuk user */}
      {isUser && (
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-white" />
        </div>
      )}
    </div>
  );
};

const LoadingMessage = () => (
  <div className="flex gap-3 justify-start mb-4">
    <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
      <Bot size={18} className="text-white" />
    </div>
    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  </div>
);

const ChatItem = ({ chat, isActive, onSelect, onEdit, onDelete, editingChatId, editingTitle, setEditingTitle, saveTitle }) => (
  <div
    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 group ${
      isActive ? 'bg-gray-100 border-l-4 border-l-red-500' : ''
    }`}
    onClick={() => onSelect(chat.id)}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        {editingChatId === chat.id ? (
          <input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyPress={(e) => e.key === 'Enter' && saveTitle()}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <h3 className="font-medium text-gray-900 truncate text-sm">{chat.title}</h3>
            {chat.lastMessage && (
              <p className="text-xs text-gray-500 truncate mt-1">{chat.lastMessage}</p>
            )}
          </>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(chat);
          }}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat.id);
          }}
          className="p-1 hover:bg-red-100 text-red-600 rounded"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  </div>
);

const WelcomeScreen = ({ setInputMessage }) => {
  const suggestions = [
    'What can you help me with?',
    'Write a creative story about space exploration',
    'Explain quantum computing in simple terms',
    'Help me plan a healthy meal'
  ];

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bot size={32} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to DigiMate Chat!</h2>
        <p className="text-gray-500 mb-6">Ask me anything and I'll help you with information, creative tasks, problem-solving, and more.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(suggestion)}
              className="p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-red-300 transition-colors"
            >
              <span className="text-sm font-medium text-gray-900">{suggestion}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MainSidebar = ({ activeSection, setActiveSection }) => (
  <div className="bg-white shadow-lg h-full flex flex-col">
    <div className="p-6 border-b">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full"></div>
          <div className="w-2 h-2 bg-white rounded-full ml-1"></div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">DigiMate</h1>
          <p className="text-sm text-red-500">Your Internship Companion</p>
        </div>
      </div>
    </div>

    <nav className="flex-1 p-4">
      <div className="space-y-2">
        {[
          { id: 'home', icon: Home, label: 'Home', href: '/' },
          { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
          { id: 'chat', icon: MessageSquare, label: 'Chat', href: '/chat', active: true },
          { id: 'task', icon: CheckSquare, label: 'Task', href: '/tasks' },
          { id: 'schedule', icon: Calendar, label: 'Schedule', href: '/schedule' }
        ].map((item) => (
          item.href && !item.active ? (
            <Link key={item.id} href={item.href}>
              <div className="w-full flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer text-gray-600 hover:bg-gray-50">
                <item.icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          ) : (
            <div key={item.id} className="w-full flex flex-col items-center p-3 rounded-lg bg-red-50 text-red-600">
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          )
        ))}
      </div>
    </nav>
  </div>
);

const HistorySidebar = ({ 
  chats, 
  currentChatId, 
  setCurrentChatId,
  editingChatId,
  editingTitle,
  setEditingTitle,
  saveTitle,
  handleEditTitle,
  deleteChat,
  isOpen
}) => (
  <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
    isOpen ? 'w-64' : 'w-0'
  } flex flex-col overflow-hidden h-full`}>
    {/* Header */}
    {isOpen && (
      <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <span className="text-sm font-medium text-gray-700">Chat History</span>
      </div>
    )}
    
    {/* Chat List */}
    {isOpen && (
      <div className="flex-1 overflow-y-auto">
        {chats.map(chat => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={currentChatId === chat.id}
            onSelect={setCurrentChatId}
            onEdit={handleEditTitle}
            onDelete={deleteChat}
            editingChatId={editingChatId}
            editingTitle={editingTitle}
            setEditingTitle={setEditingTitle}
            saveTitle={saveTitle}
          />
        ))}
        
        {/* Empty state */}
        {chats.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">No chats yet</p>
          </div>
        )}
      </div>
    )}
  </div>
);

const MobileSidebar = ({ isOpen, onClose, children }) => (
  <>
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />
    )}
    <div className={`fixed left-0 top-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {children}
    </div>
  </>
);

const ChatbotApp = () => {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const inputRef = useRef(null);
  const userId = 'default_user';
  
  useEffect(() => {
    fetchChats();
  }, []);
  
  useEffect(() => {
    if (currentChatId) {
      fetchMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);
  
  const fetchChats = async () => {
    try {
      const response = await fetch(`/api/chat?userId=${userId}`);
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but got:', contentType);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setChats(data.data);
        if (data.data.length > 0 && !currentChatId) {
          setCurrentChatId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([
        {
          id: 'demo-1',
          title: 'Demo Chat',
          lastMessage: 'This is a demo message',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };
  
  const fetchMessages = async (chatId) => {
    try {
      const response = await fetch(`/api/messages?chatId=${chatId}`);
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        setMessages([]);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but got:', contentType);
        setMessages([]);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (chatId === 'demo-1') {
        setMessages([
          {
            id: 'msg-1',
            content: 'Hello! This is a demo message since the API is not available.',
            role: 'assistant',
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        setMessages([]);
      }
    }
  };
  
  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_chat',
          userId,
          title: 'New Chat'
        })
      });
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        const demoChat = {
          id: 'demo-' + Date.now(),
          title: 'New Chat',
          lastMessage: '',
          timestamp: new Date().toISOString()
        };
        setChats(prev => [demoChat, ...prev]);
        setCurrentChatId(demoChat.id);
        setMessages([]);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but got:', contentType);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setChats(prev => [data.data, ...prev]);
        setCurrentChatId(data.data.id);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      const demoChat = {
        id: 'demo-' + Date.now(),
        title: 'New Chat',
        lastMessage: '',
        timestamp: new Date().toISOString()
      };
      setChats(prev => [demoChat, ...prev]);
      setCurrentChatId(demoChat.id);
      setMessages([]);
    }
  };
  
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    if (!currentChatId) {
      await createNewChat();
      return;
    }
    
    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    
    const tempUserMessage = {
      id: 'temp-' + Date.now(),
      content: messageText,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          userId,
          chatId: currentChatId,
          message: messageText
        })
      });
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        const demoResponse = {
          id: 'response-' + Date.now(),
          content: 'Sorry, I cannot respond right now as the API is not available. This is a demo response.',
          role: 'assistant',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => {
          const withoutTemp = prev.filter(msg => !msg.id.startsWith('temp-'));
          return [...withoutTemp, tempUserMessage, demoResponse];
        });
        setIsLoading(false);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but got:', contentType);
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setMessages(prev => {
          const withoutTemp = prev.filter(msg => !msg.id.startsWith('temp-'));
          return [...withoutTemp, ...data.data];
        });
        
        const currentChat = chats.find(chat => chat.id === currentChatId);
        if (currentChat && currentChat.title === 'New Chat' && data.data.length > 0) {
          const newTitle = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : '');
          updateChatTitle(currentChatId, newTitle);
        }
        
        fetchChats();
      } else {
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const demoResponse = {
        id: 'response-' + Date.now(),
        content: 'Sorry, there was an error processing your message. This is a demo response.',
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => {
        const withoutTemp = prev.filter(msg => !msg.id.startsWith('temp-'));
        return [...withoutTemp, tempUserMessage, demoResponse];
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateChatTitle = async (chatId, newTitle) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chatId,
          title: newTitle
        })
      });
      
      if (response.ok) {
        setChats(prev => prev.map(chat => 
          chat.id === chatId ? { ...chat, title: newTitle } : chat
        ));
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };
  
  const deleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      const response = await fetch(`/api/chat?userId=${userId}&chatId=${chatId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
          const remainingChats = chats.filter(chat => chat.id !== chatId);
          setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };
  
  const handleEditTitle = (chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };
  
  const saveTitle = async () => {
    if (editingTitle.trim() && editingChatId) {
      await updateChatTitle(editingChatId, editingTitle.trim());
    }
    setEditingChatId(null);
    setEditingTitle('');
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
  };
  
  const currentChat = chats.find(chat => chat.id === currentChatId);
  
  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Main Sidebar (Desktop) */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64">
          <MainSidebar />
        </div>
      </div>

      {/* Mobile Main Sidebar */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <MainSidebar />
      </MobileSidebar>

      {/* History Sidebar (Desktop) */}
      <div className="hidden md:flex md:flex-shrink-0">
        <HistorySidebar
          chats={chats}
          currentChatId={currentChatId}
          setCurrentChatId={setCurrentChatId}
          editingChatId={editingChatId}
          editingTitle={editingTitle}
          setEditingTitle={setEditingTitle}
          saveTitle={saveTitle}
          handleEditTitle={handleEditTitle}
          deleteChat={deleteChat}
          isOpen={isHistoryOpen}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full ml-0.5"></div>
            </div>
            <span className="font-bold text-gray-800">DigiMate Chat</span>
          </div>
          <button
            onClick={createNewChat}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">DigiMate Chat</h1>
                <p className="text-sm text-gray-500">Powered by AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* History Toggle Button */}
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Toggle Chat History"
              >
                <History size={16} />
              </button>
              {/* New Chat Button */}
              <button
                onClick={createNewChat}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                title="New Chat"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {messages.length === 0 ? (
              <WelcomeScreen setInputMessage={setInputMessage} />
            ) : (
              <div>
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    isUser={message.role === 'user'}
                  />
                ))}
                {isLoading && <LoadingMessage />}
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onInput={handleTextareaInput}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-3 border border-gray-300 text-black rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent max-h-32"
                  rows={1}
                  disabled={isLoading}
                  style={{ minHeight: '50px', height: 'auto' }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-2xl transition-colors flex items-center justify-center min-w-[50px] h-[50px]"
              >
                <Send size={20} />
              </button>
            </div>
            
            {/* Footer Info */}
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="text-xs text-gray-500">
                {inputMessage.length > 0 && `${inputMessage.length} characters`}
              </div>
              <div className="text-xs text-gray-400">
                AI responses may contain errors. Please verify important information.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotApp;