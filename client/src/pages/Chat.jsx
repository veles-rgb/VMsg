import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDate } from '../utils/formatDate';
import styles from './styles/Chat.module.css';
import { getSocket } from '../socket';

import {
  FaGear,
  FaPlus,
  FaCircleArrowUp,
  FaHourglassEnd,
  FaArrowRightFromBracket,
  FaUserPlus,
} from 'react-icons/fa6';

import { FaEdit, FaRegWindowClose, FaUsers } from 'react-icons/fa';

const DEFAULT_AVATAR =
  'https://simplyilm.com/wp-content/uploads/2017/08/temporary-profile-placeholder-1.jpg';

function getAvatarSrc(profilePictureUrl) {
  return profilePictureUrl || DEFAULT_AVATAR;
}

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) return '';
  const value = Number(bytes);

  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const textareaRef = useRef(null);
  const chatRef = useRef(null);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);

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
  const [showUsersModal, setShowUsersModal] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);

  const [mentionMode, setMentionMode] = useState(false);
  const [filteredMentions, setFilteredMentions] = useState([]);

  const existingUserIds = useMemo(
    () => chat?.participants?.map((p) => p.userId) || [],
    [chat],
  );

  const groupParticipants = useMemo(() => chat?.participants || [], [chat]);

  const mentionableParticipants = useMemo(
    () => chat?.participants?.filter((participant) => participant.user) || [],
    [chat],
  );

  const mentionLookup = useMemo(() => {
    const map = new Map();

    mentionableParticipants.forEach((participant) => {
      const username = participant.user?.username?.toLowerCase();
      if (username) {
        map.set(username, participant.user);
      }
    });

    return map;
  }, [mentionableParticipants]);

  const chatDisplayTitle =
    chat?.type === 'GROUP'
      ? chat?.title || 'Group Chat'
      : chat?.title || otherParticipants[0]?.user?.displayName || 'Chat';

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
    return () => {
      if (attachmentPreviewUrl) {
        URL.revokeObjectURL(attachmentPreviewUrl);
      }
    };
  }, [attachmentPreviewUrl]);

  const refreshChat = useCallback(async () => {
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
  }, [apiUrl, chatId, token]);

  const fetchMessages = useCallback(async () => {
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
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      setMessageError(err.message || 'Something went wrong');
    } finally {
      setLoadingMessages(false);
    }
  }, [apiUrl, chatId, token]);

  useEffect(() => {
    async function loadChat() {
      try {
        setLoadingChat(true);
        setChatError('');
        await refreshChat();
      } catch (err) {
        setChatError(err.message || 'Something went wrong');
      } finally {
        setLoadingChat(false);
      }
    }

    if (!token) return;
    loadChat();
  }, [token, refreshChat]);

  useEffect(() => {
    if (!token) return;
    fetchMessages();
  }, [token, fetchMessages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    socket.emit('chat:join', chatId);

    return () => {
      socket.emit('chat:leave', chatId);
    };
  }, [chatId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    function handleIncomingMessage(payload) {
      if (payload.chatId !== chatId || !payload.message) return;

      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === payload.message.id);
        if (exists) return prev;
        return [...prev, payload.message];
      });
    }

    function handleSidebarRefresh(payload) {
      if (!payload?.chatId || payload.chatId !== chatId) return;

      refreshChat().catch(() => {});
    }

    socket.on('chat:message_created', handleIncomingMessage);
    socket.on('sidebar:refresh', handleSidebarRefresh);

    return () => {
      socket.off('chat:message_created', handleIncomingMessage);
      socket.off('sidebar:refresh', handleSidebarRefresh);
    };
  }, [chatId, refreshChat]);

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

  function resetAttachmentState() {
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }

    setSelectedAttachment(null);
    setAttachmentPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleTextareaResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }

  function handleMentionLogic(value, cursorPos) {
    const textBeforeCursor = value.slice(0, cursorPos);
    const currentWord = textBeforeCursor.split(/\s/).pop() || '';

    if (!currentWord.startsWith('@')) {
      setMentionMode(false);
      setFilteredMentions([]);
      return;
    }

    const query = currentWord.slice(1).toLowerCase();

    const results = mentionableParticipants.filter((participant) => {
      const username = participant.user?.username?.toLowerCase() || '';
      const displayName = participant.user?.displayName?.toLowerCase() || '';

      return username.includes(query) || displayName.includes(query);
    });

    setMentionMode(results.length > 0);
    setFilteredMentions(results);
  }

  function handleMentionClick(mention) {
    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const textAfterCursor = message.slice(cursorPos);
    const currentWord = textBeforeCursor.split(/\s/).pop() || '';
    const wordStartIndex = cursorPos - currentWord.length;
    const mentionText = `@${mention.user.username} `;

    const newMessage =
      message.slice(0, wordStartIndex) + mentionText + textAfterCursor;

    setMessage(newMessage);
    setMentionMode(false);
    setFilteredMentions([]);

    requestAnimationFrame(() => {
      const newCursorPos = wordStartIndex + mentionText.length;
      el.focus();
      el.setSelectionRange(newCursorPos, newCursorPos);
      handleTextareaResize(el);
    });
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

  function handleOpenUsersModal() {
    setShowUsersModal(true);
    setShowSettings(false);
  }

  function handleCloseUsersModal() {
    setShowUsersModal(false);
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

  function handleAttachmentButtonClick() {
    fileInputRef.current?.click();
  }

  function handleAttachmentChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessageError('');
    setSelectedAttachment(file);

    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }

    if (file.type.startsWith('image/')) {
      setAttachmentPreviewUrl(URL.createObjectURL(file));
      return;
    }

    setAttachmentPreviewUrl(null);
  }

  async function uploadAttachmentIfNeeded() {
    if (!selectedAttachment) return null;

    const formData = new FormData();
    formData.append('file', selectedAttachment);
    formData.append('folderKey', 'chatAttachments');

    const uploadRes = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json().catch(() => null);

    if (!uploadRes.ok) {
      throw new Error(
        uploadData?.error || uploadData?.message || 'Failed to upload file',
      );
    }

    return uploadData?.data || null;
  }

  async function handleSend() {
    if ((!message.trim() && !selectedAttachment) || sendingMessage) return;

    try {
      setSendingMessage(true);
      setMessageError('');

      const uploadedAttachment = await uploadAttachmentIfNeeded();

      const res = await fetch(`${apiUrl}/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.trim(),
          attachmentUrl: uploadedAttachment?.url || null,
          attachmentPublicId: uploadedAttachment?.publicId || null,
          attachmentType: uploadedAttachment?.resourceType || null,
          attachmentName: uploadedAttachment?.originalName || null,
          attachmentBytes: uploadedAttachment?.bytes || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === data.message?.id);
        if (exists) return prev;
        return [...prev, data.message];
      });

      setMessage('');
      setMentionMode(false);
      setFilteredMentions([]);
      resetAttachmentState();

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

  async function handleLeaveChat() {
    if (!chat?.id || chat.type !== 'GROUP') return;

    const confirmed = window.confirm(
      'Are you sure you want to leave this group chat?',
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`${apiUrl}/chat/${chat.id}/leave`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || 'Failed to leave group',
        );
      }

      navigate('/');
    } catch (err) {
      alert(err.message || 'Something went wrong');
    }
  }

  function renderAttachment(msg) {
    if (!msg.attachmentUrl) return null;

    if (msg.attachmentType === 'image') {
      return (
        <img
          src={msg.attachmentUrl}
          alt={msg.attachmentName || 'attachment'}
          className={styles.messageImage}
        />
      );
    }

    if (msg.attachmentType === 'video') {
      return (
        <video controls className={styles.messageVideo}>
          <source src={msg.attachmentUrl} />
        </video>
      );
    }

    return (
      <a
        href={msg.attachmentUrl}
        target="_blank"
        rel="noreferrer"
        className={styles.messageFile}
      >
        <span className={styles.messageFileName}>
          {msg.attachmentName || 'Open attachment'}
        </span>
        {msg.attachmentBytes ? (
          <span className={styles.messageFileSize}>
            {formatBytes(msg.attachmentBytes)}
          </span>
        ) : null}
      </a>
    );
  }

  function renderMessageContent(content) {
    if (!content) return null;

    const parts = content.split(/(@[a-zA-Z0-9_]+)/g);

    return parts.map((part, index) => {
      const match = part.match(/^@([a-zA-Z0-9_]+)$/);

      if (!match) {
        return <span key={index}>{part}</span>;
      }

      const username = match[1].toLowerCase();
      const mentionedUser = mentionLookup.get(username);

      if (!mentionedUser) {
        return <span key={index}>{part}</span>;
      }

      const isCurrentUser = username === user.username?.toLowerCase();

      return (
        <span
          key={index}
          className={`${styles.mentionText} ${
            isCurrentUser ? styles.mentionTextSelf : ''
          }`}
        >
          {part}
        </span>
      );
    });
  }

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
      <div className={styles.mainHeader}>
        {chat?.type === 'GROUP' ? (
          <div className={styles.headerLeft}>
            <FaUserPlus
              className={styles.headerIcon}
              onClick={handleShowUserSearch}
            />
          </div>
        ) : (
          <div className={styles.headerLeft} />
        )}

        <h2 className={styles.chatTitle}>{chatDisplayTitle}</h2>

        <div className={styles.topBarRight}>
          {chat?.type === 'GROUP' && (
            <FaUsers
              className={styles.headerIcon}
              onClick={handleOpenUsersModal}
            />
          )}

          <div ref={settingsRef} className={styles.settingsWrapper}>
            <FaGear
              className={styles.headerIcon}
              onClick={handleSettingsClick}
            />

            {showSettings && (
              <div className={styles.settingsDropdown}>
                <div className={styles.dropdownItem} onClick={handleRenameChat}>
                  <FaEdit />
                  Rename Chat
                </div>

                {chat?.type === 'GROUP' && (
                  <div
                    className={styles.dropdownItem}
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
      </div>

      {showSearchUser && (
        <div className={styles.modalOverlay} onClick={handleCloseUserSearch}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Users to Group</h3>
              <FaRegWindowClose
                className={styles.modalClose}
                onClick={handleCloseUserSearch}
              />
            </div>

            <form
              className={styles.modalForm}
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
                    const isExisting = existingUserIds.includes(searchUser.id);

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
                            src={getAvatarSrc(searchUser.profilePictureUrl)}
                            alt={`${searchUser.displayName}'s avatar`}
                          />

                          <div className={styles.userMeta}>
                            <span className={styles.memberDisplayName}>
                              {searchUser.displayName}
                            </span>
                            <span className={styles.memberUsername}>
                              @{searchUser.username}
                            </span>
                          </div>

                          <span className={styles.userStatus}>
                            {isExisting ? 'In group' : isSelected ? '✓' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleCloseUserSearch}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={selectedUsers.length === 0 || isAddingUsers}
                >
                  {isAddingUsers ? 'Adding...' : 'Add Selected Users'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUsersModal && (
        <div className={styles.modalOverlay} onClick={handleCloseUsersModal}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Group Members</h3>
              <FaRegWindowClose
                className={styles.modalClose}
                onClick={handleCloseUsersModal}
              />
            </div>

            <div className={styles.results}>
              {groupParticipants.length === 0 ? (
                <p className={styles.searchStatus}>No users found.</p>
              ) : (
                groupParticipants.map((participant) => {
                  const participantUser = participant.user;
                  const isMe = participant.userId === user.id;

                  if (!participantUser) return null;

                  return (
                    <div
                      key={participant.userId}
                      className={styles.userButtonStatic}
                    >
                      <div className={styles.userRow}>
                        <img
                          className={styles.userAvatar}
                          src={getAvatarSrc(participantUser.profilePictureUrl)}
                          alt={`${participantUser.displayName}'s avatar`}
                        />

                        <div className={styles.userMeta}>
                          <span className={styles.memberDisplayName}>
                            {participantUser.displayName}
                          </span>
                          <span className={styles.memberUsername}>
                            @{participantUser.username}
                          </span>
                        </div>

                        <span className={styles.userStatus}>
                          {isMe ? 'Me' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showTitleForm && (
        <div className={styles.modalOverlay} onClick={handleCloseTitleForm}>
          <form
            className={styles.titleForm}
            onSubmit={handleTitleFormSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <FaRegWindowClose
              className={styles.modalClose}
              onClick={handleCloseTitleForm}
            />

            <label className={styles.label}>
              New Chat Name
              <input
                className={styles.input}
                type="text"
                name="title"
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>

            <button
              className={styles.primaryBtn}
              type="submit"
              disabled={newTitleLoading}
            >
              {newTitleLoading ? 'Updating...' : 'Update'}
            </button>

            {newTitleError && (
              <p className={styles.searchError}>{newTitleError}</p>
            )}
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
                        src={getAvatarSrc(msg.sender.profilePictureUrl)}
                        alt={`${msg.sender.displayName}'s avatar`}
                      />
                    )}

                    <div className={styles.messageBubble}>
                      {renderAttachment(msg)}

                      {msg.content ? (
                        <p className={styles.messageContent}>
                          {renderMessageContent(msg.content)}
                        </p>
                      ) : null}

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
          {selectedAttachment && (
            <div className={styles.attachmentPreviewBar}>
              <div className={styles.attachmentPreviewMeta}>
                {attachmentPreviewUrl ? (
                  <img
                    src={attachmentPreviewUrl}
                    alt="attachment preview"
                    className={styles.attachmentPreviewImage}
                  />
                ) : (
                  <div className={styles.attachmentPreviewFileIcon}>FILE</div>
                )}

                <div className={styles.attachmentPreviewText}>
                  <span className={styles.attachmentPreviewName}>
                    {selectedAttachment.name}
                  </span>
                  <span className={styles.attachmentPreviewSize}>
                    {formatBytes(selectedAttachment.size)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={styles.removeAttachmentBtn}
                onClick={resetAttachmentState}
              >
                Remove
              </button>
            </div>
          )}

          {mentionMode && (
            <div className={styles.mentionBox}>
              {filteredMentions.map((mention) => (
                <div
                  key={mention.user.id}
                  className={styles.mentionItem}
                  onClick={() => handleMentionClick(mention)}
                >
                  <img
                    className={styles.messageAvatar}
                    src={getAvatarSrc(mention.user.profilePictureUrl)}
                    alt=""
                  />
                  <div className={styles.userInfo}>
                    <div className={styles.mentionDisplayName}>
                      {mention.user.displayName}
                    </div>
                    <div className={styles.mentionUsername}>
                      @{mention.user.username}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.inputBar}>
            <input
              ref={fileInputRef}
              type="file"
              className={styles.hiddenFileInput}
              onChange={handleAttachmentChange}
            />

            <button
              className={styles.attachmentBtn}
              type="button"
              onClick={handleAttachmentButtonClick}
            >
              <FaPlus />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              className={styles.textarea}
              value={message}
              onChange={(e) => {
                const nextValue = e.target.value;
                setMessage(nextValue);
                handleTextareaResize(e.target);
                handleMentionLogic(nextValue, e.target.selectionStart);
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
