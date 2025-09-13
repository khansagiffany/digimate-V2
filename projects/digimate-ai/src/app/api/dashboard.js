// pages/api/dashboard.js - Dashboard Summary API
export async function dashboardHandler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  try {
    // Get all user data
    const profile = await KVService.hget(KV_KEYS.PROFILES, userId);
    const tasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
    const events = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
    const chats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
    const schedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];

    // Calculate dashboard summary
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Upcoming events (next 7 days)
    const weekFromNow = new Date();
    weekFromNow.setDate(now.getDate() + 7);
    
    const upcomingEvents = events
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= weekFromNow && event.status === 'upcoming';
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);

    // Task statistics
    const taskStats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now && t.status !== 'completed';
      }).length
    };

    // Today's schedule
    const todaySchedule = schedules
      .filter(s => s.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Recent chats (last 5)
    const recentChats = chats
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
      .slice(0, 5);

    const dashboardData = {
      user: profile,
      summary: {
        totalTasks: tasks.length,
        pendingTasks: taskStats.pending,
        upcomingEventsCount: upcomingEvents.length,
        unreadMessages: recentChats.reduce((sum, chat) => sum + chat.unreadCount, 0),
        todayScheduleCount: todaySchedule.length
      },
      upcomingEvents,
      taskStats,
      recentChats,
      todaySchedule,
      lastUpdated: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

// pages/api/search.js - Global Search API
export async function searchHandler(req, res) {
  const { method } = req;
  const { userId = 'default_user', q: query, type } = req.query;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    const searchQuery = query.toLowerCase().trim();
    const results = {
      tasks: [],
      events: [],
      chats: [],
      schedules: []
    };

    // Search in tasks
    if (!type || type === 'tasks') {
      const tasks = await KVService.hget(KV_KEYS.TASKS, userId) || [];
      results.tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery) ||
        task.description.toLowerCase().includes(searchQuery)
      );
    }

    // Search in events
    if (!type || type === 'events') {
      const events = await KVService.hget(KV_KEYS.EVENTS, userId) || [];
      results.events = events.filter(event =>
        event.title.toLowerCase().includes(searchQuery) ||
        event.description.toLowerCase().includes(searchQuery) ||
        event.location.toLowerCase().includes(searchQuery)
      );
    }

    // Search in chats
    if (!type || type === 'chats') {
      const chats = await KVService.hget(KV_KEYS.CHATS, userId) || [];
      results.chats = chats.filter(chat =>
        chat.participantName.toLowerCase().includes(searchQuery) ||
        chat.lastMessage.toLowerCase().includes(searchQuery)
      );
    }

    // Search in schedules
    if (!type || type === 'schedules') {
      const schedules = await KVService.hget(KV_KEYS.SCHEDULES, userId) || [];
      results.schedules = schedules.filter(schedule =>
        schedule.title.toLowerCase().includes(searchQuery) ||
        schedule.description.toLowerCase().includes(searchQuery)
      );
    }

    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    return res.status(200).json({
      success: true,
      query: query,
      data: results,
      totalResults
    });
  } catch (error) {
    console.error('Search Error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
}