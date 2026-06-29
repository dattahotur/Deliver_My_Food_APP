import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent login
    const storedUser = localStorage.getItem('ride_partner_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      // Fetch latest user data from DB to stay in sync
      axios.get(`http://localhost:5010/${parsedUser.id}`)
        .then(res => {
           setUser(res.data);
           localStorage.setItem('ride_partner_user', JSON.stringify(res.data));
        })
        .catch(err => console.error("Failed to refresh user auth state", err));
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    if (user?.id) {
       try {
         const res = await axios.get(`http://localhost:5010/${user.id}`);
         setUser(res.data);
         localStorage.setItem('ride_partner_user', JSON.stringify(res.data));
       } catch (err) {
         console.error("Failed to refresh user", err);
       }
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:5010/login', { email, password });
      const userData = res.data.user;
      
      // Ensure only valid drivers can log into this specific app
      if (userData.role !== 'delivery-partner' && userData.role !== 'admin') {
         throw new Error('Unauthorized. Only registered Delivery Partners can log in here.');
      }
      
      setUser(userData);
      localStorage.setItem('ride_partner_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      throw err.response?.data?.error || err.message || 'Login failed';
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post('http://localhost:5010/register', {
        name,
        email,
        password,
        role: 'delivery-partner'
      });
      const userData = res.data.user;
      setUser(userData);
      localStorage.setItem('ride_partner_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      throw err.response?.data?.error || err.message || 'Registration failed';
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ride_partner_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
