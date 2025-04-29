
import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transition duration-300 transform md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar mobile onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Top navigation */}
        <div className="bg-white shadow-sm z-10">
          <div className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <button 
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-icons">menu</span>
            </button>
            <div className="flex-1 flex justify-end">
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mx-2">
                <span className="material-icons">notifications</span>
              </button>
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                <span className="material-icons">help_outline</span>
              </button>
            </div>
          </div>
        </div>
        
        {children}
      </div>
    </div>
  );
};

export default Layout;
