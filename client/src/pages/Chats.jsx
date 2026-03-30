import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getSocket } from '../socket';
import { formatDate } from '../utils/formatDate';
import styles from './styles/Chats.module.css';

import {
  FaComments,
  FaEllipsis,
  FaArrowRightFromBracket,
  FaEyeSlash,
} from 'react-icons/fa6';
import { FaEdit, FaRegWindowClose, FaUsers } from 'react-icons/fa';

const DEFAULT_AVATAR =
  'https://simplyilm.com/wp-content/uploads/2017/08/temporary-profile-placeholder-1.jpg';

function getAvatarSrc(profilePictureUrl) {
  return profilePictureUrl || DEFAULT_AVATAR;
}

function getChatTitle(chat) {
  if (chat.type === 'GROUP') {
    return chat.title || 'Group Chat';
  }

  return chat.otherParticipants?.[0]?.user?.displayName || 'Direct Message';
}

function getChatAvatar(chat) {
  if (chat.type === 'GROUP') return null;
  return chat.otherParticipants?.[0]?.user?.profilePictureUrl || null;
}

function getPreviewText(lastMessage, currentUserId) {
  if (!lastMessage) return 'No messages yet.';

  if (lastMessage.type === 'SYSTEM') {
    return lastMessage.content || 'System message';
  }

  if (lastMessage.attachmentType === 'image') {
    return `${lastMessage.sender?.id === currentUserId ? 'You' : lastMessage.sender?.displayName || 'Someone'} sent an image`;
  }

  if (lastMessage.attachmentType === 'video') {
    return `${lastMessage.sender?.id === currentUserId ? 'You' : lastMessage.sender?.displayName || 'Someone'} sent a video`;
  }

  if (lastMessage.attachmentName) {
    return `${lastMessage.sender?.id === currentUserId ? 'You' : lastMessage.sender?.displayName || 'Someone'} sent ${lastMessage.attachmentName}`;
  }

  if (lastMessage.content?.trim()) {
    const prefix =
      lastMessage.sender?.id === currentUserId
        ? 'You: '
        : lastMessage.sender?.displayName
          ? `${lastMessage.sender.displayName}: `
          : '';

    return `${prefix}${lastMessage.content}`;
  }

  return 'New message';
}

