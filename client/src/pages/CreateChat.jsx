import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

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
      const exists = prev.some((u) => u.id === clickedUser.id);

      if (exists) {
        return prev.filter((u) => u.id !== clickedUser.id);
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
          participants: selectedUsers.map((u) => u.id),
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
    <main>
      {type === 'dm' && (
        <div>
          <h2>Create DM</h2>

          <label>
            Search users
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username or display name"
            />
          </label>

          {searchLoading && <p>Searching...</p>}
          {searchErrors && <p>{searchErrors}</p>}
          {createError && <p>{createError}</p>}

          <div>
            {searchResults.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleCreateDm(user)}
                disabled={createLoading}
              >
                {user.displayName} @{user.username}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'group' && (
        <div>
          <h2>Create Group</h2>

          <form onSubmit={handleCreateGroup}>
            <label>
              Group title
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Enter group name"
              />
            </label>

            <label>
              Search users
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username or display name"
              />
            </label>

            {searchLoading && <p>Searching...</p>}
            {searchErrors && <p>{searchErrors}</p>}
            {createError && <p>{createError}</p>}

            {selectedUsers.length > 0 && (
              <div>
                <h3>Selected Users</h3>
                <div>
                  {selectedUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleSelectedUser(user)}
                    >
                      {user.displayName} ✕
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              {searchResults.map((user) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleSelectedUser(user)}
                  >
                    {isSelected ? '✓ ' : ''}
                    {user.displayName} @{user.username}
                  </button>
                );
              })}
            </div>

            <button type="submit" disabled={createLoading}>
              {createLoading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
