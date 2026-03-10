import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL;
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    setLoginLoading(true);
    setLoginErr('');

    try {
      const loginPayload = { username, password };

      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Something went wrong ${res.status}`);
      }

      const data = await res.json();

      login(data);

      navigate('/');
    } catch (err) {
      setLoginErr(err.message || 'Something went wrong');
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>

        {loginErr && <p style={{ color: 'red' }}>{loginErr}</p>}

        <label>
          Username
          <input
            type="text"
            name="username"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit">{loginLoading ? 'logging in' : 'Login'}</button>

        <p>
          Don't have an account? <a href="/register">Register</a>
        </p>
      </form>
    </main>
  );
}
