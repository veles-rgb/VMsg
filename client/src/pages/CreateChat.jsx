import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import styles from './styles/CreateChat.module.css';

const DEFAULT_AVATAR =
  'https://simplyilm.com/wp-content/uploads/2017/08/temporary-profile-placeholder-1.jpg';

function getAvatarSrc(profilePictureUrl) {
  return profilePictureUrl || DEFAULT_AVATAR;
}

export default function CreateChat() {
  const { type } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErrors, setSearchErrors] = useState('');

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (type !== 'dm' && type !== 'group') {
      navigate('/');
    }
  }, [type, navigate]);

  useEffect(() => {
    if (!token) return;

    const trimmed = searchTerm.trim();

    if (!trimmed) {
      setSearchResults([]);
      setSearchErrors('');
      setSearchLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchErrors('');

        const res = await fetch(
          `${apiUrl}/user/search?q=${encodeURIComponent(trimmed)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Something went wrong: ${res.status}`);
        }

        const data = await res.json();
        setSearchResults(data.users || []);
      } catch (err) {
        setSearchErrors(err.message || 'Something went wrong');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [apiUrl, searchTerm, token]);

  function toggleSelectedUser(clickedUser) {
    setSelectedUsers((prev) => {
      const exists = prev.some((user) => user.id === clickedUser.id);

      if (exists) {
        return prev.filter((user) => user.id !== clickedUser.id);
      }

      return [...prev, clickedUser];
    });
  }

  async function handleCreateDm(clickedUser) {
    try {
      setCreateLoading(true);
      setCreateError('');

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
        throw new Error(data?.error || `Something went wrong: ${res.status}`);
      }

      const data = await res.json();
      navigate(`/chat/${data.chatId}`);
    } catch (err) {
      setCreateError(err.message || 'Something went wrong');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();

    try {
      setCreateLoading(true);
      setCreateError('');

      if (!groupTitle.trim()) {
        throw new Error('Group title is required');
      }

      if (selectedUsers.length === 0) {
        throw new Error('Select at least one user');
      }

      const res = await fetch(`${apiUrl}/chat/group`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: groupTitle.trim(),
          participants: selectedUsers.map((user) => user.id),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Something went wrong: ${res.status}`);
      }

      const data = await res.json();
      navigate(`/chat/${data.chatId}`);
    } catch (err) {
      setCreateError(err.message || 'Something went wrong');
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {type === 'dm' && (
          <div className={styles.card}>
            <h2 className={styles.title}>Create DM</h2>

            <label className={styles.label}>
              Search users
              <input
                className={styles.input}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username or display name"
              />
            </label>

            {searchLoading && <p className={styles.status}>Searching...</p>}
            {searchErrors && <p className={styles.error}>{searchErrors}</p>}
            {createError && <p className={styles.error}>{createError}</p>}

            <div className={styles.results}>
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={styles.userButton}
                  onClick={() => handleCreateDm(user)}
                  disabled={createLoading}
                >
                  <div className={styles.userRow}>
                    <img
                      className={styles.userAvatar}
                      src={getAvatarSrc(user?.profilePictureUrl)}
                      alt={`${user?.displayName || 'User'}'s avatar`}
                    />

                    <div className={styles.userMeta}>
                      <span className={styles.displayName}>
                        {user.displayName}
                      </span>
                      <span className={styles.username}>@{user.username}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'group' && (
          <div className={styles.card}>
            <h2 className={styles.title}>Create Group</h2>

            <form className={styles.form} onSubmit={handleCreateGroup}>
              <label className={styles.label}>
                Group title
                <input
                  className={styles.input}
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Enter group name"
                />
              </label>

              <label className={styles.label}>
                Search users
                <input
                  className={styles.input}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by username or display name"
                />
              </label>

              {searchLoading && <p className={styles.status}>Searching...</p>}
              {searchErrors && <p className={styles.error}>{searchErrors}</p>}
              {createError && <p className={styles.error}>{createError}</p>}

              {selectedUsers.length > 0 && (
                <div className={styles.selectedSection}>
                  <h3 className={styles.selectedTitle}>Selected Users</h3>

                  <div className={styles.selectedUsers}>
                    {selectedUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className={styles.selectedChip}
                        onClick={() => toggleSelectedUser(user)}
                      >
                        <img
                          className={styles.selectedChipAvatar}
                          src={getAvatarSrc(user?.profilePictureUrl)}
                          alt={`${user?.displayName || 'User'}'s avatar`}
                        />
                        <span>{user.displayName}</span>
                        <span>✕</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.results}>
                {searchResults.map((user) => {
                  const isSelected = selectedUsers.some(
                    (u) => u.id === user.id,
                  );

                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`${styles.userButton} ${
                        isSelected ? styles.userButtonSelected : ''
                      }`}
                      onClick={() => toggleSelectedUser(user)}
                    >
                      <div className={styles.userRow}>
                        <img
                          className={styles.userAvatar}
                          src={getAvatarSrc(user?.profilePictureUrl)}
                          alt={`${user?.displayName || 'User'}'s avatar`}
                        />

                        <div className={styles.userMeta}>
                          <span className={styles.displayName}>
                            {user.displayName}
                          </span>
                          <span className={styles.username}>
                            @{user.username}
                          </span>
                        </div>

                        <span className={styles.userStatus}>
                          {isSelected ? '✓' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
