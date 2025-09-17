"use client";

import React, { useState, useEffect } from 'react';
import { Home, User, MessageCircle, CheckSquare, Calendar, Plus, Edit3, Trash2, Clock, X, Menu } from 'lucide-react';
import Link from 'next/link';

const SchedulePage = () => {
  const [activeTab, setActiveTab] = useState('schedule');
  const [activeSection, setActiveSection] = useState('schedule');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'work',
    recurring: false,
    recurringPattern: '',
    reminder: false,
    reminderTime: ''
  });

  const scheduleTypes = [
    { value: 'work', label: 'Work', color: 'bg-blue-500' },
    { value: 'meeting', label: 'Meeting', color: 'bg-green-500' },
    { value: 'personal', label: 'Personal', color: 'bg-purple-500' },
    { value: 'study', label: 'Study', color: 'bg-orange-500' }
  ];

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    filterSchedulesForMonth();
  }, [schedules, currentDate]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schedule?userId=default_user');
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSchedulesForMonth = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const todayStr = formatDateString(today);
    const nextMonthStr = formatDateString(nextMonth);
    
    const filtered = schedules.filter(schedule => {
      return schedule.date >= todayStr && schedule.date <= nextMonthStr;
    });
    
    filtered.sort((a, b) => {
      if (a.date === b.date) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.date.localeCompare(b.date);
    });
    
    setFilteredSchedules(filtered);
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      
      const method = editingSchedule ? 'PUT' : 'POST';
      const url = editingSchedule 
        ? `/api/schedule?userId=default_user&scheduleId=${editingSchedule.id}`
        : '/api/schedule?userId=default_user';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchSchedules();
        setShowModal(false);
        resetForm();
        alert(data.message);
      } else {
        const errorData = await response.json();
        alert(errorData.error);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`/api/schedule?userId=default_user&scheduleId=${scheduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSchedules();
        alert('Schedule deleted successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.error);
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule');
    }
  };

  const openModal = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        title: schedule.title,
        description: schedule.description || '',
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime || '',
        type: schedule.type,
        recurring: schedule.recurring || false,
        recurringPattern: schedule.recurringPattern || '',
        reminder: schedule.reminder || false,
        reminderTime: schedule.reminderTime || ''
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        ...formData,
        date: formatDateString(selectedDate)
      });
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'work',
      recurring: false,
      recurringPattern: '',
      reminder: false,
      reminderTime: ''
    });
    setEditingSchedule(null);
  };

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateStr = formatDateString(current);
      const hasEvents = schedules.some(schedule => schedule.date === dateStr);
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        isSelected: current.toDateString() === selectedDate.toDateString(),
        hasEvents
      });
      
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getTypeColor = (type) => {
    return scheduleTypes.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
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
            {[
              { id: 'home', icon: Home, label: 'Home', href: '/' },
              { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
              { id: 'chat', icon: MessageCircle, label: 'Chat', href: '/chat' },
              { id: 'task', icon: CheckSquare, label: 'Task', href: '/tasks' },
              { id: 'schedule', icon: Calendar, label: 'Schedule', href: '/schedule' }
            ].map((item) => (
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

      <div className="flex-1 flex flex-col min-w-0">
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
                <h1 className="text-2xl font-bold text-gray-800">Schedule</h1>
                <p className="text-gray-600 mt-1">Manage your events and appointments</p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Event</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-hidden">
          <div className="flex flex-col lg:flex-row h-full space-y-6 lg:space-y-0 lg:space-x-6">
            <div className="lg:w-2/3 bg-white rounded-lg shadow-sm border p-4 md:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg md:text-xl font-semibold text-black">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex space-x-1 md:space-x-2">
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                    className="px-2 md:px-3 py-1 border rounded hover:bg-gray-50 text-black text-sm"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2 md:px-3 py-1 border rounded hover:bg-gray-50 text-black text-sm"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                    className="px-2 md:px-3 py-1 border rounded hover:bg-gray-50 text-black text-sm"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {generateCalendar().map((day, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(new Date(day.date))}
                    className={`p-1 md:p-2 text-xs md:text-sm rounded-lg transition-colors relative ${
                      !day.isCurrentMonth ? 'text-gray-300' :
                      day.isSelected ? 'bg-red-500 text-white' :
                      day.isToday ? 'bg-red-50 text-red-600 font-medium' :
                      'hover:bg-gray-50 text-black'
                    }`}
                  >
                    {day.date.getDate()}
                    {day.hasEvents && (
                      <div className="absolute bottom-0.5 md:bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:w-1/3 bg-white rounded-lg shadow-sm border p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
                Upcoming Events (Next Month)
              </h3>

              {loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : filteredSchedules.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No upcoming events
                </div>
              ) : (
                <div className="space-y-3 max-h-64 lg:max-h-96 overflow-y-auto">
                  {filteredSchedules.map((schedule) => (
                    <div key={schedule.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getTypeColor(schedule.type)}`}></div>
                          <h4 className="font-medium text-gray-800 truncate text-sm">{schedule.title}</h4>
                        </div>
                        <div className="flex space-x-1 flex-shrink-0">
                          <button
                            onClick={() => openModal(schedule)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                        <Calendar size={10} />
                        <span>{formatDisplayDate(schedule.date)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                        <Clock size={10} />
                        <span>{formatTime(schedule.startTime)}</span>
                        {schedule.endTime && (
                          <>
                            <span>-</span>
                            <span>{formatTime(schedule.endTime)}</span>
                          </>
                        )}
                      </div>

                      {schedule.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{schedule.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 capitalize">
                          {schedule.type}
                        </span>
                        {schedule.recurring && (
                          <span className="text-xs text-gray-500">Recurring</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => {setShowModal(false); resetForm();}}
        >
          <div 
            className="bg-white rounded-xl p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative z-[10000] transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">
                {editingSchedule ? 'Edit Event' : 'Add New Event'}
              </h3>
              <button
                onClick={() => {setShowModal(false); resetForm();}}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title*</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-black transition-all"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-black transition-all resize-none"
                  rows="3"
                  placeholder="Event description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date*</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-black transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time*</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-gray-600 transition-all"
                >
                  {scheduleTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.recurring}
                    onChange={(e) => setFormData({...formData, recurring: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="recurring" className="text-sm text-gray-700">Recurring event</label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="reminder"
                    checked={formData.reminder}
                    onChange={(e) => setFormData({...formData, reminder: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="reminder" className="text-sm text-gray-700">Set reminder</label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
                <button
                  onClick={() => {setShowModal(false); resetForm();}}
                  className="flex-1 px-4 md:px-6 py-2 md:py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={saving || !formData.title || !formData.date || !formData.startTime}
                  className="flex-1 px-4 md:px-6 py-2 md:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? 'Saving...' : (editingSchedule ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;