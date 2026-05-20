import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, Calendar, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '../utils/cn';

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600">ChronoSchool</h1>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem to="/teachers" icon={<Users size={20} />} label="Teachers" />
          <NavItem to="/subjects" icon={<BookOpen size={20} />} label="Subjects" />
          <NavItem to="/classes" icon={<GraduationCap size={20} />} label="Classes" />
          <NavItem to="/scheduler" icon={<Calendar size={20} />} label="Scheduler" />
          <NavItem to="/admin" icon={<Settings size={20} />} label="Admin" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors",
          isActive ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
        )
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
};

export default Layout;
