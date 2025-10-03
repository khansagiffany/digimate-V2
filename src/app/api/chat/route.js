// src/app/api/chat/route.js
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { KVService, KV_KEYS, DataModels } from '../../../lib/kv.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
    
    // Get chats from KV
    const chats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Convert to frontend format
    const formattedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title || 'New Chat',
      lastMessage: chat.lastMessage,
      timestamp: chat.lastMessageTime || chat.createdAt,
      createdAt: chat.createdAt,
      unreadCount: chat.unreadCount || 0
    }));
    
    console.log('Found', formattedChats.length, 'chats for user:', userId);
    
    return NextResponse.json({
      success: true,
      data: formattedChats,
      count: formattedChats.length
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
    
    // Get existing chats
    const existingChats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Find and update chat
    const chatIndex = existingChats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex === -1) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat not found' 
      }, { status: 404 });
    }
    
    // Update chat
    existingChats[chatIndex] = {
      ...existingChats[chatIndex],
      title: title || existingChats[chatIndex].title,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to KV
    await KVService.hset(KV_KEYS.CHATS, userId, existingChats);
    
    const updatedChat = existingChats[chatIndex];
    
    return NextResponse.json({
      success: true,
      data: {
        id: updatedChat.id,
        title: updatedChat.title,
        lastMessage: updatedChat.lastMessage,
        timestamp: updatedChat.lastMessageTime || updatedChat.createdAt
      },
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
    
    // Get existing chats
    const existingChats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Remove chat
    const updatedChats = existingChats.filter(chat => chat.id !== chatId);
    
    if (updatedChats.length === existingChats.length) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat not found' 
      }, { status: 404 });
    }
    
    // Save back to KV
    await KVService.hset(KV_KEYS.CHATS, userId, updatedChats);
    
    // Also delete messages for this chat
    await KVService.del(`messages:${chatId}`);
    
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
    
    // Get existing chats
    const existingChats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Create new chat
    const newChat = {
      ...DataModels.Chat,
      id: KVService.generateId(),
      userId,
      title,
      createdAt: new Date().toISOString()
    };
    
    // Add to chats array
    const updatedChats = [newChat, ...existingChats];
    
    // Save to KV
    await KVService.hset(KV_KEYS.CHATS, userId, updatedChats);
    
    console.log('New chat created:', newChat.id);
    
    return NextResponse.json({
      success: true,
      data: {
        id: newChat.id,
        title: newChat.title,
        lastMessage: newChat.lastMessage,
        timestamp: newChat.createdAt
      },
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
    
    // Get existing messages for this chat
    const messagesKey = `messages:${chatId}`;
    const existingMessages = await KVService.get(messagesKey) || [];
    
    // Create user message
    const userMessage = {
      ...DataModels.Message,
      id: KVService.generateId(),
      chatId,
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Add user message to messages
    const updatedMessages = [...existingMessages, userMessage];
    
    // Get recent messages for AI context (last 10)
    const recentMessages = updatedMessages.slice(-10);
    
    let aiMessage;
    
    // Get AI response from Gemini
    try {
      console.log('Getting AI response...');
      const aiResponse = await callGeminiAPI(recentMessages);
      
      // Create AI message
      aiMessage = {
        ...DataModels.Message,
        id: KVService.generateId(),
        chatId,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      console.log('AI response generated successfully');
      
    } catch (aiError) {
      console.error('AI API Error:', aiError);
      
      // Create error message
      const errorMessage = `Sorry, I encountered an error: ${aiError.message || 'Please try again.'}`;
      aiMessage = {
        ...DataModels.Message,
        id: KVService.generateId(),
        chatId,
        content: errorMessage,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
    }
    
    // Add AI message to messages
    const finalMessages = [...updatedMessages, aiMessage];
    
    // Save messages to KV
    await KVService.set(messagesKey, finalMessages);
    
    // Update chat with last message info
    const existingChats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    const chatIndex = existingChats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
      existingChats[chatIndex] = {
        ...existingChats[chatIndex],
        lastMessage: aiMessage.content.substring(0, 100) + (aiMessage.content.length > 100 ? '...' : ''),
        lastMessageTime: aiMessage.timestamp
      };
      
      await KVService.hset(KV_KEYS.CHATS, userId, existingChats);
    }
    
    console.log('Message conversation updated successfully');
    
    // Return formatted messages
    const formattedMessages = [userMessage, aiMessage].map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: msg.timestamp
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedMessages,
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