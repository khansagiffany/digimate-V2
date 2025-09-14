// src/app/api/tasks/route.js
import { KVService, KV_KEYS, DataModels } from '../../../lib/kv';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    const tasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    
    // Filter by status if provided
    let filteredTasks = tasks;
    
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    
    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }
    
    // Sort by creation date (newest first)
    filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return NextResponse.json({
      success: true,
      data: filteredTasks,
      count: filteredTasks.length
    });
  } catch (error) {
    console.error('Get Tasks Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const body = await request.json();
    const { title, description, priority = 'medium', dueDate } = body;
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Create Task Error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const taskId = searchParams.get('taskId');
    const updateData = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Get existing tasks
    const existingTasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    
    // Find task index
    const taskIndex = existingTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update Task Error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    // Get existing tasks
    const existingTasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    
    // Filter out the task to delete
    const updatedTasks = existingTasks.filter(task => task.id !== taskId);
    
    if (updatedTasks.length === existingTasks.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.TASKS, userId, updatedTasks);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete Task Error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}