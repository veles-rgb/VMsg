import { useEffect, useState } from 'react';
import styles from './styles/Header.module.css';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import { FaUser, FaComments, FaSignOutAlt, FaPlus } from 'react-icons/fa';

export default function Header() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const apiUrl = import.meta.env.VITE_API_URL;

  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatError, setChatError] = useState('');

  useEffect(() => {
    if (!user || !token) return;

    async function fetchChats() {
      try {
        setLoadingChats(true);
        setChatError('');

        const res = await fetch(`${apiUrl}/chat`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Something went wrong: ${res.status}`);
        }

        const data = await res.json();
        setChats(data.chats || []);
      } catch (err) {
        setChatError(err.message || 'Something went wrong');
      } finally {
        setLoadingChats(false);
      }
    }

    fetchChats();
  }, [apiUrl, user, token]);

  function getChatName(chat) {
    if (chat.type === 'GROUP') {
      return chat.title || 'Group Chat';
    }

    const other = chat.otherParticipants?.[0]?.user;
    return other?.displayName || 'Chat';
  }

  function handleUserCardClick() {
    console.log('Card clicked');
  }

  return (
    <header className={styles.sidebar}>
      {user ? (
        <>
          <div className={styles.topSection}>
            <Link to="/" className={styles.logoLink}>
              <h1 className={styles.title}>VMsg</h1>
            </Link>

            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Chats</h2>
              <div>
                <FaPlus />
              </div>
            </div>

            <div className={styles.chatsContainer}>
              {loadingChats ? (
                <p className={styles.chatStatus}>Loading...</p>
              ) : chatError ? (
                <p className={styles.chatStatus}>{chatError}</p>
              ) : chats.length === 0 ? (
                <p className={styles.chatStatus}>No chats yet</p>
              ) : (
                chats.map((chat) => {
                  const isActive = location.pathname === `/chat/${chat.id}`;

                  return (
                    <button
                      key={chat.id}
                      className={`${styles.chatItem} ${isActive ? styles.activeChatItem : ''}`}
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      type="button"
                    >
                      <FaComments />
                      <span>{chat?.title || getChatName(chat)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={styles.userCard} onClick={handleUserCardClick}>
            <div className={styles.avatar}>
              <FaUser />
            </div>

            <div className={styles.userInfo}>
              <p className={styles.displayName}>{user.displayName}</p>
              <p className={styles.username}>@{user.username}</p>
            </div>

            <button
              className={styles.logoutButton}
              onClick={(e) => {
                e.stopPropagation();
                logout();
              }}
              type="button"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.loggedOutTop}>
            <h1 className={styles.title}>VMsg</h1>
          </div>

          <div className={styles.noUserButtons}>
            <button
              className={styles.primaryButton}
              onClick={() => navigate('/login')}
              type="button"
            >
              Login
            </button>

            <button
              className={styles.secondaryButton}
              onClick={() => navigate('/register')}
              type="button"
            >
              Register
            </button>
          </div>
        </>
      )}
    </header>
  );
}
