import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './styles/Register.module.css';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 25;
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 25;

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

    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (
      trimmedUsername.length < USERNAME_MIN_LENGTH ||
      trimmedUsername.length > USERNAME_MAX_LENGTH
    ) {
      setRegisterErr(
        `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters`,
      );
      setRegisterLoading(false);
      return;
    }

    if (
      trimmedDisplayName.length < DISPLAY_NAME_MIN_LENGTH ||
      trimmedDisplayName.length > DISPLAY_NAME_MAX_LENGTH
    ) {
      setRegisterErr(
        `Display name must be between ${DISPLAY_NAME_MIN_LENGTH} and ${DISPLAY_NAME_MAX_LENGTH} characters`,
      );
      setRegisterLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setRegisterErr('Passwords do not match');
      setRegisterLoading(false);
      return;
    }

    try {
      const registerPayload = {
        username: trimmedUsername,
        displayName: trimmedDisplayName,
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
      setRegisterErr(err.message || 'Something went wrong');
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <div className={styles.badge}>Create account</div>
        <h2 className={styles.title}>Register</h2>
        <p className={styles.subtitle}>
          Create your VMsg account to start messaging right away.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {registerErr && <p className={styles.error}>{registerErr}</p>}

          <label className={styles.label}>
            Username
            <input
              className={styles.input}
              type="text"
              name="username"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={USERNAME_MIN_LENGTH}
              maxLength={USERNAME_MAX_LENGTH}
            />
          </label>

          <label className={styles.label}>
            Display Name
            <input
              className={styles.input}
              type="text"
              name="displayName"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={DISPLAY_NAME_MIN_LENGTH}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
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

          <label className={styles.label}>
            Confirm Password
            <input
              className={styles.input}
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          <button
            className={styles.submitButton}
            type="submit"
            disabled={registerLoading}
          >
            {registerLoading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link className={styles.link} to="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
