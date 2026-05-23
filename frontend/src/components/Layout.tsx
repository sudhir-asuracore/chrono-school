import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, Calendar, LayoutDashboard, Settings, Bell, User } from 'lucide-react';
import { cn } from '../utils/cn';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header Navigation */}
        <header className="flex items-center justify-between mb-8 px-4">
          <div className="flex items-center">
            <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-gray-100 flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center font-bold text-brand-dark">C</div>
              <span className="text-xl font-bold text-gray-800">ChronoSchool</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center bg-white/50 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/50">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/teachers" label="Teachers" />
            <NavItem to="/subjects" label="Subjects" />
            <NavItem to="/classes" label="Classes" />
            <NavItem to="/rooms" label="Rooms" />
            <NavItem to="/scheduler" label="Scheduler" />
          </nav>

          <div className="flex items-center space-x-3">
            <Link 
              to="/admin"
              className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Admin Settings"
            >
              <Settings size={20} />
            </Link>
            <button className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50">
              <Bell size={20} />
            </button>
            <button className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50">
              <User size={20} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="card-container min-h-[80vh] p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "px-6 py-2 rounded-full text-sm font-medium transition-all duration-200",
          isActive 
            ? "bg-brand-dark text-white shadow-md" 
            : "text-gray-600 hover:bg-white/80"
        )
      }
    >
      {label}
    </NavLink>
  );
};

export default Layout;
