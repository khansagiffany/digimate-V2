// src/app/api/chat/route.js
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DatabaseService } from '../../../lib/database.js';

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
    
    const chats = await DatabaseService.getChats(userId);
    
    // Convert database format to frontend format
    const formattedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      lastMessage: chat.last_message,
      timestamp: chat.last_message_time || chat.created_at,
      createdAt: chat.created_at,
      unreadCount: chat.unread_count
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
    
    const updatedChat = await DatabaseService.updateChat(chatId, { title });
    
    if (!updatedChat) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: updatedChat.id,
        title: updatedChat.title,
        lastMessage: updatedChat.last_message,
        timestamp: updatedChat.last_message_time || updatedChat.created_at
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
    
    await DatabaseService.deleteChat(chatId);
    
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
    
    const newChat = await DatabaseService.createChat(userId, title);
    
    console.log('New chat created:', newChat.id);
    
    return NextResponse.json({
      success: true,
      data: {
        id: newChat.id,
        title: newChat.title,
        lastMessage: newChat.last_message,
        timestamp: newChat.created_at
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
    
    // Get recent messages for context (last 10 messages)
    const recentMessages = await DatabaseService.getMessages(chatId, 10);
    
    // Add user message to database
    const userMessage = await DatabaseService.addMessage(chatId, messageContent, 'user');
    
    // Prepare messages for AI (including the new user message)
    const messagesForAI = [...recentMessages, userMessage];
    
    let aiMessage;
    
    // Get AI response from Gemini
    try {
      console.log('Getting AI response...');
      const aiResponse = await callGeminiAPI(messagesForAI);
      
      // Add AI message to database
      aiMessage = await DatabaseService.addMessage(chatId, aiResponse, 'assistant');
      
      console.log('AI response generated and saved successfully');
      
    } catch (aiError) {
      console.error('AI API Error:', aiError);
      
      // Add error message to database
      const errorMessage = `Sorry, I encountered an error: ${aiError.message || 'Please try again.'}`;
      aiMessage = await DatabaseService.addMessage(chatId, errorMessage, 'assistant');
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