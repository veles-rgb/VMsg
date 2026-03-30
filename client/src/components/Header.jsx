import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styles from './styles/Header.module.css';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getSocket } from '../socket';

import {
  FaComments,
  FaSignOutAlt,
  FaPlus,
  FaEllipsisH,
  FaRegWindowClose,
  FaPen,
  FaSignOutAlt as FaLeave,
  FaEyeSlash,
} from 'react-icons/fa';

const DEFAULT_AVATAR =
  'https://simplyilm.com/wp-content/uploads/2017/08/temporary-profile-placeholder-1.jpg';

function getAvatarSrc(profilePictureUrl) {
  return profilePictureUrl || DEFAULT_AVATAR;
}

const CHAT_TITLE_MAX_LENGTH = 100;

function getLastActivityValue(chat) {
  return (
    chat.lastMessageAt ||
    chat.latestMessage?.sentAt ||
    chat.updatedAt ||
    chat.createdAt ||
    0
  );
}

export default function Header() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const createMenuRef = useRef(null);
  const floatingMenuRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [chatError, setChatError] = useState('');

  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const [openChatMenu, setOpenChatMenu] = useState(null);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState('');

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchChats = useCallback(async () => {
    if (!token) return;

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
  }, [apiUrl, token]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setShowCreateMenu(false);
      }

      if (
        floatingMenuRef.current &&
        !floatingMenuRef.current.contains(e.target)
      ) {
        const clickedMenuButton = e.target.closest(
          '[data-chat-menu-button="true"]',
        );
        if (!clickedMenuButton) {
          setOpenChatMenu(null);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!user || !token) return;
    fetchChats();
  }, [user, token, fetchChats]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user || !token) return;

    function handleSidebarRefresh() {
      fetchChats();
    }

    socket.on('sidebar:refresh', handleSidebarRefresh);

    return () => {
      socket.off('sidebar:refresh', handleSidebarRefresh);
    };
  }, [fetchChats, user, token]);

  useEffect(() => {
    function handleWindowChange() {
      setOpenChatMenu(null);
    }

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, []);

  function getChatName(chat) {
    if (chat.type === 'GROUP') {
      return chat.title || 'Group Chat';
    }

    const other = chat.otherParticipants?.[0]?.user;
    return other?.displayName || 'Chat';
  }

  function getChatSubtitle(chat) {
    if (chat.type === 'GROUP') {
      return chat.title ? 'Group chat' : 'Unnamed group';
    }

    const other = chat.otherParticipants?.[0]?.user;
    return other?.username ? `@${other.username}` : 'Direct message';
  }

  function handleUserCardClick() {
    navigate('/me');
  }

  function handleCreateMenuClick() {
    setShowCreateMenu((prev) => !prev);
    setOpenChatMenu(null);
  }

  function handleStartChat() {
    setShowCreateMenu(false);
    navigate('/chat/new/dm');
  }

  function handleCreateGroup() {
    setShowCreateMenu(false);
    navigate('/chat/new/group');
  }

  function handleChatClick(chatId) {
    navigate(`/chat/${chatId}`);
  }

  function handleChatMenuToggle(e, chat) {
    e.stopPropagation();
    setShowCreateMenu(false);

    const rect = e.currentTarget.getBoundingClientRect();

    setOpenChatMenu((prev) => {
      if (prev?.chatId === chat.id) {
        return null;
      }

      return {
        chatId: chat.id,
        chat,
        top: rect.top,
        left: rect.right + 8,
      };
    });
  }

  function handleOpenRename(chat) {
    setSelectedChat(chat);
    setNewTitle(chat.title || '');
    setRenameError('');
    setShowRenameModal(true);
    setOpenChatMenu(null);
  }

  function handleCloseRename() {
    setShowRenameModal(false);
    setSelectedChat(null);
    setNewTitle('');
    setRenameError('');
    setRenameLoading(false);
  }

  async function handleRenameSubmit(e) {
    e.preventDefault();

    const trimmedNewTitle = newTitle.trim();

    if (!selectedChat?.id || renameLoading) return;

    if (!trimmedNewTitle) {
      setRenameError('Chat title is required');
      return;
    }

    if (trimmedNewTitle.length > CHAT_TITLE_MAX_LENGTH) {
      setRenameError(
        `Chat title must be ${CHAT_TITLE_MAX_LENGTH} characters or less`,
      );
      return;
    }

    try {
      setRenameLoading(true);
      setRenameError('');

      const res = await fetch(`${apiUrl}/chat/${selectedChat.id}/rename`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newTitle: trimmedNewTitle,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || 'Failed to rename chat',
        );
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                title: trimmedNewTitle,
              }
            : chat,
        ),
      );

      handleCloseRename();
    } catch (err) {
      setRenameError(err.message || 'Something went wrong');
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleLeaveGroup(chat) {
    if (!chat?.id || chat.type !== 'GROUP') return;

    const confirmed = window.confirm(
      'Are you sure you want to leave this group chat?',
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(chat.id);

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

      setChats((prev) => prev.filter((item) => item.id !== chat.id));
      setOpenChatMenu(null);

      if (location.pathname === `/chat/${chat.id}`) {
        navigate('/');
      }
    } catch (err) {
      setChatError(err.message || 'Something went wrong');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleHideChat(chat) {
    if (!chat?.id) return;

    try {
      setActionLoadingId(chat.id);

      const res = await fetch(`${apiUrl}/chat/${chat.id}/hide`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to hide chat');
      }

      setChats((prev) => prev.filter((item) => item.id !== chat.id));
      setOpenChatMenu(null);

      if (location.pathname === `/chat/${chat.id}`) {
        navigate('/');
      }
    } catch (err) {
      setChatError(err.message || 'Something went wrong');
    } finally {
      setActionLoadingId(null);
    }
  }

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const aTime = new Date(getLastActivityValue(a)).getTime();
      const bTime = new Date(getLastActivityValue(b)).getTime();
      return bTime - aTime;
    });
  }, [chats]);

  return (
    <>
      <header className={styles.sidebar}>
        {user ? (
          <>
            <div className={styles.topSection}>
              <Link to="/" className={styles.logoLink}>
                <h1 className={styles.title}>VMsg</h1>
              </Link>

              <div ref={createMenuRef} className={styles.sectionHeader}>
                <h2
                  className={styles.sectionTitle}
                  onClick={() => navigate('/chats')}
                >
                  Chats
                </h2>

                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={handleCreateMenuClick}
                >
                  <FaPlus />
                </button>

                {showCreateMenu && (
                  <div className={styles.dropdownMenu}>
                    <button
                      className={styles.dropdownItem}
                      type="button"
                      onClick={handleStartChat}
                    >
                      Start Chat
                    </button>

                    <button
                      className={styles.dropdownItem}
                      type="button"
                      onClick={handleCreateGroup}
                    >
                      Create Group
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.chatsContainer}>
                {loadingChats ? (
                  <p className={styles.chatStatus}>Loading...</p>
                ) : chatError ? (
                  <p className={styles.chatStatus}>{chatError}</p>
                ) : sortedChats.length === 0 ? (
                  <p className={styles.chatStatus}>No chats yet</p>
                ) : (
                  sortedChats.map((chat) => {
                    const isActive = location.pathname === `/chat/${chat.id}`;
                    const isBusy = actionLoadingId === chat.id;
                    const unreadCount = Number(chat.unreadCount || 0);

                    return (
                      <div
                        key={chat.id}
                        className={`${styles.chatItemWrap} ${
                          isActive ? styles.activeChatItemWrap : ''
                        }`}
                      >
                        <button
                          className={`${styles.chatItem} ${
                            isActive ? styles.activeChatItem : ''
                          }`}
                          onClick={() => handleChatClick(chat.id)}
                          type="button"
                        >
                          <div className={styles.chatIcon}>
                            <FaComments />
                          </div>

                          <div className={styles.chatText}>
                            <span className={styles.chatName}>
                              {getChatName(chat)}
                            </span>
                            <span className={styles.chatSubtitle}>
                              {getChatSubtitle(chat)}
                            </span>
                          </div>

                          {unreadCount > 0 && (
                            <span className={styles.unreadBadge}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </button>

                        <div className={styles.chatActions}>
                          <button
                            className={styles.chatMenuButton}
                            type="button"
                            onClick={(e) => handleChatMenuToggle(e, chat)}
                            disabled={isBusy}
                            data-chat-menu-button="true"
                          >
                            <FaEllipsisH />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className={styles.userCard} onClick={handleUserCardClick}>
              <img
                className={styles.userAvatar}
                src={getAvatarSrc(user?.profilePictureUrl)}
                alt={`${user?.displayName || 'User'}'s avatar`}
              />

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
              <Link to="/" className={styles.logoLink}>
                <h1 className={styles.title}>VMsg</h1>
              </Link>
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

      {openChatMenu && (
        <div
          ref={floatingMenuRef}
          className={styles.floatingChatDropdown}
          style={{
            top: `${openChatMenu.top}px`,
            left: `${openChatMenu.left}px`,
          }}
        >
          <button
            className={styles.dropdownItem}
            type="button"
            onClick={() => handleOpenRename(openChatMenu.chat)}
          >
            <FaPen />
            Change chat name
          </button>

          {openChatMenu.chat.type === 'GROUP' && (
            <button
              className={styles.dropdownItem}
              type="button"
              onClick={() => handleLeaveGroup(openChatMenu.chat)}
            >
              <FaLeave />
              Leave chat
            </button>
          )}

          <button
            className={styles.dropdownItem}
            type="button"
            onClick={() => handleHideChat(openChatMenu.chat)}
          >
            <FaEyeSlash />
            Hide chat
          </button>
        </div>
      )}

      {showRenameModal && (
        <div className={styles.modalOverlay} onClick={handleCloseRename}>
          <form
            className={styles.renameModal}
            onSubmit={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalClose}
              type="button"
              onClick={handleCloseRename}
            >
              <FaRegWindowClose />
            </button>

            <h3 className={styles.modalTitle}>Change Chat Name</h3>

            <label className={styles.modalLabel}>
              New chat name
              <input
                className={styles.modalInput}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={CHAT_TITLE_MAX_LENGTH}
                placeholder="Enter a new chat name"
              />
            </label>

            {renameError && <p className={styles.modalError}>{renameError}</p>}

            <button
              className={styles.primaryButton}
              type="submit"
              disabled={renameLoading}
            >
              {renameLoading ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
