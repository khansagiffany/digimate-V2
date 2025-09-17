"use client";

import React, { useState, useEffect } from 'react';
import { Home, User, MessageCircle, CheckSquare, Calendar, Save, Edit3, Menu, X } from 'lucide-react';
import Link from 'next/link';

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    university: '',
    major: '',
    company: '',
    position: '',
    profileImage: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Home', href: '/' },
    { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', href: '/chat' },
    { id: 'task', icon: CheckSquare, label: 'Task', href: '/tasks' },
    { id: 'schedule', icon: Calendar, label: 'Schedule', href: '/schedule' }
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile?userId=default_user');
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
      } else if (response.status === 404) {
        console.log('Profile not found, showing empty form');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', 'default_user');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        const imageUrl = uploadData.url;

        const updatedProfile = {
          ...profile,
          profileImage: imageUrl
        };
        
        setProfile(updatedProfile);

        const saveResponse = await fetch('/api/profile?userId=default_user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profileImage: imageUrl }),
        });

        if (saveResponse.ok) {
          alert('Profile image uploaded successfully!');
        } else {
          console.warn('Failed to save image URL to profile, but image is uploaded');
          alert('Image uploaded but failed to save to profile. Please try saving your profile manually.');
        }
      } else {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const getResponse = await fetch('/api/profile?userId=default_user');
      const isExisting = getResponse.ok;
      
      const method = isExisting ? 'PUT' : 'POST';
      const response = await fetch('/api/profile?userId=default_user', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
        setIsEditing(false);
        alert(data.message || 'Profile saved successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNavClick = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col transition-transform duration-300 ease-in-out`}>
        
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full ml-1"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">DigiMate</h1>
                <p className="text-sm text-red-500">Your Internship Companion</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              item.href ? (
                <Link key={item.id} href={item.href} onClick={handleNavClick}>
                  <div className={`w-full flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer ${
                    activeSection === item.id
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                    <item.icon className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    handleNavClick();
                  }}
                  className={`w-full flex flex-col items-center p-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            ))}
          </div>
        </nav>

        <div className="p-4 border-t">
          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">N</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:ml-0">
        <div className="bg-white shadow-sm border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
                <p className="text-gray-600 mt-1">Manage your personal information</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Edit3 size={16} />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mx-auto mb-4">
                    {profile.profileImage ? (
                      <img 
                        src={profile.profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="absolute bottom-0 right-0">
                      <label className="cursor-pointer bg-red-500 text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-600 transition-colors">
                        <Edit3 size={16} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  )}
                </div>
                
                {uploading && (
                  <p className="text-sm text-gray-500">Uploading image...</p>
                )}
                
                {isEditing && !uploading && (
                  <p className="text-sm text-gray-500">Click the edit icon to change your profile picture</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                      {profile.name || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                      {profile.email || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                      {profile.phone || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Education</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    University
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.university}
                      onChange={(e) => handleInputChange('university', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600"
                      placeholder="Enter your university"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                      {profile.university || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Major
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.major}
                      onChange={(e) => handleInputChange('major', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600"
                      placeholder="Enter your major"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                      {profile.major || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Work Experience</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600"
                      placeholder="Enter your company"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                      {profile.company || 'Not provided'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600"
                      placeholder="Enter your position"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-800">
                      {profile.position || 'Not provided'}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="md:col-span-2 mt-6">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;