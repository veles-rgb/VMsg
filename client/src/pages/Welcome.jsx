import { useNavigate } from 'react-router-dom';
import styles from './styles/Welcome.module.css';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <div className={styles.badge}>Welcome</div>

        <h1 className={styles.title}>VMsg</h1>

        <p className={styles.subtitle}>
          Welcome to VMsg. Jump into your conversations by logging in or create
          a new account to get started.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={() => navigate('/login')}
          >
            Login
          </button>

          <button
            className={styles.secondaryButton}
            onClick={() => navigate('/register')}
          >
            Register
          </button>
        </div>
      </section>
    </main>
  );
}
