"use client"; 

import React, { useState, useEffect } from 'react';
import { Home, User, MessageCircle, Calendar, CheckSquare } from 'lucide-react';
import Link from 'next/link';

const DigiMateHome = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState('');
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  // State baru untuk chat history
  const [recentChats, setRecentChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);

  const userId = 'default_user'; // In production, get from auth

  // Helper function to format date consistently
  const formatDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch user profile
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await fetch(`/api/profile?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
      } else {
        console.error('Failed to load profile');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data.slice(0, 5)); // Show only first 5 tasks on home
        setError('');
      } else {
        setError('Failed to load tasks. Please try again.');
      }
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch upcoming events
  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      const response = await fetch(`/api/schedule?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayStr = formatDateString(today);
        
        const upcoming = data.data
          .filter(event => {
            return event.date >= todayStr;
          })
          .sort((a, b) => {
            if (a.date === b.date) {
              return a.startTime.localeCompare(b.startTime);
            }
            return a.date.localeCompare(b.date);
          })
          .slice(0, 5);
        
        setUpcomingEvents(upcoming);
      } else {
        console.error('Failed to load events:', data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch recent chats - FUNGSI BARU
  const fetchRecentChats = async () => {
    setChatsLoading(true);
    try {
      const response = await fetch(`/api/chat?userId=${userId}`);
      
      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        // Set demo data jika API tidak tersedia
        setRecentChats([
          {
            id: 'demo-1',
            title: 'Demo Chat',
            lastMessage: 'This is a demo message from chat history',
            timestamp: new Date().toISOString()
          },
          {
            id: 'demo-2', 
            title: 'Another Demo Chat',
            lastMessage: 'Another demo message to show chat history',
            timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          }
        ]);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON but got:', contentType);
        setRecentChats([]);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        // Ambil 5 chat terbaru dan urutkan berdasarkan timestamp
        const sortedChats = data.data
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);
        setRecentChats(sortedChats);
      } else {
        setRecentChats([]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      // Fallback dengan demo data
      setRecentChats([
        {
          id: 'demo-1',
          title: 'Demo Chat',
          lastMessage: 'This is a demo message since API is not available',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setChatsLoading(false);
    }
  };

  // Helper function untuk format tanggal
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short' 
      });
    }
  };

  // Helper function untuk format waktu
  const formatTime = (time) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function untuk format timestamp chat
  const formatChatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  // Helper function untuk mendapatkan warna berdasarkan type
  const getTypeColor = (type) => {
    const colors = {
      'work': 'bg-blue-100 text-blue-600',
      'meeting': 'bg-green-100 text-green-600',
      'personal': 'bg-purple-100 text-purple-600',
      'study': 'bg-orange-100 text-orange-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  useEffect(() => {
    fetchProfile();
    fetchTasks();
    fetchEvents();
    fetchRecentChats(); // Tambahkan fungsi fetch chat history
  }, []);

  const Sidebar = () => (
    <div className="bg-white shadow-lg h-full flex flex-col">
      <div className="p-6 border-b">
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
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {[
            { id: 'home', icon: Home, label: 'Home', href: '/' },
            { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
            { id: 'chat', icon: MessageCircle, label: 'Chat', href: '/chat' },
            { id: 'task', icon: CheckSquare, label: 'Task', href: '/tasks' },
            { id: 'schedule', icon: Calendar, label: 'Schedule', href: '/schedule' }
          ].map((item) => (
            item.href ? (
              <Link key={item.id} href={item.href}>
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
                onClick={() => setActiveSection(item.id)}
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
    </div>
  );

  const MobileSidebar = ({ isOpen, onClose }) => (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar />
      </div>
    </>
  );

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  // Function to get display name
  const getDisplayName = () => {
    if (profileLoading) return 'Loading...';
    if (!profile) return 'User';
    
    return profile.name || profile.fullName || profile.full_name || 'User';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
              <div className="w-full h-0.5 bg-gray-600"></div>
            </div>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full ml-0.5"></div>
            </div>
            <span className="font-bold text-gray-800">DigiMate</span>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-4xl">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                Hello, {getDisplayName()}
              </h2>
              <p className="text-gray-600 mb-4">Here's Your Summary as a Intern</p>
              
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Intern Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-red-500">Intern Tasks</h3>
                <Link href="/tasks" className="text-sm text-red-500 hover:text-red-600">
                  View All
                </Link>
              </div>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  </div>
                  <p className="text-gray-500">No tasks available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className={`border-l-4 ${getPriorityColor(task.priority)} bg-gray-50 p-4 rounded-r-lg`}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{task.title}</h4>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              Priority: {task.priority}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Events Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-red-500">Upcoming Events</h3>
                <Link href="/schedule" className="text-sm text-red-500 hover:text-red-600">
                  View All
                </Link>
              </div>

              {eventsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading events...</p>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  </div>
                  <p className="text-gray-500">No upcoming events</p>
                  <p className="text-gray-400 text-sm mt-1">Events will appear here when scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-800">{event.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded capitalize ${getTypeColor(event.type)}`}>
                              {event.type}
                            </span>
                          </div>
                          
                          {event.description && (
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDisplayDate(event.date)}</span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <span>{formatTime(event.startTime)}</span>
                              {event.endTime && (
                                <>
                                  <span>-</span>
                                  <span>{formatTime(event.endTime)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Chats Section - SECTION YANG DIPERBARUI */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-red-500">Recent Chats</h3>
                <Link href="/chat" className="text-sm text-red-500 hover:text-red-600">
                  View All
                </Link>
              </div>

              {chatsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading chats...</p>
                </div>
              ) : recentChats.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  </div>
                  <p className="text-gray-500">No chat history available</p>
                  <p className="text-gray-400 text-sm mt-1">Start chatting to see your history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentChats.map((chat) => (
                    <Link key={chat.id} href="/chat">
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <MessageCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              <h4 className="font-medium text-gray-800 truncate">{chat.title}</h4>
                            </div>
                            
                            {chat.lastMessage && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {chat.lastMessage.length > 100 
                                  ? chat.lastMessage.substring(0, 100) + '...'
                                  : chat.lastMessage
                                }
                              </p>
                            )}
                            
                            <div className="flex items-center text-xs text-gray-400">
                              <span>{formatChatTime(chat.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigiMateHome;