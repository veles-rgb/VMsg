import { useEffect, useState, useRef } from 'react';
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
} from 'react-icons/fa6';

import { FaEdit, FaRegWindowClose } from 'react-icons/fa';

export default function Chat() {
  const { chatId } = useParams();
  const textareaRef = useRef(null);
  const chatRef = useRef(null);
  const settingsRef = useRef(null);

  const [chat, setChat] = useState(null);
  const [otherParticipants, setOtherParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState();

  const [loadingChat, setLoadingChat] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [chatError, setChatError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [message, setMessage] = useState('');

  const [showSettings, setShowSettings] = useState(false);

  const [showTitleForm, setShowTitleForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTitleLoading, setNewTitleLoading] = useState(false);
  const [newTitleError, setNewTitleError] = useState('');

  const { token, user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

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
          method: 'GET',
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

        setOtherParticipants(data.otherParticipants || []);
        setChat(data.chat);
        setChatTitle(data.chat.title);
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
          method: 'GET',
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
          content: message,
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

  // Settings handler
  function handleSettingsClick() {
    setShowSettings((prev) => !prev);
  }

  // Rename chat handlers
  async function handleRenameChat() {
    setShowTitleForm((prev) => !prev);
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
          newTitle,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || data?.message || `Something went wrong: ${res.status}`,
        );
      }

      setChatTitle(newTitle);
      setNewTitle('');
      window.location.reload();
    } catch (err) {
      setNewTitleError(err.message || 'Something went wrong');
    } finally {
      setNewTitleLoading(false);
      setShowTitleForm(false);
      setShowSettings(false);
    }
  }

  function handleCloseTitleForm() {
    setShowTitleForm(false);
    setShowSettings(false);
  }

  // Leave chat (group only) handler
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
        <h2 className={styles.chatTitle}>
          {chat?.type === 'GROUP'
            ? chat.title || 'Group Chat'
            : chatTitle || otherParticipants[0]?.user?.displayName || 'Chat'}
        </h2>
        <div ref={settingsRef} className={styles.settingsWrapper}>
          <FaGear
            className={styles.settingsIcon}
            onClick={handleSettingsClick}
          />

          {showSettings && (
            <>
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

              {showTitleForm && (
                <div className={styles.titleFormOverlay}>
                  <form
                    className={styles.titleForm}
                    onSubmit={handleTitleFormSubmit}
                  >
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
                    <button type="submit">Update</button>

                    {newTitleError && <p>{newTitleError}</p>}
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
