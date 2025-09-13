// pages/api/init.js - Initialize User Data
export async function initHandler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  try {
    // Check if user data already exists
    const existingProfile = await KVService.hget(KV_KEYS.PROFILES, userId);
    
    if (existingProfile) {
      return res.status(409).json({ 
        error: 'User data already initialized',
        data: existingProfile 
      });
    }

    // Initialize default data
    const success = await initializeDefaultData(userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to initialize user data' });
    }

    // Get initialized data
    const profile = await KVService.hget(KV_KEYS.PROFILES, userId);
    const events = await KVService.hget(KV_KEYS.EVENTS, userId);
    
    return res.status(201).json({
      success: true,
      data: {
        profile,
        events,
        message: 'User data initialized successfully'
      }
    });
  } catch (error) {
    console.error('Init Error:', error);
    return res.status(500).json({ error: 'Failed to initialize user data' });
  }
}

async function initializeDefaultData(userId) {
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