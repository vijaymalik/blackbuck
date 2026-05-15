import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Settings, 
  LogOut,
  Sun,
  Moon,
  Shield
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hasPermission = (permissionName) => {
    if (!user) return false;
    if (user.roles?.includes('admin')) return true; // Super admin
    return user.permissions?.includes(permissionName);
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', permission: 'view dashboard' },
    { to: '/drivers', icon: <Truck size={20} />, label: 'Drivers', permission: 'view drivers' },
    { to: '/users', icon: <Users size={20} />, label: 'Users', permission: 'view users' },
    { to: '/roles', icon: <Shield size={20} />, label: 'Roles', permission: 'view roles' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings', permission: 'view settings' },
  ].filter(item => hasPermission(item.permission));

  return (
    <div className="app-layout">
      <aside className="main-sidebar sidebar">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Truck size={24} color="var(--primary)" /> Admin Portal</h1>
          <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px' }} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="user-details">
              <p className="user-name">{user?.name || 'Admin'}</p>
              <p className="user-role">{user?.email || 'admin@example.com'}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
