"use client";

import React, { useState, useEffect } from 'react';
import { Home, User, MessageCircle, Calendar, CheckSquare, Plus, X, Edit2, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

const TasksPage = () => {
  const [activeSection, setActiveSection] = useState('task');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const userId = 'default_user'; // In production, get from auth

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data);
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

  // Create task
  const createTask = async () => {
    if (!newTask.trim()) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`/api/tasks?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.trim(),
          priority: 'medium'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTasks([data.data, ...tasks]);
        setNewTask('');
        setError('');
      } else {
        setError('Failed to create task');
      }
    } catch (err) {
      setError('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`/api/tasks?userId=${userId}&taskId=${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
      }
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks?userId=${userId}&taskId=${taskId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTasks(tasks.filter(task => task.id !== taskId));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      createTask();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

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
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                Your Tasks
              </h2>
              <p className="text-gray-600">Keep it going.</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Add Task Input */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Enter new task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <button
                  onClick={createTask}
                  disabled={isCreating || !newTask.trim()}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Task
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="bg-white rounded-lg shadow-sm">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-2">No tasks yet</p>
                  <p className="text-sm text-gray-400">Add your first task above to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-6 border-l-4 ${getPriorityColor(task.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => updateTaskStatus(
                                task.id,
                                task.status === 'completed' ? 'pending' : 'completed'
                              )}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                task.status === 'completed'
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 hover:border-green-500'
                              }`}
                            >
                              {task.status === 'completed' && (
                                <CheckSquare className="w-3 h-3 text-white" />
                              )}
                            </button>
                            <h3
                              className={`font-semibold text-gray-900 ${
                                task.status === 'completed' ? 'line-through text-gray-500' : ''
                              }`}
                            >
                              {task.title}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
                            >
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          {task.description && (
                            <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="capitalize">Priority: {task.priority}</span>
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {task.status !== 'completed' && (
                            <button
                              onClick={() => updateTaskStatus(task.id, 'in_progress')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Mark as In Progress"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
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

export default TasksPage;