import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerErr, setRegisterErr] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL;
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    setRegisterLoading(true);
    setRegisterErr('');

    if (password !== confirmPassword) {
      setRegisterErr('Passwords do not match');
      setRegisterLoading(false);
      return;
    }

    try {
      const registerPayload = {
        username: username.trim(),
        displayName: displayName.trim(),
        password,
      };

      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Register failed ${res.status}`);
      }

      const data = await res.json();

      login(data);
      navigate('/');

      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setRegisterErr(err.message || `Something went wrong`);
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <h2>Register</h2>

        {registerErr && <p style={{ color: 'red' }}>{registerErr}</p>}

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
          Display Name
          <input
            type="text"
            name="displayName"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
        <label>
          Confirm Password
          <input
            type="password"
            name="confirmPassword"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>

        <button type="submit" disabled={registerLoading}>
          {registerLoading ? 'Registering' : 'Register'}
        </button>

        <p>
          Already have an account? <a href="/login">login</a>
        </p>
      </form>
    </main>
  );
}
