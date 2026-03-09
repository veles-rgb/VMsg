import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import './App.css';

// Pages
import Header from './components/Header.jsx';
import Welcome from './pages/Welcome.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import { useEffect } from 'react';

function App() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { user, token } = useAuth();

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      fetch(`${apiUrl}/user/heartbeat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [apiUrl, token]);

  return (
    <>
      <Header />
      <Routes>
        {!user && (
          <>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </>
        )}

        {user && (
          <>
            <Route path="/" element={<Home />} />
          </>
        )}

        <Route path="*" element={<Navigate to={user ? '/' : '/welcome'} />} />
      </Routes>
    </>
  );
}

export default App;
