// src/app/api/chat/route.js
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Mock KV Service - ganti dengan Redis atau database asli
class MockKVService {
  static data = new Map();
  
  static async hget(key, field) {
    const hash = this.data.get(key) || {};
    return hash[field];
  }
  
  static async hset(key, field, value) {
    const hash = this.data.get(key) || {};
    hash[field] = value;
    this.data.set(key, hash);
    return true;
  }
  
  static async del(key) {
    return this.data.delete(key);
  }
  
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

const KV_KEYS = {
  CHATS: 'user_chats',
  MESSAGES: 'chat_messages'
};

// Data Models
const DataModels = {
  Chat: {
    id: null,
    userId: null,
    title: 'New Chat',
    createdAt: null,
    lastMessage: null,
    lastMessageTime: null,
    unreadCount: 0
  },
  Message: {
    id: null,
    chatId: null,
    content: '',
    role: 'user', // 'user' | 'assistant'
    timestamp: null
  }
};

// Gemini AI Integration
async function callGeminiAPI(messages) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages.map(msg => ({
          parts: [{ text: msg.content }],
          role: msg.role === 'assistant' ? 'model' : 'user'
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}
// async function callGeminiAPI(messages) {
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
//     const history = messages.map(m => ({
//       role: m.role === 'user' ? 'user' : 'model',
//       parts: [{ text: m.content }],
//     }));
  
//     const result = await model.generateContent({
//       contents: history,
//     });
  
//     return result.response.text();
//   }
  

// GET - Fetch all chats for user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    
    const chats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Sort by last message time (newest first)
    chats.sort((a, b) => new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt));
    
    return NextResponse.json({
      success: true,
      data: chats,
      count: chats.length
    });
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// POST - Create new chat or send message
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, userId = 'default_user', chatId, message } = body;
    
    if (action === 'create_chat') {
      return await createNewChat(userId, body.title);
    } else if (action === 'send_message') {
      return await sendMessage(userId, chatId, message);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update chat
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId = 'default_user', chatId, title } = body;
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }
    
    const chats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex === -1) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    
    // Update chat
    chats[chatIndex] = {
      ...chats[chatIndex],
      title: title || chats[chatIndex].title
    };
    
    await MockKVService.hset(KV_KEYS.CHATS, userId, chats);
    
    return NextResponse.json({
      success: true,
      data: chats[chatIndex],
      message: 'Chat updated successfully'
    });
  } catch (error) {
    console.error('Update chat error:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}

// DELETE - Delete chat
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }
    
    const chats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    
    if (updatedChats.length === chats.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }
    
    await MockKVService.hset(KV_KEYS.CHATS, userId, updatedChats);
    await MockKVService.del(`${KV_KEYS.MESSAGES}:${chatId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}

// Helper Functions
async function createNewChat(userId, title = 'New Chat') {
  try {
    const existingChats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    
    const newChat = {
      ...DataModels.Chat,
      id: MockKVService.generateId(),
      userId,
      title,
      createdAt: new Date().toISOString()
    };
    
    const updatedChats = [newChat, ...existingChats];
    await MockKVService.hset(KV_KEYS.CHATS, userId, updatedChats);
    
    return NextResponse.json({
      success: true,
      data: newChat,
      message: 'Chat created successfully'
    }, { status: 201 });
  } catch (error) {
    throw error;
  }
}

async function sendMessage(userId, chatId, messageContent) {
  try {
    if (!chatId || !messageContent) {
      return NextResponse.json({ error: 'Chat ID and message are required' }, { status: 400 });
    }
    
    // Get existing messages
    const messages = await MockKVService.hget(KV_KEYS.MESSAGES, chatId) || [];
    
    // Create user message
    const userMessage = {
      ...DataModels.Message,
      id: MockKVService.generateId(),
      chatId,
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Add user message to conversation
    messages.push(userMessage);
    
    // Get AI response from Gemini
    try {
      const aiResponse = await callGeminiAPI(messages.slice(-10)); // Send last 10 messages for context
      
      // Create AI message
      const aiMessage = {
        ...DataModels.Message,
        id: MockKVService.generateId(),
        chatId,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      // Add AI message to conversation
      messages.push(aiMessage);
      
      // Update chat's last message info
      await updateChatLastMessage(userId, chatId, aiResponse);
      
    } catch (aiError) {
      console.error('AI API Error:', aiError);
      // Create error message
      const errorMessage = {
        ...DataModels.Message,
        id: MockKVService.generateId(),
        chatId,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      messages.push(errorMessage);
    }
    
    // Save updated messages
    await MockKVService.hset(KV_KEYS.MESSAGES, chatId, messages);
    
    return NextResponse.json({
      success: true,
      data: messages.slice(-2), // Return last 2 messages (user + AI)
      message: 'Message sent successfully'
    });
  } catch (error) {
    throw error;
  }
}

async function updateChatLastMessage(userId, chatId, lastMessage) {
  try {
    const chats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].lastMessage = lastMessage.substring(0, 100) + (lastMessage.length > 100 ? '...' : '');
      chats[chatIndex].lastMessageTime = new Date().toISOString();
      await MockKVService.hset(KV_KEYS.CHATS, userId, chats);
    }
  } catch (error) {
    console.error('Update chat last message error:', error);
  }
}