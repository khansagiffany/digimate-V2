"use client";

import React, { useState } from 'react';
import { Home, User, MessageCircle, Calendar, CheckSquare } from 'lucide-react';
import Link from 'next/link';

const Sidebar = ({ activeSection = 'home', onSectionChange }) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Home', href: '/' },
    { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', href: '/chat' },
    { id: 'task', icon: CheckSquare, label: 'Task', href: '/tasks' },
    { id: 'schedule', icon: Calendar, label: 'Schedule', href: '/schedule' }
  ];

  return (
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
          {menuItems.map((item) => (
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
                onClick={() => onSectionChange && onSectionChange(item.id)}
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
};

const MobileSidebar = ({ isOpen, onClose, activeSection, onSectionChange }) => (
  <>
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
    )}
    <div className={`fixed left-0 top-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 md:hidden shadow-xl ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
    </div>
  </>
);

const MobileHeader = ({ onMenuToggle }) => (
  <div className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
    <button
      onClick={onMenuToggle}
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
);

// Hook untuk mengelola sidebar
const useSidebar = (defaultSection = 'home') => {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false); // Close mobile menu when section changes
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return {
    activeSection,
    setActiveSection,
    isMobileMenuOpen,
    handleSectionChange,
    toggleMobileMenu,
    closeMobileMenu
  };
};

export { Sidebar, MobileSidebar, MobileHeader, useSidebar };