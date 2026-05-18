import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Truck, Activity, Shield, Send, Package, CheckCircle } from 'lucide-react';
import api from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_drivers: 0,
    active_drivers: 0,
    total_users: 0,
    total_roles: 0,
    total_enquiries: 0,
    assigned_enquiries: 0,
    dispatched_enquiries: 0,
    completed_enquiries: 0,
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
    { label: 'Total Enquiries', value: stats.total_enquiries, icon: <Send size={24} />, color: '#6366f1' },
    { label: 'Assigned Enquiries', value: stats.assigned_enquiries, icon: <Truck size={24} />, color: '#3b82f6' },
    { label: 'Dispatched (In Transit)', value: stats.dispatched_enquiries, icon: <Package size={24} />, color: '#f59e0b' },
    { label: 'Completed Loads', value: stats.completed_enquiries, icon: <CheckCircle size={24} />, color: '#10b981' },
    { label: 'Total Drivers Registered', value: stats.total_drivers, icon: <Users size={24} />, color: '#8b5cf6' },
    { label: 'Online Drivers (Live)', value: stats.active_drivers, icon: <Activity size={24} />, color: '#14b8a6' },
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {statCards.map((stat) => (
            <div key={stat.label} className="glass" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--card-bg)', boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '14px', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stat.icon}
                </div>
              </div>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>{stat.label}</h3>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
