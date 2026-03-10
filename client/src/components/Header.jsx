import styles from './styles/Header.module.css';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header>
      {user ? (
        <>
          <a href="/">
            <h1 className={styles.title}>VMsg</h1>
          </a>
          <div className={styles.categories}>
            <div className={styles.chats}>
              <h2>Chats</h2>
              <div className={styles.chatsContainer}></div>
            </div>
          </div>
          <div className={styles.userContainer}>
            <p className={styles.userIconName}>
              <FaUser />
              {user.displayName}
            </p>
            <button className={styles.button} onClick={logout}>
              Logout
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className={styles.title}>VMsg</h1>
          <div className={styles.noUserButtons}>
            <button
              className={styles.button}
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              className={styles.button}
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>
        </>
      )}
    </header>
  );
}
