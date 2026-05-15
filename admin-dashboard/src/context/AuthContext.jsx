import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          // Temporarily use import statement dynamic or global fetch since api.js might not be imported yet
          const res = await fetch('http://localhost:8002/api/v1/admin/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          const data = await res.json();
          if (res.ok && data.data) {
            const fullUser = { ...data.data.user, permissions: data.data.permissions, roles: data.data.roles };
            setUser(fullUser);
            localStorage.setItem('admin_user', JSON.stringify(fullUser));
          } else {
            // Invalid token
            logout();
          }
        } catch (e) {
          setUser(JSON.parse(localStorage.getItem('admin_user')));
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [token]);

  const login = (userData, userToken) => {
    localStorage.setItem('admin_token', userToken);
    localStorage.setItem('admin_user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
