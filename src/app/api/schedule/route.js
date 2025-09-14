// src/app/api/schedule/route.js - Next.js App Router
import { KVService, KV_KEYS, DataModels } from '../../../lib/kv';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';
  const date = searchParams.get('date');
  const type = searchParams.get('type');
  const recurring = searchParams.get('recurring');

  try {
    const schedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
    
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
    
    return NextResponse.json({
      success: true,
      data: filteredSchedules,
      count: filteredSchedules.length
    });
  } catch (error) {
    console.error('Schedule GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';

  try {
    const { title, description, date, startTime, endTime, type, recurring, recurringPattern, reminder, reminderTime } = await request.json();
    
    if (!title || !date || !startTime) {
      return NextResponse.json({ error: 'Title, date, and start time are required' }, { status: 400 });
    }
    
    // Validate schedule type
    const validTypes = ['work', 'meeting', 'personal', 'study'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid schedule type' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: newSchedule,
      message: 'Schedule created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Schedule POST Error:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';
  const scheduleId = searchParams.get('scheduleId');

  try {
    const updateData = await request.json();
    
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }
    
    // Get existing schedules
    const existingSchedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
    
    // Find schedule index
    const scheduleIndex = existingSchedules.findIndex(schedule => schedule.id === scheduleId);
    
    if (scheduleIndex === -1) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: updatedSchedule,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    console.error('Schedule PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';
  const scheduleId = searchParams.get('scheduleId');

  try {
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }
    
    // Get existing schedules
    const existingSchedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
    
    // Filter out the schedule to delete
    const updatedSchedules = existingSchedules.filter(schedule => schedule.id !== scheduleId);
    
    if (updatedSchedules.length === existingSchedules.length) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.SCHEDULES, userId, updatedSchedules);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Schedule DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}