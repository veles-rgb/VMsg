import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import './App.css';

// Pages
import Header from './components/Header.jsx';
import Welcome from './pages/Welcome.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Chat from './pages/Chat.jsx';
import CreateChat from './pages/CreateChat.jsx';
import Me from './pages/Me.jsx';
import Profile from './pages/Profile.jsx';

function App() {
  const { user, token, logout, verify, authLoading } = useAuth();

  useEffect(() => {
    async function checkAuth() {
      if (!token) return;

      const ok = await verify();

      if (!ok) {
        logout();
      }
    }

    checkAuth();
  }, [token, logout, verify]);

  if (authLoading) {
    return <p>Loading...</p>;
  }

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
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="/chat/new/:type" element={<CreateChat />} />
            <Route path="/me" element={<Me />} />
            <Route path="/user/:username" element={<Profile />} />
          </>
        )}

        <Route path="*" element={<Navigate to={user ? '/' : '/welcome'} />} />
      </Routes>
    </>
  );
}

export default App;
