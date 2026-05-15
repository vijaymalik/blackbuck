import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Filter, MoreVertical, Loader2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      // Laravel pagination returns data in response.data.data
      setUsers(response.data.data || response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="users-view" style={{ padding: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your application customers and staff.</p>
        </div>
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
      </header>

      <div className="glass" style={{ borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
          <div className="search-bar glass" style={{ maxWidth: '400px', margin: 0 }}>
            <Search size={18} color="var(--text-muted)" />
            <input type="text" className="search-input" placeholder="Search by name, email..." />
          </div>
          <button className="control-btn glass" style={{ width: '42px', height: '42px' }}><Filter size={18} /></button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <th style={{ padding: '16px 24px' }}>User</th>
                <th style={{ padding: '16px 24px' }}>Type</th>
                <th style={{ padding: '16px 24px' }}>Role</th>
                <th style={{ padding: '16px 24px' }}>Status</th>
                <th style={{ padding: '16px 24px' }}>Joined</th>
                <th style={{ padding: '16px 24px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                      <Loader2 className="spin" size={20} />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>{user.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {user.roles && user.roles.some(r => ['admin', 'hr'].includes(r.name)) ? (
                        <span className="status-badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                          Staff
                        </span>
                      ) : user.roles && user.roles.some(r => r.name === 'driver') ? (
                        <span className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          Driver
                        </span>
                      ) : (
                        <span className="status-badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.2)' }}>
                          Customer
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>
                      {user.roles && user.roles.length > 0 
                        ? user.roles.map(r => r.name.toUpperCase()).join(', ') 
                        : 'NO ROLE'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`status-badge ${user.profile?.is_active ? 'status-online' : 'status-offline'}`}>
                        {user.profile?.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
