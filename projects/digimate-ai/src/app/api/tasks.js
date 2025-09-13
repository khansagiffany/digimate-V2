// pages/api/tasks.js - Tasks API Routes
import { KVService, KV_KEYS, DataModels } from '../../lib/kv';

export default async function handler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query; // In production, get from auth

  try {
    switch (method) {
      case 'GET':
        return await getTasks(req, res, userId);
      case 'POST':
        return await createTask(req, res, userId);
      case 'PUT':
        return await updateTask(req, res, userId);
      case 'DELETE':
        return await deleteTask(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Tasks API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTasks(req, res, userId) {
  try {
    const tasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    
    // Filter by status if provided
    const { status, priority } = req.query;
    let filteredTasks = tasks;
    
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    
    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }
    
    // Sort by creation date (newest first)
    filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return res.status(200).json({
      success: true,
      data: filteredTasks,
      count: filteredTasks.length
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

async function createTask(req, res, userId) {
  try {
    const { title, description, priority = 'medium', dueDate } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Get existing tasks
    const existingTasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    
    // Create new task
    const newTask = {
      ...DataModels.Task,
      id: KVService.generateId(),
      userId,
      title,
      description: description || '',
      priority,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to existing tasks
    const updatedTasks = [...existingTasks, newTask];
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.TASKS, userId, updatedTasks);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to create task' });
    }
    
    return res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create task' });
  }
}

async function updateTask(req, res, userId) {
  try {
    const { taskId } = req.query;
    const updateData = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    // Get existing tasks
    const existingTasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    
    // Find task index
    const taskIndex = existingTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update task
    const updatedTask = {
      ...existingTasks[taskIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Replace in array
    existingTasks[taskIndex] = updatedTask;
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.TASKS, userId, existingTasks);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update task' });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update task' });
  }
}

async function deleteTask(req, res, userId) {
  try {
    const { taskId } = req.query;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    // Get existing tasks
    const existingTasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    
    // Filter out the task to delete
    const updatedTasks = existingTasks.filter(task => task.id !== taskId);
    
    if (updatedTasks.length === existingTasks.length) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.TASKS, userId, updatedTasks);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete task' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete task' });
  }
}

// pages/api/tasks/[taskId].js - Individual Task Operations
export async function taskHandler(req, res) {
  const { method } = req;
  const { taskId, userId = 'default_user' } = req.query;

  try {
    switch (method) {
      case 'GET':
        return await getTaskById(req, res, userId, taskId);
      case 'PUT':
        return await updateTaskStatus(req, res, userId, taskId);
      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Task Handler Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getTaskById(req, res, userId, taskId) {
  try {
    const tasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch task' });
  }
}

async function updateTaskStatus(req, res, userId, taskId) {
  try {
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const existingTasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    const taskIndex = existingTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    existingTasks[taskIndex] = {
      ...existingTasks[taskIndex],
      status,
      updatedAt: new Date().toISOString()
    };
    
    const success = await KVService.hset(KV_KEYS.TASKS, userId, existingTasks);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update task status' });
    }
    
    return res.status(200).json({
      success: true,
      data: existingTasks[taskIndex],
      message: 'Task status updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update task status' });
  }
}