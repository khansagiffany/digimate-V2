// lib/kv.js - KV Database Configuration
import { kv } from '@vercel/kv';

// KV Keys Schema
export const KV_KEYS = {
  USERS: 'users',
  TASKS: 'tasks',
  EVENTS: 'events', 
  CHATS: 'chats',
  PROFILES: 'profiles',
  SCHEDULES: 'schedules'
};

// Helper functions for KV operations
export class KVService {
  static async get(key) {
    try {
      const data = await kv.get(key);
      return data || null;
    } catch (error) {
      console.error('KV Get Error:', error);
      return null;
    }
  }

  static async set(key, value) {
    try {
      await kv.set(key, value);
      return true;
    } catch (error) {
      console.error('KV Set Error:', error);
      return false;
    }
  }

  static async del(key) {
    try {
      await kv.del(key);
      return true;
    } catch (error) {
      console.error('KV Delete Error:', error);
      return false;
    }
  }

  static async hget(key, field) {
    try {
      const data = await kv.hget(key, field);
      return data || null;
    } catch (error) {
      console.error('KV HGet Error:', error);
      return null;
    }
  }

  static async hset(key, field, value) {
    try {
      await kv.hset(key, { [field]: value });
      return true;
    } catch (error) {
      console.error('KV HSet Error:', error);
      return false;
    }
  }

  static async hgetall(key) {
    try {
      const data = await kv.hgetall(key);
      return data || {};
    } catch (error) {
      console.error('KV HGetAll Error:', error);
      return {};
    }
  }

  static async sadd(key, ...members) {
    try {
      await kv.sadd(key, ...members);
      return true;
    } catch (error) {
      console.error('KV SAdd Error:', error);
      return false;
    }
  }

  static async smembers(key) {
    try {
      const data = await kv.smembers(key);
      return data || [];
    } catch (error) {
      console.error('KV SMembers Error:', error);
      return [];
    }
  }

  static async srem(key, ...members) {
    try {
      await kv.srem(key, ...members);
      return true;
    } catch (error) {
      console.error('KV SRem Error:', error);
      return false;
    }
  }

  // Generate unique IDs
  static generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get user-specific key
  static getUserKey(userId, type) {
    return `user:${userId}:${type}`;
  }
}

// Data Models
export const DataModels = {
  Task: {
    id: '',
    userId: '',
    title: '',
    description: '',
    status: 'pending', // pending, in_progress, completed
    priority: 'medium', // low, medium, high
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  Event: {
    id: '',
    userId: '',
    title: '',
    description: '',
    type: 'interview', // interview, meeting, deadline, announcement
    date: '',
    time: '',
    location: '',
    status: 'upcoming', // upcoming, ongoing, completed, cancelled
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  Chat: {
    id: '',
    userId: '',
    participantId: '',
    participantName: '',
    lastMessage: '',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 0,
    createdAt: new Date().toISOString()
  },

  Message: {
    id: '',
    chatId: '',
    senderId: '',
    senderName: '',
    content: '',
    type: 'text', // text, image, file
    timestamp: new Date().toISOString()
  },

  Profile: {
    id: '',
    userId: '',
    name: '',
    email: '',
    phone: '',
    university: '',
    major: '',
    internshipStatus: 'applying', // applying, accepted, ongoing, completed
    company: '',
    position: '',
    startDate: null,
    endDate: null,
    avatar: '',
    bio: '',
    skills: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  Schedule: {
    id: '',
    userId: '',
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'work', // work, meeting, personal, study
    recurring: false,
    recurringPattern: null, // daily, weekly, monthly
    reminder: false,
    reminderTime: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

// Initialize default data
export async function initializeDefaultData(userId) {
  try {
    // Create default profile
    const defaultProfile = {
      ...DataModels.Profile,
      id: KVService.generateId(),
      userId,
      name: 'User',
      internshipStatus: 'applying'
    };

    // Create default events
    const defaultEvents = [
      {
        ...DataModels.Event,
        id: KVService.generateId(),
        userId,
        title: 'Interview',
        type: 'interview',
        date: '2025-01-30',
        status: 'upcoming'
      },
      {
        ...DataModels.Event,
        id: KVService.generateId(),
        userId,
        title: 'Pengumuman akhir',
        type: 'announcement',
        date: '2025-02-03',
        status: 'upcoming'
      },
      {
        ...DataModels.Event,
        id: KVService.generateId(),
        userId,
        title: 'Onboarding',
        type: 'meeting',
        date: '2025-02-10',
        status: 'upcoming'
      }
    ];

    // Save to KV
    await KVService.hset(KV_KEYS.PROFILES, userId, defaultProfile);
    await KVService.hset(KV_KEYS.EVENTS, userId, defaultEvents);
    await KVService.hset(KV_KEYS.TASKS, userId, []);
    await KVService.hset(KV_KEYS.CHATS, userId, []);
    await KVService.hset(KV_KEYS.SCHEDULES, userId, []);

    return true;
  } catch (error) {
    console.error('Initialize Default Data Error:', error);
    return false;
  }
}