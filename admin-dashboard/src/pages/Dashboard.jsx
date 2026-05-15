import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Truck, Activity, Shield } from 'lucide-react';
import api from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_drivers: 0,
    active_drivers: 0,
    total_users: 0,
    total_roles: 0,
    system_health: '100%'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard-stats');
        if (res.data && res.data.data) setStats(res.data.data);
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: 'Total Drivers', value: stats.total_drivers, icon: <Truck />, color: '#3b82f6' },
    { label: 'Online Drivers', value: stats.active_drivers, icon: <Activity />, color: '#10b981' },
    { label: 'Total Users', value: stats.total_users, icon: <Users />, color: '#f59e0b' },
    { label: 'Active Roles', value: stats.total_roles, icon: <Shield />, color: '#ef4444' },
    { label: 'System Health', value: stats.system_health, icon: <LayoutDashboard />, color: '#8b5cf6' },
  ];

  return (
    <div className="dashboard-view" style={{ padding: '32px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Fleet Overview</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome back to the admin command center.</p>
      </header>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading stats...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {statCards.map((stat) => (
            <div key={stat.label} className="glass" style={{ padding: '24px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ padding: '10px', borderRadius: '12px', background: `${stat.color}15`, color: stat.color }}>
                  {stat.icon}
                </div>
              </div>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
