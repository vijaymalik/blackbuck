import React from 'react';
import { Search, UserPlus, Filter, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import AddUser from './AddUser';

const Users = () => {
  return (
    <div className="users-view" style={{ padding: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your application customers and staff.</p>
        </div>
        <button className="login-btn" style={{ width: 'auto', padding: '10px 20px', gap: '8px' }}>
        <Link
          to="/users/create"
          className="login-btn"
          style={{
            width: 'auto',
            padding: '10px 20px',
            gap: '8px',
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none'
          }}
        >
  <UserPlus size={18} />
  Add New User
</Link>
        </button>
      </header>

      <div className="glass" style={{ borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
          <div className="search-bar glass" style={{ maxWidth: '400px', margin: 0 }}>
            <Search size={18} color="var(--text-muted)" />
            <input type="text" className="search-input" placeholder="Search by name, email..." />
          </div>
          <button className="control-btn glass" style={{ width: '42px', height: '42px' }}><Filter size={18} /></button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '16px 24px' }}>User</th>
              <th style={{ padding: '16px 24px' }}>Role</th>
              <th style={{ padding: '16px 24px' }}>Status</th>
              <th style={{ padding: '16px 24px' }}>Joined</th>
              <th style={{ padding: '16px 24px' }}></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>JD</div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>John Doe {i}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>john{i}@example.com</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>Customer</td>
                <td style={{ padding: '16px 24px' }}>
                  <span className="status-badge status-online">Active</span>
                </td>
                <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>May {10+i}, 2026</td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
