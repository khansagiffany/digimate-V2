// src/app/api/messages/route.js
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '../../../lib/database.js';

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
    
    // Get messages from database
    const messages = await DatabaseService.getMessages(chatId, limit, offset);
    const totalCount = await DatabaseService.getMessageCount(chatId);
    
    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: msg.timestamp
    }));
    
    console.log('Found', messages.length, 'messages for chat:', chatId);
    
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
    
    const message = await DatabaseService.addMessage(chatId, content, role);
    
    return NextResponse.json({
      success: true,
      data: {
        id: message.id,
        content: message.content,
        role: message.role,
        timestamp: message.timestamp
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
    
    await DatabaseService.clearMessages(chatId);
    
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
    
    const searchResults = await DatabaseService.searchMessages(userId, query, limit);
    
    const formattedResults = searchResults.map(result => ({
      id: result.id,
      content: result.content,
      role: result.role,
      timestamp: result.timestamp,
      chatId: result.chat_id,
      chatTitle: result.chat_title
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