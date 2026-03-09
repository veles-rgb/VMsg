import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import styles from './styles/Home.module.css';
import { formatDate } from '../utils/formatDate';

import { FaUser, FaClock } from 'react-icons/fa';
import { HiAtSymbol } from 'react-icons/hi';

export default function Home() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(false);
  const [onlineUsersError, setOnlineUsersError] = useState('');

  const { token } = useAuth();

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function getOnlineUsers() {
      try {
        setOnlineUsersLoading(true);
        setOnlineUsersError('');

        const res = await fetch(`${apiUrl}/user/online`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Something went wrong ${res.status}`);
        }

        const data = await res.json();

        setOnlineUsers(data.users);
        setOnlineUsersLoading(false);
      } catch (err) {
        setOnlineUsersError(err);
      } finally {
        setOnlineUsersLoading(false);
      }
    }

    getOnlineUsers();
  }, [apiUrl, token]);

  if (onlineUsersLoading)
    return (
      <>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
          Online Users
        </h2>
        <p>LOADING...</p>
      </>
    );

  return (
    <main className={styles.main}>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
        Online Users
      </h2>
      {onlineUsersError && <p>{onlineUsersError}</p>}
      <div className={styles.usersContainer}>
        {onlineUsers.map((user) => {
          return (
            <div key={user.id} className={styles.userEl}>
              <img
                src="https://hwchamber.co.uk/wp-content/uploads/2022/04/avatar-placeholder.gif"
                alt=""
                width={'75px'}
              />
              <div className={styles.userInfo}>
                <div className="contains-icon">
                  <FaUser />
                  {user.displayName}
                </div>
                <div className="contains-icon">
                  <HiAtSymbol />
                  {user.username}
                </div>
                <div className="contains-icon">
                  <FaClock />
                  {formatDate(user.lastSeenAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
