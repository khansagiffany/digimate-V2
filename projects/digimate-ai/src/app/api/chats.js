// pages/api/chats.js - Chat API Routes
export async function chatHandler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query;

  try {
    switch (method) {
      case 'GET':
        return await getChats(req, res, userId);
      case 'POST':
        return await createChat(req, res, userId);
      case 'PUT':
        return await updateChat(req, res, userId);
      case 'DELETE':
        return await deleteChat(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getChats(req, res, userId) {
  try {
    const chats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Sort by last message time (newest first)
    chats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    
    return res.status(200).json({
      success: true,
      data: chats,
      count: chats.length
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
}

async function createChat(req, res, userId) {
  try {
    const { participantId, participantName } = req.body;
    
    if (!participantId || !participantName) {
      return res.status(400).json({ error: 'Participant ID and name are required' });
    }
    
    // Get existing chats
    const existingChats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Check if chat already exists with this participant
    const existingChat = existingChats.find(chat => chat.participantId === participantId);
    
    if (existingChat) {
      return res.status(409).json({ error: 'Chat already exists with this participant' });
    }
    
    // Create new chat
    const newChat = {
      ...DataModels.Chat,
      id: KVService.generateId(),
      userId,
      participantId,
      participantName,
      createdAt: new Date().toISOString()
    };
    
    // Add to existing chats
    const updatedChats = [...existingChats, newChat];
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.CHATS, userId, updatedChats);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to create chat' });
    }
    
    return res.status(201).json({
      success: true,
      data: newChat,
      message: 'Chat created successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create chat' });
  }
}

async function updateChat(req, res, userId) {
  try {
    const { chatId } = req.query;
    const { lastMessage, lastMessageTime, unreadCount } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    // Get existing chats
    const existingChats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Find chat index
    const chatIndex = existingChats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex === -1) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Update chat
    existingChats[chatIndex] = {
      ...existingChats[chatIndex],
      lastMessage: lastMessage || existingChats[chatIndex].lastMessage,
      lastMessageTime: lastMessageTime || new Date().toISOString(),
      unreadCount: unreadCount !== undefined ? unreadCount : existingChats[chatIndex].unreadCount
    };
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.CHATS, userId, existingChats);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update chat' });
    }
    
    return res.status(200).json({
      success: true,
      data: existingChats[chatIndex],
      message: 'Chat updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update chat' });
  }
}

async function deleteChat(req, res, userId) {
  try {
    const { chatId } = req.query;
    
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    
    // Get existing chats
    const existingChats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    
    // Filter out the chat to delete
    const updatedChats = existingChats.filter(chat => chat.id !== chatId);
    
    if (updatedChats.length === existingChats.length) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.CHATS, userId, updatedChats);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete chat' });
    }
    
    // Also delete all messages for this chat
    await KVService.del(`messages:${chatId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete chat' });
  }
}