import React from 'react';
import { LayoutDashboard, Users, Truck, Activity } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { label: 'Total Drivers', value: '154', icon: <Truck />, color: '#3b82f6' },
    { label: 'Online Now', value: '42', icon: <Activity />, color: '#10b981' },
    { label: 'Active Users', value: '1.2k', icon: <Users />, color: '#f59e0b' },
    { label: 'System Health', value: '99.9%', icon: <LayoutDashboard />, color: '#8b5cf6' },
  ];

  return (
    <div className="dashboard-view" style={{ padding: '32px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Fleet Overview</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome back to the admin command center.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {stats.map((stat) => (
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
    </div>
  );
};

export default Dashboard;
