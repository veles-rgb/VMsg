import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './styles/Login.module.css';

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
      const loginPayload = {
        username: username.trim(),
        password,
      };

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
    <main className={styles.main}>
      <section className={styles.card}>
        <div className={styles.badge}>Welcome back</div>
        <h2 className={styles.title}>Login</h2>
        <p className={styles.subtitle}>Sign in to continue chatting on VMsg.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {loginErr && <p className={styles.error}>{loginErr}</p>}

          <label className={styles.label}>
            Username
            <input
              className={styles.input}
              type="text"
              name="username"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              name="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button
            className={styles.submitButton}
            type="submit"
            disabled={loginLoading}
          >
            {loginLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link className={styles.link} to="/register">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
