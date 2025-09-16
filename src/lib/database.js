// lib/database.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db = null;

// Initialize database connection
export async function initDatabase() {
  if (db) return db;
  
  const dbPath = path.join(process.cwd(), 'data', 'chat.db');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message TEXT,
      last_message_time DATETIME,
      unread_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  `);

  console.log('Database initialized successfully');
  return db;
}

// Database service class
export class DatabaseService {
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Chat operations
  static async getChats(userId) {
    const database = await initDatabase();
    return await database.all(
      'SELECT * FROM chats WHERE user_id = ? ORDER BY last_message_time DESC, created_at DESC',
      [userId]
    );
  }

  static async createChat(userId, title = 'New Chat') {
    const database = await initDatabase();
    const chatId = this.generateId();
    const now = new Date().toISOString();
    
    await database.run(
      'INSERT INTO chats (id, user_id, title, created_at) VALUES (?, ?, ?, ?)',
      [chatId, userId, title, now]
    );
    
    return await database.get('SELECT * FROM chats WHERE id = ?', [chatId]);
  }

  static async updateChat(chatId, updates) {
    const database = await initDatabase();
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    });
    
    values.push(chatId);
    
    await database.run(
      `UPDATE chats SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return await database.get('SELECT * FROM chats WHERE id = ?', [chatId]);
  }

  static async deleteChat(chatId) {
    const database = await initDatabase();
    await database.run('DELETE FROM chats WHERE id = ?', [chatId]);
  }

  // Message operations
  static async getMessages(chatId, limit = 50, offset = 0) {
    const database = await initDatabase();
    return await database.all(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp ASC LIMIT ? OFFSET ?',
      [chatId, limit, offset]
    );
  }

  static async getMessageCount(chatId) {
    const database = await initDatabase();
    const result = await database.get(
      'SELECT COUNT(*) as count FROM messages WHERE chat_id = ?',
      [chatId]
    );
    return result.count;
  }

  static async addMessage(chatId, content, role) {
    const database = await initDatabase();
    const messageId = this.generateId();
    const now = new Date().toISOString();
    
    await database.run(
      'INSERT INTO messages (id, chat_id, content, role, timestamp) VALUES (?, ?, ?, ?, ?)',
      [messageId, chatId, content, role, now]
    );
    
    // Update chat's last message
    await this.updateChat(chatId, {
      last_message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      last_message_time: now
    });
    
    return await database.get('SELECT * FROM messages WHERE id = ?', [messageId]);
  }

  static async clearMessages(chatId) {
    const database = await initDatabase();
    await database.run('DELETE FROM messages WHERE chat_id = ?', [chatId]);
    
    // Update chat's last message
    await this.updateChat(chatId, {
      last_message: null,
      last_message_time: null
    });
  }

  // Search messages
  static async searchMessages(userId, query, limit = 20) {
    const database = await initDatabase();
    return await database.all(`
      SELECT m.*, c.title as chat_title 
      FROM messages m 
      JOIN chats c ON m.chat_id = c.id 
      WHERE c.user_id = ? AND m.content LIKE ? 
      ORDER BY m.timestamp DESC 
      LIMIT ?
    `, [userId, `%${query}%`, limit]);
  }
}