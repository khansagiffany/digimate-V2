// src/app/api/messages/route.js
import { NextRequest, NextResponse } from 'next/server';
import { KVService, DataModels } from '../../../lib/kv.js';

// GET - Fetch messages for a specific chat
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    
    console.log('Fetching messages for chat:', chatId);
    
    if (!chatId) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat ID is required' 
      }, { status: 400 });
    }
    
    // Get messages from KV
    const messagesKey = `messages:${chatId}`;
    const allMessages = await KVService.get(messagesKey) || [];
    
    // Apply pagination
    const totalCount = allMessages.length;
    const paginatedMessages = allMessages.slice(offset, offset + limit);
    
    // Format messages for frontend
    const formattedMessages = paginatedMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: msg.timestamp
    }));
    
    console.log('Found', paginatedMessages.length, 'messages for chat:', chatId);
    
    return NextResponse.json({
      success: true,
      data: formattedMessages,
      count: formattedMessages.length,
      total: totalCount,
      hasMore: offset + limit < totalCount
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch messages',
      message: error.message 
    }, { status: 500 });
  }
}

// POST - Add a single message (useful for testing or manual message creation)
export async function POST(request) {
  try {
    const body = await request.json();
    const { chatId, content, role = 'user' } = body;
    
    if (!chatId || !content) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat ID and content are required' 
      }, { status: 400 });
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json({ 
        success: false,
        error: 'Role must be either "user" or "assistant"' 
      }, { status: 400 });
    }
    
    // Get existing messages
    const messagesKey = `messages:${chatId}`;
    const existingMessages = await KVService.get(messagesKey) || [];
    
    // Create new message
    const newMessage = {
      ...DataModels.Message,
      id: KVService.generateId(),
      chatId,
      content,
      role,
      timestamp: new Date().toISOString()
    };
    
    // Add message to array
    const updatedMessages = [...existingMessages, newMessage];
    
    // Save back to KV
    await KVService.set(messagesKey, updatedMessages);
    
    return NextResponse.json({
      success: true,
      data: {
        id: newMessage.id,
        content: newMessage.content,
        role: newMessage.role,
        timestamp: newMessage.timestamp
      },
      message: 'Message added successfully'
    });
  } catch (error) {
    console.error('Add message error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to add message',
      message: error.message 
    }, { status: 500 });
  }
}

// DELETE - Clear all messages in a chat
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json({ 
        success: false,
        error: 'Chat ID is required' 
      }, { status: 400 });
    }
    
    // Delete messages from KV
    const messagesKey = `messages:${chatId}`;
    await KVService.del(messagesKey);
    
    return NextResponse.json({
      success: true,
      message: 'Messages cleared successfully'
    });
  } catch (error) {
    console.error('Delete messages error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to clear messages',
      message: error.message 
    }, { status: 500 });
  }
}

// Search endpoint (bonus feature)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId, query, limit = 20 } = body;
    
    if (!userId || !query) {
      return NextResponse.json({ 
        success: false,
        error: 'User ID and search query are required' 
      }, { status: 400 });
    }
    
    // Get user's chats to find all chat IDs
    const userChats = await KVService.hget('chats', userId) || [];
    const searchResults = [];
    
    // Search through all chat messages
    for (const chat of userChats) {
      try {
        const messagesKey = `messages:${chat.id}`;
        const chatMessages = await KVService.get(messagesKey) || [];
        
        // Filter messages that contain the search query
        const matchingMessages = chatMessages
          .filter(msg => msg.content.toLowerCase().includes(query.toLowerCase()))
          .map(msg => ({
            ...msg,
            chatId: chat.id,
            chatTitle: chat.title
          }));
        
        searchResults.push(...matchingMessages);
      } catch (error) {
        console.warn(`Failed to search in chat ${chat.id}:`, error);
        continue;
      }
    }
    
    // Sort by timestamp (newest first) and limit results
    const sortedResults = searchResults
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    const formattedResults = sortedResults.map(result => ({
      id: result.id,
      content: result.content,
      role: result.role,
      timestamp: result.timestamp,
      chatId: result.chatId,
      chatTitle: result.chatTitle
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedResults,
      count: formattedResults.length,
      query: query
    });
  } catch (error) {
    console.error('Search messages error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to search messages',
      message: error.message 
    }, { status: 500 });
  }
}