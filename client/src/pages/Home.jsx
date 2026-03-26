import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getSocket } from '../socket';
import styles from './styles/Home.module.css';

import {
  FaUser,
  FaUsers,
  FaComments,
  FaBolt,
  FaArrowRight,
} from 'react-icons/fa';
import { HiAtSymbol } from 'react-icons/hi';
import { FaMessage } from 'react-icons/fa6';

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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setOnlineUsers(data?.users || []);
    } catch (err) {
      setOnlineUsersError(err.message || 'Something went wrong');
    } finally {
      setOnlineUsersLoading(false);
    }
  }, [apiUrl, token, logout]);

  useEffect(() => {
    if (!token || !user) return;
    setOnlineUsersLoading(true);
    fetchOnlineUsers();
  }, [fetchOnlineUsers, token, user]);

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

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || `Something went wrong: ${res.status}`,
        );
      }

      navigate(`/chat/${data.chatId}`);
    } catch (err) {
      setChatError(err.message || 'Something went wrong');
    } finally {
      setLoadingChat(false);
    }
  }

  function handleProfileClick(user) {
    navigate(`/user/${user.username}`);
  }

  const filteredUsers = useMemo(
    () => onlineUsers.filter((onlineUser) => onlineUser.id !== user?.id),
    [onlineUsers, user?.id],
  );

  const activeUsersCount = filteredUsers.length;
  const featuredUsers = filteredUsers.slice(0, 3);
  const heroTitle = user?.displayName
    ? `Welcome back, ${user.displayName}`
    : 'Welcome back';

  return (
    <main className={styles.main}>
      <div className={styles.mainHeader}>
        <div className={styles.headerInner}>
          <div className={styles.headerBadge}>Home</div>
          <h1 className={styles.headerTitle}>{heroTitle}</h1>
          <p className={styles.headerSubtitle}>
            Start a conversation, see who is around, and jump back into VMsg.
          </p>
        </div>
      </div>

      <div className={styles.pageContent}>
        <section className={styles.heroCard}>
          <div className={styles.heroLeft}>
            <div className={styles.heroCopy}>
              <span className={styles.heroEyebrow}>Your messaging hub</span>
              <h2 className={styles.heroTitle}>Chat it up!</h2>
              <p className={styles.heroDescription}>
                Browse who is online right now and open a DM instantly.
              </p>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <FaUsers className={styles.statIcon} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Users online</span>
                  <strong className={styles.statValue}>
                    {activeUsersCount}
                  </strong>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <FaComments className={styles.statIcon} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Available DMs</span>
                  <strong className={styles.statValue}>
                    {activeUsersCount > 0 ? activeUsersCount : 0}
                  </strong>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIconWrap}>
                  <HiAtSymbol className={styles.statIcon} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Your username</span>
                  <strong className={styles.statValue}>
                    @{user?.username}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.quickCard}>
              <div className={styles.quickCardHeader}>
                <FaBolt className={styles.quickCardIcon} />
                <span className={styles.quickCardTitle}>Quick start</span>
              </div>

              <p className={styles.quickCardText}>
                Pick someone from the online list below to start chatting
                immediately.
              </p>

              <div className={styles.featuredList}>
                {featuredUsers.length === 0 ? (
                  <div className={styles.featuredEmpty}>
                    No one else is online right now.
                  </div>
                ) : (
                  featuredUsers.map((featuredUser) => (
                    <div
                      key={featuredUser.id}
                      className={styles.featuredUser}
                      onClick={() => handleProfileClick(featuredUser)}
                    >
                      <img
                        className={styles.featuredAvatar}
                        src={getAvatarSrc(featuredUser.profilePictureUrl)}
                        alt=""
                      />
                      <div className={styles.featuredMeta}>
                        <span className={styles.featuredName}>
                          {featuredUser.displayName}
                        </span>
                        <span className={styles.featuredUsername}>
                          @{featuredUser.username}
                        </span>
                      </div>
                      <button
                        className={styles.featuredArrow}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(featuredUser);
                        }}
                      >
                        <FaMessage />
                      </button>
                    </div>
                  ))
                )}
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
            <h3 className={styles.stateTitle}>Loading your home feed...</h3>
            <p className={styles.stateText}>
              Pulling the latest online users now.
            </p>
          </section>
        ) : filteredUsers.length === 0 ? (
          <section className={styles.stateCard}>
            <h3 className={styles.stateTitle}>No users online right now</h3>
            <p className={styles.stateText}>
              Check back in a bit, or wait for someone else to come online.
            </p>
          </section>
        ) : (
          <section className={styles.listSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Online now</h2>
                <p className={styles.sectionSubtitle}>
                  Click a user to view profile or message them.
                </p>
              </div>
              <span className={styles.sectionCount}>
                {activeUsersCount} {activeUsersCount === 1 ? 'user' : 'users'}
              </span>
            </div>

            <div className={styles.usersGrid}>
              {filteredUsers.map((onlineUser) => (
                <div
                  key={onlineUser.id}
                  className={styles.userCard}
                  onClick={() => handleProfileClick(onlineUser)}
                >
                  <div className={styles.userTop}>
                    <img
                      className={styles.avatar}
                      src={getAvatarSrc(onlineUser?.profilePictureUrl)}
                      alt=""
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
                    <div className={styles.presence}>
                      <span className={styles.onlineDot} />
                      <span className={styles.onlineText}>Online now</span>
                    </div>

                    <button
                      className={styles.messagePill}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(onlineUser);
                      }}
                      disabled={loadingChat}
                    >
                      {loadingChat ? 'Opening...' : 'Message'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
