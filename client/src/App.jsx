import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import './App.css';

// Pages
import Welcome from './pages/Welcome.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';

function App() {
  const { user } = useAuth();
  return (
    <>
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
