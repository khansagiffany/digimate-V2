// pages/api/events.js - Events API Routes
import { KVService, KV_KEYS, DataModels } from '../../lib/kv';

export default async function handler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query;

  try {
    switch (method) {
      case 'GET':
        return await getEvents(req, res, userId);
      case 'POST':
        return await createEvent(req, res, userId);
      case 'PUT':
        return await updateEvent(req, res, userId);
      case 'DELETE':
        return await deleteEvent(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Events API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getEvents(req, res, userId) {
  try {
    const events = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
    
    // Filter and sort options
    const { status, type, upcoming, limit } = req.query;
    let filteredEvents = events;
    
    // Filter by status
    if (status) {
      filteredEvents = filteredEvents.filter(event => event.status === status);
    }
    
    // Filter by type
    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }
    
    // Filter upcoming events (next 30 days)
    if (upcoming === 'true') {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= thirtyDaysFromNow;
      });
    }
    
    // Sort by date (earliest first)
    filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Limit results
    if (limit) {
      filteredEvents = filteredEvents.slice(0, parseInt(limit));
    }
    
    return res.status(200).json({
      success: true,
      data: filteredEvents,
      count: filteredEvents.length
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
}

async function createEvent(req, res, userId) {
  try {
    const { title, description, type, date, time, location } = req.body;
    
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }
    
    // Validate event type
    const validTypes = ['interview', 'meeting', 'deadline', 'announcement', 'onboarding'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }
    
    // Get existing events
    const existingEvents = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
    
    // Create new event
    const newEvent = {
      ...DataModels.Event,
      id: KVService.generateId(),
      userId,
      title,
      description: description || '',
      type: type || 'meeting',
      date,
      time: time || '',
      location: location || '',
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to existing events
    const updatedEvents = [...existingEvents, newEvent];
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.EVENTS, userId, updatedEvents);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to create event' });
    }
    
    return res.status(201).json({
      success: true,
      data: newEvent,
      message: 'Event created successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create event' });
  }
}

async function updateEvent(req, res, userId) {
  try {
    const { eventId } = req.query;
    const updateData = req.body;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    // Get existing events
    const existingEvents = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
    
    // Find event index
    const eventIndex = existingEvents.findIndex(event => event.id === eventId);
    
    if (eventIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Update event
    const updatedEvent = {
      ...existingEvents[eventIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Replace in array
    existingEvents[eventIndex] = updatedEvent;
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.EVENTS, userId, existingEvents);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update event' });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update event' });
  }
}

async function deleteEvent(req, res, userId) {
  try {
    const { eventId } = req.query;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    // Get existing events
    const existingEvents = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
    
    // Filter out the event to delete
    const updatedEvents = existingEvents.filter(event => event.id !== eventId);
    
    if (updatedEvents.length === existingEvents.length) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.EVENTS, userId, updatedEvents);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete event' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete event' });
  }
}

// pages/api/events/upcoming.js - Get Upcoming Events
export async function upcomingEventsHandler(req, res) {
  const { method } = req;
  const { userId = 'default_user', days = 30 } = req.query;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  try {
    const events = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
    
    // Get events in the next X days
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + parseInt(days));
    
    const upcomingEvents = events
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= futureDate && event.status === 'upcoming';
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return res.status(200).json({
      success: true,
      data: upcomingEvents,
      count: upcomingEvents.length
    });
  } catch (error) {
    console.error('Upcoming Events Error:', error);
    return res.status(500).json({ error: 'Failed to fetch upcoming events' });
  }
}

// pages/api/events/statistics.js - Event Statistics
export async function eventStatsHandler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  try {
    const events = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
    
    const stats = {
      total: events.length,
      upcoming: events.filter(e => e.status === 'upcoming').length,
      completed: events.filter(e => e.status === 'completed').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
      byType: {
        interview: events.filter(e => e.type === 'interview').length,
        meeting: events.filter(e => e.type === 'meeting').length,
        deadline: events.filter(e => e.type === 'deadline').length,
        announcement: events.filter(e => e.type === 'announcement').length,
        onboarding: events.filter(e => e.type === 'onboarding').length
      },
      thisWeek: 0,
      thisMonth: 0
    };
    
    // Calculate this week and this month
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    stats.thisWeek = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= weekStart;
    }).length;
    
    stats.thisMonth = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= monthStart;
    }).length;
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Event Stats Error:', error);
    return res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
}