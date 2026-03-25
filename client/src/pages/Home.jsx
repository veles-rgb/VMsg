import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getSocket } from '../socket';
import styles from './styles/Home.module.css';

import { FaUser, FaUsers, FaComments } from 'react-icons/fa';
import { HiAtSymbol } from 'react-icons/hi';

const DEFAULT_AVATAR =
  'https://simplyilm.com/wp-content/uploads/2017/08/temporary-profile-placeholder-1.jpg';

function getAvatarSrc(profilePictureUrl) {
  return profilePictureUrl || DEFAULT_AVATAR;
}

export default function Home() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(true);
  const [onlineUsersError, setOnlineUsersError] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState('');

  const { token, user, logout } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const fetchOnlineUsers = useCallback(async () => {
    if (!token) return;

    try {
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
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      const data = await res.json();
      setOnlineUsers(data.users || []);
    } catch (err) {
      setOnlineUsersError(err.message || 'Something went wrong');
    } finally {
      setOnlineUsersLoading(false);
    }
  }, [apiUrl, token, logout]);

  // initial load
  useEffect(() => {
    if (!token || !user) return;
    setOnlineUsersLoading(true);
    fetchOnlineUsers();
  }, [fetchOnlineUsers, token, user]);

  // SOCKET REALTIME UPDATE
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handlePresenceUpdate() {
      fetchOnlineUsers();
    }

    socket.on('presence:online_users', handlePresenceUpdate);

    return () => {
      socket.off('presence:online_users', handlePresenceUpdate);
    };
  }, [fetchOnlineUsers]);

  async function handleUserClick(clickedUser) {
    try {
      setLoadingChat(true);
      setChatError('');

      const res = await fetch(`${apiUrl}/chat/dm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId: clickedUser.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message || data?.error || `Something went wrong: ${res.status}`,
        );
      }

      const data = await res.json();
      navigate(`/chat/${data.chatId}`);
    } catch (err) {
      setChatError(err.message || 'Something went wrong');
    } finally {
      setLoadingChat(false);
    }
  }

  const filteredUsers = useMemo(
    () => onlineUsers.filter((u) => u.id !== user?.id),
    [onlineUsers, user?.id],
  );

  const activeUsersCount = filteredUsers.length;

  return (
    <main className={styles.main}>
      <div className={styles.mainHeader}>
        <div className={styles.headerInner}>
          <h1 className={styles.headerTitle}>Home</h1>
          <p className={styles.headerSubtitle}>
            Welcome back{user?.displayName ? `, ${user.displayName}` : ''}. See
            who is online and jump straight into a conversation.
          </p>
        </div>
      </div>

      <div className={styles.pageContent}>
        <section className={styles.heroCard}>
          <div className={styles.heroText}>
            <h2 className={styles.heroTitle}>Online users</h2>
            <p className={styles.heroDescription}>
              Click any active user below to start chatting instantly.
            </p>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconWrap}>
                <FaUsers className={styles.statIcon} />
              </div>

              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Active users</span>
                <strong className={styles.statValue}>{activeUsersCount}</strong>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrap}>
                <FaComments className={styles.statIcon} />
              </div>

              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Chat status</span>
                <strong className={styles.statValue}>
                  {loadingChat ? 'Opening...' : 'Ready'}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {onlineUsersError && (
          <div className={styles.feedbackError}>{onlineUsersError}</div>
        )}

        {chatError && <div className={styles.feedbackError}>{chatError}</div>}

        {onlineUsersLoading ? (
          <section className={styles.stateCard}>
            <h3 className={styles.stateTitle}>Loading users...</h3>
          </section>
        ) : filteredUsers.length === 0 ? (
          <section className={styles.stateCard}>
            <h3 className={styles.stateTitle}>No users online right now</h3>
          </section>
        ) : (
          <section className={styles.listSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Online now</h2>
              <span className={styles.sectionCount}>
                {activeUsersCount} {activeUsersCount === 1 ? 'user' : 'users'}
              </span>
            </div>

            <div className={styles.usersGrid}>
              {filteredUsers.map((onlineUser) => (
                <button
                  key={onlineUser.id}
                  type="button"
                  className={styles.userCard}
                  onClick={() => handleUserClick(onlineUser)}
                  disabled={loadingChat}
                >
                  <div className={styles.userTop}>
                    <img
                      className={styles.avatar}
                      src={getAvatarSrc(onlineUser?.profilePictureUrl)}
                      alt="avatar"
                    />

                    <div className={styles.userMeta}>
                      <div className={styles.infoRow}>
                        <FaUser className={styles.infoIcon} />
                        <span className={styles.displayName}>
                          {onlineUser.displayName}
                        </span>
                      </div>

                      <div className={styles.infoRow}>
                        <HiAtSymbol className={styles.infoIcon} />
                        <span className={styles.username}>
                          {onlineUser.username}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.userBottom}>
                    <span className={styles.onlineDot} />
                    <span className={styles.onlineText}>Online</span>

                    <span className={styles.messagePill}>Message</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
