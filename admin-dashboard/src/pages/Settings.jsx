import React, { useState } from 'react';
import { Key, Shield, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    
    if (formData.new_password !== formData.new_password_confirmation) {
      return setStatus({ type: 'error', message: 'New passwords do not match' });
    }
    
    if (formData.new_password.length < 8) {
      return setStatus({ type: 'error', message: 'Password must be at least 8 characters long' });
    }

    setLoading(true);
    try {
      const res = await api.post('/change-password', formData);
      setStatus({ type: 'success', message: res.data?.message || 'Password changed successfully' });
      setFormData({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to change password. Ensure current password is correct.';
      setStatus({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={28} color="var(--primary)" /> Security Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your account security and password</p>
      </header>

      <div style={{ maxWidth: '600px' }}>
        <div className="glass" style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '32px', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="var(--primary)" /> Change Password
          </h2>

          {status.message && (
            <div style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: status.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              color: status.type === 'error' ? '#ef4444' : '#22c55e',
              border: `1px solid ${status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
            }}>
              {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span style={{ fontSize: '0.9rem' }}>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Password</label>
              <input 
                type="password" 
                name="current_password"
                value={formData.current_password} 
                onChange={handleChange} 
                required
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', outline: 'none' }}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>New Password</label>
              <input 
                type="password" 
                name="new_password"
                value={formData.new_password} 
                onChange={handleChange} 
                required
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', outline: 'none' }}
                placeholder="Enter new password (min. 8 characters)"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confirm New Password</label>
              <input 
                type="password" 
                name="new_password_confirmation"
                value={formData.new_password_confirmation} 
                onChange={handleChange} 
                required
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', outline: 'none' }}
                placeholder="Confirm your new password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '12px', padding: '14px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {loading ? <Loader2 className="spin" size={20} /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
