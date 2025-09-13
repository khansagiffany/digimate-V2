"use client"; 

import React, { useState } from 'react';
import { Home, User, MessageCircle, Calendar, Settings, CheckSquare } from 'lucide-react';

const DigiMateHome = () => {
  const [activeSection, setActiveSection] = useState('home');

  // Mock data
  const upcomingEvents = [
    { id: 1, title: 'Interview', date: '30 Jan' },
    { id: 2, title: 'Pengumuman akhir', date: '03 Feb' },
    { id: 3, title: 'Onboarding', date: '10 Feb' }
  ];

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
            { id: 'home', icon: Home, label: 'Home', active: true },
            { id: 'profile', icon: User, label: 'Profile' },
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'task', icon: CheckSquare, label: 'Task' },
            { id: 'schedule', icon: Calendar, label: 'Schedule' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map((item) => (
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
                Hello, User
              </h2>
              <p className="text-gray-600 mb-4">Here's Your Summary as a Intern</p>
              
              {/* Error Alert */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">Failed to load tasks. Please try again.</p>
              </div>
            </div>

            {/* Intern Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-xl font-semibold text-red-500 mb-6">Intern Tasks</h3>
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                </div>
                <p className="text-gray-500">No tasks available</p>
              </div>
            </div>

            {/* Upcoming Events Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-xl font-semibold text-red-500 mb-6">Upcoming Event</h3>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex justify-between items-center py-3 border-b last:border-b-0">
                    <span className="text-gray-800 font-medium">{event.title}</span>
                    <span className="text-gray-500 text-sm">{event.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Chats Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold text-red-500 mb-6">Recent Chats</h3>
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                </div>
                <p className="text-gray-500">No chat history available</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigiMateHome;