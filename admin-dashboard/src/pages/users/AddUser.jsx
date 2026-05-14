import React, { useState } from "react";
import { ArrowLeft, User, Mail, Lock, Shield, Phone, Save, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from '../../api';

const AddUser = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await api.post('/users', {
        name,
        email,
        password,
        role,
        phone
      });

      console.log('User created:', response.data);
      navigate("/users");
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.message || 'Failed to create user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "8px",
  };

  const inputContainerStyle = {
    position: "relative",
    width: "100%",
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px 14px 44px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "rgba(15, 23, 42, 0.4)",
    color: "#fff",
    fontSize: "15px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  };

  const iconStyle = {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
  };

  return (
    <div className="users-view" style={{ padding: '32px', minHeight: '100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => navigate("/users")}
            className="control-btn glass"
            style={{
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', margin: 0 }}>Create New User</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Register a new account in the system.</p>
          </div>
        </div>
      </header>

      <div className="glass" style={{ borderRadius: '24px', padding: '40px', maxWidth: '1000px' }}>
        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#f87171', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '14px' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            
            <div style={{ gridColumn: "span 1" }}>
              <label style={labelStyle}>Full Name</label>
              <div style={inputContainerStyle}>
                <User size={18} style={iconStyle} />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 1" }}>
              <label style={labelStyle}>Email Address</label>
              <div style={inputContainerStyle}>
                <Mail size={18} style={iconStyle} />
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 1" }}>
              <label style={labelStyle}>Password</label>
              <div style={inputContainerStyle}>
                <Lock size={18} style={iconStyle} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 1" }}>
              <label style={labelStyle}>Phone Number</label>
              <div style={inputContainerStyle}>
                <Phone size={18} style={iconStyle} />
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 1" }}>
              <label style={labelStyle}>User Role</label>
              <div style={inputContainerStyle}>
                <Shield size={18} style={iconStyle} />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ ...inputStyle, appearance: "none" }}
                >
                  <option value="customer">Customer</option>
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                  <option value="hr">Human Resources</option>
                </select>
              </div>
            </div>

          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="login-btn"
              style={{
                width: 'auto',
                padding: '12px 32px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? "Creating..." : <><Save size={20} /> Create Account</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;