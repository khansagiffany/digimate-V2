// pages/api/schedule.js - Schedule API Routes
import { KVService, KV_KEYS, DataModels } from '../../lib/kv';

export default async function handler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query;

  try {
    switch (method) {
      case 'GET':
        return await getSchedules(req, res, userId);
      case 'POST':
        return await createSchedule(req, res, userId);
      case 'PUT':
        return await updateSchedule(req, res, userId);
      case 'DELETE':
        return await deleteSchedule(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Schedule API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getSchedules(req, res, userId) {
  try {
    const schedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
    
    // Filter options
    const { date, type, recurring } = req.query;
    let filteredSchedules = schedules;
    
    // Filter by date
    if (date) {
      filteredSchedules = filteredSchedules.filter(schedule => schedule.date === date);
    }
    
    // Filter by type
    if (type) {
      filteredSchedules = filteredSchedules.filter(schedule => schedule.type === type);
    }
    
    // Filter by recurring
    if (recurring !== undefined) {
      const isRecurring = recurring === 'true';
      filteredSchedules = filteredSchedules.filter(schedule => schedule.recurring === isRecurring);
    }
    
    // Sort by date and start time
    filteredSchedules.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.startTime}`);
      const dateB = new Date(`${b.date} ${b.startTime}`);
      return dateA - dateB;
    });
    
    return res.status(200).json({
      success: true,
      data: filteredSchedules,
      count: filteredSchedules.length
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch schedules' });
  }
}

async function createSchedule(req, res, userId) {
  try {
    const { title, description, date, startTime, endTime, type, recurring, recurringPattern, reminder, reminderTime } = req.body;
    
    if (!title || !date || !startTime) {
      return res.status(400).json({ error: 'Title, date, and start time are required' });
    }
    
    // Validate schedule type
    const validTypes = ['work', 'meeting', 'personal', 'study'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid schedule type' });
    }
    
    // Get existing schedules
    const existingSchedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
    
    // Create new schedule
    const newSchedule = {
      ...DataModels.Schedule,
      id: KVService.generateId(),
      userId,
      title,
      description: description || '',
      date,
      startTime,
      endTime: endTime || '',
      type: type || 'work',
      recurring: recurring || false,
      recurringPattern: recurringPattern || null,
      reminder: reminder || false,
      reminderTime: reminderTime || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to existing schedules
    const updatedSchedules = [...existingSchedules, newSchedule];
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.SCHEDULES, userId, updatedSchedules);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to create schedule' });
    }
    
    return res.status(201).json({
      success: true,
      data: newSchedule,
      message: 'Schedule created successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create schedule' });
  }
}

async function updateSchedule(req, res, userId) {
  try {
    const { scheduleId } = req.query;
    const updateData = req.body;
    
    if (!scheduleId) {
      return res.status(400).json({ error: 'Schedule ID is required' });
    }
    
    // Get existing schedules
    const existingSchedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
    
    // Find schedule index
    const scheduleIndex = existingSchedules.findIndex(schedule => schedule.id === scheduleId);
    
    if (scheduleIndex === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Update schedule
    const updatedSchedule = {
      ...existingSchedules[scheduleIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Replace in array
    existingSchedules[scheduleIndex] = updatedSchedule;
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.SCHEDULES, userId, existingSchedules);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update schedule' });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedSchedule,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update schedule' });
  }
}

async function deleteSchedule(req, res, userId) {
  try {
    const { scheduleId } = req.query;
    
    if (!scheduleId) {
      return res.status(400).json({ error: 'Schedule ID is required' });
    }
    
    // Get existing schedules
    const existingSchedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
    
    // Filter out the schedule to delete
    const updatedSchedules = existingSchedules.filter(schedule => schedule.id !== scheduleId);
    
    if (updatedSchedules.length === existingSchedules.length) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.SCHEDULES, userId, updatedSchedules);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete schedule' });
  }
}