export default function Chats() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatsError, setChatsError] = useState('');

  const [openMenuChatId, setOpenMenuChatId] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState('');

  const menuRef = useRef(null);

  const fetchChats = useCallback(async () => {
    try {
      setChatsError('');

      const res = await fetch(`${apiUrl}/chat`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setChats(data?.chats || []);
    } catch (err) {
      setChatsError(err.message || 'Something went wrong');
    } finally {
      setLoadingChats(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    if (!token) return;
    setLoadingChats(true);
    fetchChats();
  }, [fetchChats, token]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuChatId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handleSidebarRefresh() {
      fetchChats();
    }

    function handleIncomingMessage() {
      fetchChats();
    }

    socket.on('sidebar:refresh', handleSidebarRefresh);
    socket.on('chat:message_created', handleIncomingMessage);

    return () => {
      socket.off('sidebar:refresh', handleSidebarRefresh);
      socket.off('chat:message_created', handleIncomingMessage);
    };
  }, [fetchChats]);

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [chats]);

  function handleOpenChat(chatId) {
    navigate(`/chat/${chatId}`);
  }

  function handleOpenRename(chat) {
    setSelectedChat(chat);
    setNewTitle(chat.title || '');
    setRenameError('');
    setShowRenameModal(true);
    setOpenMenuChatId(null);
  }

  function handleCloseRename() {
    setShowRenameModal(false);
    setSelectedChat(null);
    setNewTitle('');
    setRenameError('');
  }

  async function handleRenameSubmit(e) {
    e.preventDefault();

    if (!selectedChat?.id || !newTitle.trim() || renameLoading) return;

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
          newTitle: newTitle.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                title: newTitle.trim(),
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

  async function handleHideChat(chatId) {
    try {
      const res = await fetch(`${apiUrl}/chat/${chatId}/hide`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      setOpenMenuChatId(null);
    } catch (err) {
      setChatsError(err.message || 'Something went wrong');
    }
  }

  async function handleLeaveChat(chatId) {
    try {
      const res = await fetch(`${apiUrl}/chat/${chatId}/leave`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      setOpenMenuChatId(null);
    } catch (err) {
      setChatsError(err.message || 'Something went wrong');
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.mainHeader}>
        <div className={styles.headerInner}>
          <div className={styles.headerBadge}>Chats</div>
          <h1 className={styles.headerTitle}>All chats</h1>
          <p className={styles.headerSubtitle}>
            Browse every active chat, jump back in instantly, and manage each
            one from here.
          </p>
        </div>
      </div>

      <div className={styles.pageContent}>
        {chatsError && <div className={styles.feedbackError}>{chatsError}</div>}

        {loadingChats ? (
          <section className={styles.stateCard}>
            <h2 className={styles.stateTitle}>Loading chats...</h2>
            <p className={styles.stateText}>
              Pulling your latest conversations now.
            </p>
          </section>
        ) : sortedChats.length === 0 ? (
          <section className={styles.stateCard}>
            <h2 className={styles.stateTitle}>No chats yet</h2>
            <p className={styles.stateText}>
              Start a DM or create a group to see your chats here.
            </p>
          </section>
        ) : (
          <section className={styles.chatList}>
            {sortedChats.map((chat) => {
              const preview = getPreviewText(chat.lastMessage, user?.id);
              const title = getChatTitle(chat);
              const avatarSrc = getChatAvatar(chat);

              return (
                <div key={chat.id} className={styles.chatCard}>
                  <button
                    type="button"
                    className={styles.chatButton}
                    onClick={() => handleOpenChat(chat.id)}
                  >
                    <div className={styles.chatAvatarWrap}>
                      {chat.type === 'GROUP' ? (
                        <div className={styles.groupAvatar}>
                          <FaUsers />
                        </div>
                      ) : (
                        <img
                          className={styles.chatAvatar}
                          src={getAvatarSrc(avatarSrc)}
                          alt=""
                        />
                      )}
                    </div>

                    <div className={styles.chatInfo}>
                      <div className={styles.chatTopRow}>
                        <h3 className={styles.chatTitle}>{title}</h3>
                        <span className={styles.chatTime}>
                          {chat.lastMessage?.sentAt
                            ? formatDate(chat.lastMessage.sentAt)
                            : ''}
                        </span>
                      </div>

                      <div className={styles.chatBottomRow}>
                        <p className={styles.chatPreview}>{preview}</p>

                        {chat.unreadCount > 0 && (
                          <span className={styles.unreadBadge}>
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div
                    className={styles.menuWrap}
                    ref={openMenuChatId === chat.id ? menuRef : null}
                  >
                    <button
                      type="button"
                      className={styles.menuButton}
                      onClick={() =>
                        setOpenMenuChatId((prev) =>
                          prev === chat.id ? null : chat.id,
                        )
                      }
                    >
                      <FaEllipsis />
                    </button>

                    {openMenuChatId === chat.id && (
                      <div className={styles.dropdownMenu}>
                        {chat.type === 'GROUP' && (
                          <button
                            type="button"
                            className={styles.dropdownItem}
                            onClick={() => handleOpenRename(chat)}
                          >
                            <FaEdit />
                            Rename
                          </button>
                        )}

                        <button
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => handleHideChat(chat.id)}
                        >
                          <FaEyeSlash />
                          Hide
                        </button>

                        {chat.type === 'GROUP' && (
                          <button
                            type="button"
                            className={styles.dropdownItem}
                            onClick={() => handleLeaveChat(chat.id)}
                          >
                            <FaArrowRightFromBracket />
                            Leave
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {showRenameModal && (
        <div className={styles.modalOverlay} onClick={handleCloseRename}>
          <form
            className={styles.renameModal}
            onSubmit={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={handleCloseRename}
            >
              <FaRegWindowClose />
            </button>

            <h2 className={styles.modalTitle}>Rename Chat</h2>

            <label className={styles.modalLabel}>
              New name
              <input
                className={styles.modalInput}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </label>

            {renameError && <p className={styles.modalError}>{renameError}</p>}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={renameLoading}
            >
              {renameLoading ? 'Updating...' : 'Update'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
