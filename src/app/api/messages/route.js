// src/app/api/messages/route.js
import { NextRequest, NextResponse } from 'next/server';

// Mock KV Service - sama seperti di chat route
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
  
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

const KV_KEYS = {
  MESSAGES: 'chat_messages'
};

// GET - Fetch messages for a specific chat
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }
    
    const messages = await MockKVService.hget(KV_KEYS.MESSAGES, chatId) || [];
    
    // Sort by timestamp (oldest first)
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Apply pagination
    const paginatedMessages = messages.slice(offset, offset + limit);
    
    return NextResponse.json({
      success: true,
      data: paginatedMessages,
      count: paginatedMessages.length,
      total: messages.length,
      hasMore: offset + limit < messages.length
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// DELETE - Clear all messages in a chat
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }
    
    await MockKVService.hset(KV_KEYS.MESSAGES, chatId, []);
    
    return NextResponse.json({
      success: true,
      message: 'Messages cleared successfully'
    });
  } catch (error) {
    console.error('Delete messages error:', error);
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 });
  }
}