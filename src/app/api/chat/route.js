// src/app/api/chat/route.js
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
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

// Improved Gemini AI Integration
async function callGeminiAPI(messages) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found in environment variables');
    throw new Error('AI service not configured. Please check environment variables.');
  }

  try {
    console.log('Calling Gemini API with', messages.length, 'messages');
    
    // Use the Google AI SDK (recommended approach)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    
    // Start chat with history
    const chat = model.startChat({ history });
    
    // Send the latest message
    const result = await chat.sendMessage(latestMessage.content);
    const response = await result.response;
    const responseText = response.text();

    console.log('Gemini API response received:', responseText.substring(0, 100) + '...');
    return responseText;

  } catch (error) {
    console.error('Gemini API Error Details:', error);
    
    // Handle specific API errors
    if (error.message?.includes('API_KEY')) {
      throw new Error('Invalid API key. Please check your Gemini API key.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please check your Gemini API usage.');
    } else if (error.message?.includes('SAFETY')) {
      throw new Error('Content blocked by safety filters. Please rephrase your message.');
    } else {
      throw new Error(`AI service error: ${error.message || 'Unknown error occurred'}`);
    }
  }
}

// GET - Fetch all chats for user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    
    console.log('Fetching chats for user:', userId);
    
    const chats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Sort by last message time (newest first)
    chats.sort((a, b) => new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt));
    
    console.log('Found', chats.length, 'chats for user:', userId);
    
    return NextResponse.json({
      success: true,
      data: chats,
      count: chats.length
    });
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch chats',
      message: error.message 
    }, { status: 500 });
  }
}

// POST - Create new chat or send message
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, userId = 'default_user', chatId, message } = body;
    
    console.log('POST request:', { action, userId, chatId, messagePreview: message?.substring(0, 50) });
    
    if (action === 'create_chat') {
      return await createNewChat(userId, body.title);
    } else if (action === 'send_message') {
      return await sendMessage(userId, chatId, message);
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid action. Expected "create_chat" or "send_message"' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

// PUT - Update chat
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId = 'default_user', chatId, title } = body;
    
    if (!chatId) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat ID is required' 
      }, { status: 400 });
    }
    
    const chats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex === -1) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat not found' 
      }, { status: 404 });
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
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update chat',
      message: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete chat
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat ID is required' 
      }, { status: 400 });
    }
    
    const chats = await MockKVService.hget(KV_KEYS.CHATS, userId) || [];
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    
    if (updatedChats.length === chats.length) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat not found' 
      }, { status: 404 });
    }
    
    await MockKVService.hset(KV_KEYS.CHATS, userId, updatedChats);
    await MockKVService.del(`${KV_KEYS.MESSAGES}:${chatId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete chat',
      message: error.message 
    }, { status: 500 });
  }
}

// Helper Functions
async function createNewChat(userId, title = 'New Chat') {
  try {
    console.log('Creating new chat for user:', userId, 'with title:', title);
    
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
    
    console.log('New chat created:', newChat.id);
    
    return NextResponse.json({
      success: true,
      data: newChat,
      message: 'Chat created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Create chat error:', error);
    throw error;
  }
}

async function sendMessage(userId, chatId, messageContent) {
  try {
    if (!chatId || !messageContent) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat ID and message are required' 
      }, { status: 400 });
    }
    
    console.log('Sending message to chat:', chatId, 'Message:', messageContent.substring(0, 50));
    
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
    
    let aiMessage;
    
    // Get AI response from Gemini
    try {
      console.log('Getting AI response...');
      const aiResponse = await callGeminiAPI(messages.slice(-10)); // Send last 10 messages for context
      
      // Create AI message
      aiMessage = {
        ...DataModels.Message,
        id: MockKVService.generateId(),
        chatId,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      console.log('AI response generated successfully');
      
    } catch (aiError) {
      console.error('AI API Error:', aiError);
      
      // Create error message with more specific error info
      aiMessage = {
        ...DataModels.Message,
        id: MockKVService.generateId(),
        chatId,
        content: `Sorry, I encountered an error: ${aiError.message || 'Please try again.'}`,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
    }
    
    // Add AI message to conversation
    messages.push(aiMessage);
    
    // Update chat's last message info
    await updateChatLastMessage(userId, chatId, aiMessage.content);
    
    // Save updated messages
    await MockKVService.hset(KV_KEYS.MESSAGES, chatId, messages);
    
    console.log('Message conversation updated successfully');
    
    return NextResponse.json({
      success: true,
      data: messages.slice(-2), // Return last 2 messages (user + AI)
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to send message',
      message: error.message 
    }, { status: 500 });
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