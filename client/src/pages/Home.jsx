import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import styles from './styles/Home.module.css';
import { formatDate } from '../utils/formatDate';

import { FaUser, FaClock } from 'react-icons/fa';
import { HiAtSymbol } from 'react-icons/hi';

export default function Home() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(true);
  const [onlineUsersError, setOnlineUsersError] = useState('');
  // Chat stuff
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState('');

  const { token, user, logout } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !user) return;

    let ignore = false;

    async function getOnlineUsers(showLoading = false) {
      try {
        if (showLoading) {
          setOnlineUsersLoading(true);
        }

        setOnlineUsersError('');

        const res = await fetch(`${apiUrl}/user/online`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          logout();
          return;
        }

        if (!res.ok) {
          throw new Error(`Something went wrong ${res.status}`);
        }

        const data = await res.json();

        if (!ignore) {
          setOnlineUsers(data.users || []);
        }
      } catch (err) {
        if (!ignore) {
          setOnlineUsersError(err.message || 'Something went wrong');
        }
      } finally {
        if (!ignore) {
          setOnlineUsersLoading(false);
        }
      }
    }

    getOnlineUsers(true);

    const interval = setInterval(() => {
      getOnlineUsers(false);
    }, 10000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [apiUrl, token, user, logout]);

  async function handleUserClick(clickedUser) {
    try {
      setLoadingChat(true);
      setChatError('');

      const chatPayload = { userId: user.id, targetId: clickedUser.id };

      const res = await fetch(`${apiUrl}/chat/dm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatPayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Something went wrong ${res.status}`);
      }

      const data = await res.json();
      navigate(`/chat/${data.chatId}`);
    } catch (err) {
      setChatError(err.error || `Something went wrong`);
    } finally {
      setLoadingChat(false);
    }
  }

  const filteredUsers = onlineUsers.filter((u) => u.id !== user?.id);

  if (onlineUsersLoading) {
    return (
      <main className={styles.main}>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
          Online Users
        </h2>
        <p>LOADING...</p>
      </main>
    );
  }

  if (loadingChat) {
    return (
      <main>
        <p>LOADING CHAT...</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
        Online Users
      </h2>

      {onlineUsersError && <p>{onlineUsersError}</p>}
      {chatError && <p>{chatError}</p>}

      {!onlineUsersError && filteredUsers.length === 0 && (
        <p>No other users are currently online.</p>
      )}

      <div className={styles.usersContainer}>
        {filteredUsers.map((u) => {
          return (
            <div
              key={u.id}
              className={styles.userEl}
              onClick={() => handleUserClick(u)}
            >
              <img
                src="https://hwchamber.co.uk/wp-content/uploads/2022/04/avatar-placeholder.gif"
                alt=""
                width="75"
              />
              <div className={styles.userInfo}>
                <div className="contains-icon">
                  <FaUser />
                  {u.displayName}
                </div>
                <div className="contains-icon">
                  <HiAtSymbol />
                  {u.username}
                </div>
                <div className="contains-icon">
                  <FaClock />
                  {formatDate(u.lastSeenAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
