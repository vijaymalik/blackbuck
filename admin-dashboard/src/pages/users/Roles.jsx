import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, X, Loader2, Check } from 'lucide-react';
import api from '../../api';

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/roles');
      setRoles(res.data.roles);
      setPermissions(res.data.permissions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permName) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(permName)
        ? prev.permissions.filter(p => p !== permName)
        : [...prev.permissions, permName];
      return { ...prev, permissions: perms };
    });
  };

  const openModal = (role = null) => {
    setCurrentRole(role);
    if (role) {
      setFormData({
        name: role.name,
        permissions: role.permissions.map(p => p.name)
      });
    } else {
      setFormData({ name: '', permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentRole) {
        await api.put(`/roles/${currentRole.id}`, formData);
      } else {
        await api.post('/roles', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving role');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await api.delete(`/roles/${id}`);
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting role');
      }
    }
  };

  return (
    <div style={{ padding: '32px', color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Roles & Permissions</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage access control across the system</p>
        </div>
        <button onClick={() => openModal()} className="login-btn" style={{ width: 'auto', padding: '0 20px', height: '40px', display: 'flex', gap: '8px' }}>
          <Plus size={18} /> Create Role
        </button>
      </header>

      <div className="glass" style={{ flex: 1, borderRadius: '24px', overflow: 'hidden', padding: '20px', background: 'var(--border)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spin" size={32} /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {roles.map(role => (
              <div key={role.id} style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, textTransform: 'capitalize' }}>
                    <Shield size={20} color="var(--primary)" /> {role.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openModal(role)} style={{ background: 'transparent', border: 'none', color: '#eab308', cursor: 'pointer' }}><Edit size={16} /></button>
                    {!['admin', 'driver', 'customer'].includes(role.name) && (
                      <button onClick={() => handleDelete(role.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {role.permissions.map(p => (
                    <span key={p.id} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                      {p.name}
                    </span>
                  ))}
                  {role.permissions.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No specific permissions</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass" style={{ width: '500px', background: 'var(--card-bg)', padding: '32px', borderRadius: '24px', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ margin: '0 0 20px 0' }}>{currentRole ? 'Edit Role' : 'Create Role'}</h2>
            
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', color: 'var(--text-main)', outline: 'none' }}
                  required
                  disabled={currentRole && ['admin', 'driver', 'customer'].includes(currentRole.name)}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assign Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                  {permissions.map(perm => (
                    <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: formData.permissions.includes(perm.name) ? 'var(--primary)' : 'transparent' }}>
                        {formData.permissions.includes(perm.name) && <Check size={14} color="white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        style={{ display: 'none' }} 
                        checked={formData.permissions.includes(perm.name)} 
                        onChange={() => handlePermissionToggle(perm.name)} 
                      />
                      <span style={{ textTransform: 'capitalize' }}>{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="login-btn" style={{ width: '100%' }}>{currentRole ? 'Update Role' : 'Save Role'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
