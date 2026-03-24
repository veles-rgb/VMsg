import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useParams } from 'react-router-dom';
import { formatDate } from '../utils/formatDate';
import styles from './styles/Chat.module.css';

import {
  FaGear,
  FaPlus,
  FaCircleArrowUp,
  FaHourglassEnd,
  FaArrowRightFromBracket,
  FaUserPlus,
} from 'react-icons/fa6';

import { FaEdit, FaRegWindowClose } from 'react-icons/fa';

export default function Chat() {
  const { chatId } = useParams();
  const { token, user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const textareaRef = useRef(null);
  const chatRef = useRef(null);
  const settingsRef = useRef(null);

  const [chat, setChat] = useState(null);
  const [otherParticipants, setOtherParticipants] = useState([]);
  const [messages, setMessages] = useState([]);

  const [loadingChat, setLoadingChat] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingSearchUser, setLoadingSearchUser] = useState(false);
  const [newTitleLoading, setNewTitleLoading] = useState(false);
  const [isAddingUsers, setIsAddingUsers] = useState(false);

  const [chatError, setChatError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [searchErrors, setSearchErrors] = useState('');
  const [newTitleError, setNewTitleError] = useState('');
  const [addUsersError, setAddUsersError] = useState('');

  const [message, setMessage] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [showTitleForm, setShowTitleForm] = useState(false);
  const [showSearchUser, setShowSearchUser] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const existingUserIds = useMemo(
    () => chat?.participants?.map((p) => p.userId) || [],
    [chat],
  );

  const chatDisplayTitle =
    chat?.type === 'GROUP'
      ? chat?.title || 'Group Chat'
      : otherParticipants[0]?.user?.displayName || 'Chat';

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function fetchChat() {
      try {
        setLoadingChat(true);
        setChatError('');

        const res = await fetch(`${apiUrl}/chat/${chatId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error ||
              data?.message ||
              `Something went wrong: ${res.status}`,
          );
        }

        const data = await res.json();

        setChat(data.chat);
        setOtherParticipants(data.otherParticipants || []);
        setNewTitle(data.chat?.title || '');
      } catch (err) {
        setChatError(err.message || 'Something went wrong');
      } finally {
        setLoadingChat(false);
      }
    }

    if (!token) return;
    fetchChat();
  }, [apiUrl, chatId, token]);

  useEffect(() => {
    async function fetchMessages() {
      try {
        setLoadingMessages(true);
        setMessageError('');

        const res = await fetch(`${apiUrl}/chat/${chatId}/messages`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error ||
              data?.message ||
              `Something went wrong: ${res.status}`,
          );
        }

        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        setMessageError(err.message || 'Something went wrong');
      } finally {
        setLoadingMessages(false);
      }
    }

    if (!token) return;
    fetchMessages();
  }, [apiUrl, chatId, token]);

  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (!token || !trimmed || !showSearchUser) {
      setSearchResults([]);
      setSearchErrors('');
      setLoadingSearchUser(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearchErrors('');
        setLoadingSearchUser(true);

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
        setLoadingSearchUser(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [apiUrl, searchTerm, token, showSearchUser]);

  function resetUserSearchState() {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedUsers([]);
    setSearchErrors('');
    setAddUsersError('');
  }

  function handleSettingsClick() {
    setShowSettings((prev) => !prev);
  }

  function handleRenameChat() {
    setShowTitleForm(true);
    setShowSettings(false);
    setNewTitleError('');
  }

  function handleCloseTitleForm() {
    setShowTitleForm(false);
    setNewTitleError('');
    setNewTitle(chat?.title || '');
  }

  function handleShowUserSearch() {
    setShowSearchUser(true);
    setAddUsersError('');
    setSearchErrors('');
  }

  function handleCloseUserSearch() {
    setShowSearchUser(false);
    resetUserSearchState();
  }

  function toggleSelectedUser(clickedUser) {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === clickedUser.id);

      if (exists) {
        return prev.filter((u) => u.id !== clickedUser.id);
      }

      return [...prev, clickedUser];
    });
  }

  async function refreshChat() {
    const res = await fetch(`${apiUrl}/chat/${chatId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Failed to refresh chat');
    }

    setChat(data.chat);
    setOtherParticipants(data.otherParticipants || []);
    setNewTitle(data.chat?.title || '');
  }

  async function handleSend() {
    if (!message.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      setMessageError('');

      const res = await fetch(`${apiUrl}/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      const data = await res.json();

      setMessages((prev) => [...prev, data.message]);
      setMessage('');

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      setMessageError(err.message || 'Something went wrong');
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleTitleFormSubmit(e) {
    e.preventDefault();

    if (!newTitle.trim() || newTitleLoading) return;

    try {
      setNewTitleLoading(true);
      setNewTitleError('');

      const res = await fetch(`${apiUrl}/chat/${chatId}/rename`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newTitle: newTitle.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setChat((prev) =>
        prev
          ? {
              ...prev,
              title: newTitle.trim(),
            }
          : prev,
      );

      setShowTitleForm(false);
      setNewTitleError('');
    } catch (err) {
      setNewTitleError(err.message || 'Something went wrong');
    } finally {
      setNewTitleLoading(false);
    }
  }

  async function handleAddUserToGroup() {
    if (!chat?.id || chat.type !== 'GROUP' || isAddingUsers) return;

    const userIdsToAdd = selectedUsers
      .map((selectedUser) => selectedUser.id)
      .filter(Boolean)
      .filter((id) => !existingUserIds.includes(id));

    if (userIdsToAdd.length === 0) {
      setAddUsersError('Please select at least one valid user to add');
      return;
    }

    try {
      setIsAddingUsers(true);
      setAddUsersError('');

      const res = await fetch(`${apiUrl}/chat/${chat.id}/add-to-group`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participants: userIdsToAdd,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || 'Failed to add users to group',
        );
      }

      await refreshChat();
      handleCloseUserSearch();
    } catch (err) {
      setAddUsersError(err.message || 'Something went wrong');
    } finally {
      setIsAddingUsers(false);
    }
  }

  async function handleLeaveChat() {}

  if (loadingChat) {
    return (
      <main className={styles.main}>
        <p>LOADING CHAT...</p>
      </main>
    );
  }

  if (chatError) {
    return (
      <main className={styles.main}>
        <p>{chatError}</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={`${styles.mainHeader} contains-icon`}>
        {chat?.type === 'GROUP' && (
          <div className={styles.addUserWrapper}>
            <FaUserPlus
              className={styles.addUser}
              onClick={handleShowUserSearch}
            />

            {showSearchUser && (
              <div
                className={styles.userSearchOverlay}
                onClick={handleCloseUserSearch}
              >
                <div
                  className={styles.userSearchModal}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.userSearchHeader}>
                    <h3 className={styles.userSearchTitle}>
                      Add Users to Group
                    </h3>
                    <FaRegWindowClose
                      className={styles.userSearchClose}
                      onClick={handleCloseUserSearch}
                    />
                  </div>

                  <form
                    className={styles.userSearchForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddUserToGroup();
                    }}
                  >
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

                    {loadingSearchUser && (
                      <p className={styles.searchStatus}>Searching...</p>
                    )}

                    {searchErrors && (
                      <p className={styles.searchError}>{searchErrors}</p>
                    )}

                    {addUsersError && (
                      <p className={styles.searchError}>{addUsersError}</p>
                    )}

                    {selectedUsers.length > 0 && (
                      <div className={styles.selectedSection}>
                        <h4 className={styles.selectedTitle}>Selected Users</h4>

                        <div className={styles.selectedUsers}>
                          {selectedUsers.map((selectedUser) => (
                            <button
                              key={selectedUser.id}
                              type="button"
                              className={styles.selectedChip}
                              onClick={() => toggleSelectedUser(selectedUser)}
                            >
                              {selectedUser.displayName} ✕
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.results}>
                      {searchResults.length === 0 &&
                      searchTerm.trim() &&
                      !loadingSearchUser ? (
                        <p className={styles.searchStatus}>No users found.</p>
                      ) : (
                        searchResults.map((searchUser) => {
                          const isSelected = selectedUsers.some(
                            (selectedUser) => selectedUser.id === searchUser.id,
                          );
                          const isExisting = existingUserIds.includes(
                            searchUser.id,
                          );

                          return (
                            <button
                              key={searchUser.id}
                              type="button"
                              className={`${styles.userButton} ${
                                isSelected ? styles.userButtonSelected : ''
                              } ${isExisting ? styles.userButtonDisabled : ''}`}
                              onClick={() => {
                                if (isExisting) return;
                                toggleSelectedUser(searchUser);
                              }}
                              disabled={isExisting}
                            >
                              <div className={styles.userRow}>
                                <img
                                  className={styles.userAvatar}
                                  src="https://hwchamber.co.uk/wp-content/uploads/2022/04/avatar-placeholder.gif"
                                  alt={`${searchUser.displayName}'s avatar`}
                                />

                                <div className={styles.userMeta}>
                                  <span className={styles.displayName}>
                                    {searchUser.displayName}
                                  </span>
                                  <span className={styles.username}>
                                    @{searchUser.username}
                                  </span>
                                </div>

                                <span className={styles.userStatus}>
                                  {isExisting
                                    ? 'In group'
                                    : isSelected
                                      ? '✓'
                                      : ''}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className={styles.userSearchActions}>
                      <button
                        type="button"
                        className={styles.userSearchCancel}
                        onClick={handleCloseUserSearch}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className={styles.userSearchSubmit}
                        disabled={selectedUsers.length === 0 || isAddingUsers}
                      >
                        {isAddingUsers ? 'Adding...' : 'Add Selected Users'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        <h2 className={styles.chatTitle}>{chatDisplayTitle}</h2>

        <div ref={settingsRef} className={styles.settingsWrapper}>
          <FaGear
            className={styles.settingsIcon}
            onClick={handleSettingsClick}
          />

          {showSettings && (
            <div className={styles.settingsDropdown}>
              <div
                className={`${styles.dropdownItem} contains-icon`}
                onClick={handleRenameChat}
              >
                <FaEdit />
                Rename Chat
              </div>

              {chat?.type === 'GROUP' && (
                <div
                  className={`${styles.dropdownItem} contains-icon`}
                  onClick={handleLeaveChat}
                >
                  <FaArrowRightFromBracket />
                  Leave
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showTitleForm && (
        <div className={styles.titleFormOverlay}>
          <form className={styles.titleForm} onSubmit={handleTitleFormSubmit}>
            <FaRegWindowClose
              className={styles.titleFormClose}
              onClick={handleCloseTitleForm}
            />

            <label>
              New Chat Name
              <input
                type="text"
                name="title"
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>

            <button type="submit" disabled={newTitleLoading}>
              {newTitleLoading ? 'Updating...' : 'Update'}
            </button>

            {newTitleError && <p>{newTitleError}</p>}
          </form>
        </div>
      )}

      <div className={styles.chatContainer}>
        <div className={styles.chat} ref={chatRef}>
          <div className={styles.messagesInner}>
            {loadingMessages ? (
              <p>LOADING MESSAGES...</p>
            ) : messageError ? (
              <p>{messageError}</p>
            ) : messages.length === 0 ? (
              <p>No messages yet.</p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender.id === user.id;

                return (
                  <div
                    key={msg.id}
                    className={`${styles.messageRow} ${
                      isOwn ? styles.ownMessage : styles.otherMessage
                    }`}
                  >
                    {!isOwn && (
                      <img
                        className={styles.messageAvatar}
                        src="https://hwchamber.co.uk/wp-content/uploads/2022/04/avatar-placeholder.gif"
                        alt={`${msg.sender.displayName}'s avatar`}
                      />
                    )}

                    <div className={styles.messageBubble}>
                      <p className={styles.messageContent}>{msg.content}</p>

                      <div className={styles.messageMeta}>
                        <span className={styles.senderName}>
                          {msg.sender.displayName}
                        </span>
                        <span className={styles.messageTime}>
                          {formatDate(msg.sentAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <form
          className={styles.msgForm}
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className={styles.inputBar}>
            <button className={styles.attachmentBtn} type="button">
              <FaPlus />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              className={styles.textarea}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);

                const el = textareaRef.current;
                if (!el) return;

                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
              }}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <button
              className={styles.sendBtn}
              type="submit"
              disabled={sendingMessage}
            >
              {sendingMessage ? <FaHourglassEnd /> : <FaCircleArrowUp />}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
