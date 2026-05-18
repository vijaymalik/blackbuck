import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Settings, 
  LogOut,
  Sun,
  Moon,
  Shield,
  Send,
  Bell
} from 'lucide-react';

const Layout = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Global Real-time Polling for Database Notifications
  useEffect(() => {
    if (!token) return;

    const api = axios.create({
      baseURL: 'http://' + window.location.hostname + ':8002/api/v1',
      headers: { Authorization: `Bearer ${token}` }
    });

    const playChime = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.45;
        audio.play().catch(e => console.log('Audio play blocked/interrupted:', e));
      } catch (e) {
        console.error('Failed to play notification sound:', e);
      }
    };

    const showNotification = (message, type = 'info') => {
      const id = Date.now() + Math.random().toString(36).substr(2, 9);
      
      // Determine premium toast styles dynamically based on content keywords
      const msg = message.toLowerCase();
      let title = 'System Alert';
      let icon = '🔔';
      let color = '#3b82f6'; // Blue default

      if (msg.includes('delivered') || msg.includes('complete')) {
        title = 'Consignment Delivered';
        icon = '🏁';
        color = '#10b981'; // Sleek Green
      } else if (msg.includes('dispatched') || msg.includes('transit') || msg.includes('route')) {
        title = 'Load Dispatched';
        icon = '🚚';
        color = '#f59e0b'; // Amber/Orange
      } else if (type === 'new_enquiry' || msg.includes('enquiry') || msg.includes('new load')) {
        title = 'New Load Enquiry';
        icon = '📦';
        color = '#d946ef'; // Magenta
      } else if (type === 'success' || msg.includes('assign') || msg.includes('reopen')) {
        title = 'Load Assigned / Updated';
        icon = '🎉';
        color = '#10b981'; // Green
      }

      setToasts(prev => [...prev, { id, message, type, title, icon, color }]);
      playChime();

      // Auto-remove after 6 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 6000);
    };

    // Keep track of shown notification IDs so we don't spam Toast alerts on reload or loop fetch
    const shownNotifIds = new Set();

    const fetchNotifications = async (isFirstLoad = false) => {
      try {
        const response = await api.get('/admin/notifications');
        if (response.data.success) {
          const freshNotifs = response.data.data;
          
          let firstLoadToastCount = 0;
          freshNotifs.forEach(notif => {
            if (!notif.read && !shownNotifIds.has(notif.id)) {
              if (!isFirstLoad) {
                // Real-time update: always display toast popup
                showNotification(notif.message, notif.type);
              } else {
                // First load / refresh: alert up to 4 unread notifications so they are not missed
                if (firstLoadToastCount < 4) {
                  showNotification(notif.message, notif.type);
                  firstLoadToastCount++;
                }
              }
              shownNotifIds.add(notif.id);
            }
          });

          setNotifications(freshNotifs);
        }
      } catch (err) {
        console.error('Failed to fetch admin notifications from database:', err);
      }
    };

    // Load immediately
    fetchNotifications(true);

    const pollInterval = setInterval(() => {
      fetchNotifications(false);
    }, 5000); // Poll database every 5 seconds

    return () => clearInterval(pollInterval);
  }, [token]);

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
    { to: '/enquiries', icon: <Send size={20} />, label: 'Enquiries', permission: 'view drivers' },
    { to: '/users', icon: <Users size={20} />, label: 'Users', permission: 'view users' },
    { to: '/roles', icon: <Shield size={20} />, label: 'Roles', permission: 'view roles' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings', permission: 'view settings' },
  ].filter(item => hasPermission(item.permission));

  return (
    <div className="app-layout">
      <aside className="main-sidebar sidebar">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Truck size={24} color="var(--primary)" /> Admin Portal</h1>
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

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: 'var(--bg-main)' }}>
        
        {/* Top Navbar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 32px',
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Fleet Telemetry
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '2px 0 0 0', color: 'var(--text-main)' }}>
              Command Center
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid var(--border)', 
                color: 'var(--text-main)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '10px', 
                borderRadius: '12px',
                transition: 'all 0.2s'
              }} 
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification Bell */}
            <button 
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid var(--border)', 
                color: 'var(--text-main)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '10px', 
                borderRadius: '12px',
                position: 'relative',
                transition: 'all 0.2s'
              }}
            >
              <Bell size={18} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: '900',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: '2px solid var(--card-bg)'
                }}>
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {notifDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '360px',
                background: '#1e293b',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4), 0 10px 10px -5px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                zIndex: 1000
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255,255,255,0.02)'
                }}>
                  <span style={{ color: '#fff', fontWeight: '800', fontSize: '0.9rem' }}>
                    Notifications Center
                  </span>
                  {notifications.length > 0 && (
                    <button 
                      onClick={async () => {
                        try {
                          const api = axios.create({
                            baseURL: 'http://' + window.location.hostname + ':8002/api/v1',
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          await api.delete('/admin/notifications/clear-all');
                          setNotifications([]);
                        } catch (err) {
                          console.error('Failed to clear notifications in DB', err);
                        }
                        setNotifDropdownOpen(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Items List */}
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                      <Bell size={24} style={{ marginBottom: '8px', opacity: 0.3, alignSelf: 'center', display: 'block', margin: '0 auto' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>No new notifications</div>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={async () => {
                          if (!notif.read) {
                            try {
                              const api = axios.create({
                                baseURL: 'http://' + window.location.hostname + ':8002/api/v1',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              await api.post(`/admin/notifications/${notif.id}/read`);
                              setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                            } catch (err) {
                              console.error('Failed to mark notification as read in DB', err);
                            }
                          }
                          setNotifDropdownOpen(false);
                          navigate('/enquiries');
                        }}
                        style={{
                          padding: '14px 20px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: notif.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          transition: 'background 0.2s'
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', marginTop: '2px' }}>
                          {notif.type === 'success' ? '🎉' : notif.type === 'new_enquiry' ? '📦' : '🔔'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            fontSize: '0.8rem', 
                            color: notif.read ? 'rgba(255,255,255,0.7)' : '#fff', 
                            fontWeight: notif.read ? '500' : '700',
                            margin: 0,
                            lineHeight: '1.3',
                            textAlign: 'left'
                          }}>
                            {notif.message}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                            {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : notif.timestamp}
                          </span>
                        </div>
                        {!notif.read && (
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '3px',
                            background: '#ef4444',
                            alignSelf: 'center'
                          }} />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: '12px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.01)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.04)'
                }}>
                  <button 
                    onClick={() => {
                      setNotifDropdownOpen(false);
                      navigate('/enquiries');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    View All Active Enquiries
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content viewport */}
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
      </main>

      {/* Floating Global Toast Notification Container */}
      <div 
        style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: '#1e293b',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderColor: toast.type === 'success' ? '#10b981' : toast.type === 'new_enquiry' ? '#f59e0b' : '#3b82f6',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: '320px',
              maxWidth: '420px',
              animation: 'slideIn 0.3s ease-out forwards',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>
              {toast.type === 'success' ? '🎉' : toast.type === 'new_enquiry' ? '📦' : '🔔'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: '900', 
                fontSize: '0.75rem', 
                color: toast.type === 'success' ? '#34d399' : toast.type === 'new_enquiry' ? '#f59e0b' : '#60a5fa', 
                textTransform: 'uppercase', 
                letterSpacing: '0.8px' 
              }}>
                {toast.type === 'success' ? 'Load Assigned' : toast.type === 'new_enquiry' ? 'New Enquiry Alert' : 'New Bid Recieved'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '3px', fontWeight: '600', lineHeight: '1.3', textAlign: 'left' }}>
                {toast.message}
              </div>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                padding: '0 4px',
                alignSelf: 'flex-start',
                marginTop: '-2px'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Layout;
