// pages/api/profile.js - Profile API Routes
import { KVService, KV_KEYS, DataModels } from '../../lib/kv';

export default async function handler(req, res) {
  const { method } = req;
  const { userId = 'default_user' } = req.query;

  try {
    switch (method) {
      case 'GET':
        return await getProfile(req, res, userId);
      case 'PUT':
        return await updateProfile(req, res, userId);
      case 'POST':
        return await createProfile(req, res, userId);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Profile API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getProfile(req, res, userId) {
  try {
    const profile = await KVService.hget(KV_KEYS.PROFILES, userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

async function updateProfile(req, res, userId) {
  try {
    const updateData = req.body;
    
    // Get existing profile
    const existingProfile = await KVService.hget(KV_KEYS.PROFILES, userId);
    
    if (!existingProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Update profile
    const updatedProfile = {
      ...existingProfile,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.PROFILES, userId, updatedProfile);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    
    return res.status(200).json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
}

async function createProfile(req, res, userId) {
  try {
    const { name, email, phone, university, major, company, position } = req.body;
    
    // Check if profile already exists
    const existingProfile = await KVService.hget(KV_KEYS.PROFILES, userId);
    
    if (existingProfile) {
      return res.status(409).json({ error: 'Profile already exists' });
    }
    
    // Create new profile
    const newProfile = {
      ...DataModels.Profile,
      id: KVService.generateId(),
      userId,
      name: name || 'User',
      email: email || '',
      phone: phone || '',
      university: university || '',
      major: major || '',
      company: company || '',
      position: position || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.PROFILES, userId, newProfile);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to create profile' });
    }
    
    return res.status(201).json({
      success: true,
      data: newProfile,
      message: 'Profile created successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create profile' });
  }
}