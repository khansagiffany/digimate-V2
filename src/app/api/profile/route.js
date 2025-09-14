import { KVService, KV_KEYS, DataModels } from '../../../lib/kv';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';

  try {
    const profile = await KVService.hget(KV_KEYS.PROFILES, userId);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Profile GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';

  try {
    const updateData = await request.json();
    
    // Get existing profile
    const existingProfile = await KVService.hget(KV_KEYS.PROFILES, userId);
    
    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'default_user';

  try {
    const { name, email, phone, university, major, company, position, profileImage } = await request.json();
    
    // Check if profile already exists
    const existingProfile = await KVService.hget(KV_KEYS.PROFILES, userId);
    
    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 409 });
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
      profileImage: profileImage || null, // Added profile image field
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to KV
    const success = await KVService.hset(KV_KEYS.PROFILES, userId, newProfile);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: newProfile,
      message: 'Profile created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Profile POST Error:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}