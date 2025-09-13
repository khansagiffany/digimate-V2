// pages/api/messages/[chatId].js - Messages API Routes
export async function messagesHandler(req, res) {
  const { method } = req;
  const { chatId, userId = 'default_user' } = req.query;

  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID is required' });
  }

  try {
    switch (method) {
      case 'GET':
        return await getMessages(req, res, chatId);
      case 'POST':
        return await sendMessage(req, res, chatId, userId);
      case 'DELETE':
        return await deleteMessage(req, res, chatId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Messages API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMessages(req, res, chatId) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const messages = await KVService.get(`messages:${chatId}`) || [];
    
    // Sort by timestamp (oldest first for chat display)
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Apply pagination
    const paginatedMessages = messages.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    return res.status(200).json({
      success: true,
      data: paginatedMessages,
      count: paginatedMessages.length,
      total: messages.length,
      hasMore: parseInt(offset) + parseInt(limit) < messages.length
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

async function sendMessage(req, res, chatId, userId) {
  try {
    const { content, type = 'text', senderName } = req.body;
    
    if (!content || !senderName) {
      return res.status(400).json({ error: 'Content and sender name are required' });
    }
    
    // Get existing messages
    const existingMessages = await KVService.get(`messages:${chatId}`) || [];
    
    // Create new message
    const newMessage = {
      ...DataModels.Message,
      id: KVService.generateId(),
      chatId,
      senderId: userId,
      senderName,
      content,
      type,
      timestamp: new Date().toISOString()
    };
    
    // Add to existing messages
    const updatedMessages = [...existingMessages, newMessage];
    
    // Save messages
    const success = await KVService.set(`messages:${chatId}`, updatedMessages);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to send message' });
    }
    
    // Update chat with last message info
    // This would typically be done in a transaction in a real database
    // For KV, we'll do it as a separate operation
    const chats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    const chatIndex = chats.findIndex(chat => chat.id === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].lastMessage = content;
      chats[chatIndex].lastMessageTime = newMessage.timestamp;
      await KVService.hset(KV_KEYS.CHATS, userId, chats);
    }
    
    return res.status(201).json({
      success: true,
      data: newMessage,
      message: 'Message sent successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

async function deleteMessage(req, res, chatId) {
  try {
    const { messageId } = req.query;
    
    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }
    
    // Get existing messages
    const existingMessages = await KVService.get(`messages:${chatId}`) || [];
    
    // Filter out the message to delete
    const updatedMessages = existingMessages.filter(message => message.id !== messageId);
    
    if (updatedMessages.length === existingMessages.length) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Save updated messages
    const success = await KVService.set(`messages:${chatId}`, updatedMessages);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete message' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete message' });
  }
}