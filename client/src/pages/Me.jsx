import { useAuth } from '../auth/AuthContext';
import styles from './styles/Me.module.css';
import { FaEdit, FaRegWindowClose } from 'react-icons/fa';
import { useEffect, useState } from 'react';

const DEFAULT_AVATAR =
  'https://simplyilm.com/wp-content/uploads/2017/08/temporary-profile-placeholder-1.jpg';
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 25;

export default function Me() {
  const { user, token, updateUser } = useAuth();

  const [showEditPfp, setShowEditPfp] = useState(false);
  const [showEditDisplayName, setShowEditDisplayName] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [displayName, setDisplayName] = useState(user?.displayName || '');

  const [uploadLoading, setUploadLoading] = useState(false);
  const [displayNameLoading, setDisplayNameLoading] = useState(false);

  const [uploadError, setUploadError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    setDisplayName(user?.displayName || '');
  }, [user?.displayName]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function openPfpModal() {
    setUploadError('');
    setSelectedFile(null);
    setPreview(null);
    setShowEditPfp(true);
  }

  function closePfpModal() {
    setUploadError('');
    setSelectedFile(null);
    setPreview(null);
    setShowEditPfp(false);
  }

  function openDisplayNameModal() {
    setDisplayNameError('');
    setDisplayName(user?.displayName || '');
    setShowEditDisplayName(true);
  }

  function closeDisplayNameModal() {
    setDisplayNameError('');
    setDisplayName(user?.displayName || '');
    setShowEditDisplayName(false);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    setUploadError('');
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload(e) {
    e.preventDefault();

    if (!selectedFile) {
      setUploadError('Please select a file');
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError('');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${apiUrl}/user/profile-picture`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Upload failed');
      }

      updateUser(data.user);
      closePfpModal();
    } catch (err) {
      setUploadError(err.message || 'Something went wrong');
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleDisplayNameSubmit(e) {
    e.preventDefault();

    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setDisplayNameError('Display name is required');
      return;
    }

    if (
      trimmedDisplayName.length < DISPLAY_NAME_MIN_LENGTH ||
      trimmedDisplayName.length > DISPLAY_NAME_MAX_LENGTH
    ) {
      setDisplayNameError(
        `Display name must be between ${DISPLAY_NAME_MIN_LENGTH} and ${DISPLAY_NAME_MAX_LENGTH} characters`,
      );
      return;
    }

    try {
      setDisplayNameLoading(true);
      setDisplayNameError('');

      const res = await fetch(`${apiUrl}/user/display-name`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: trimmedDisplayName,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update display name');
      }

      updateUser(data.user);
      closeDisplayNameModal();
    } catch (err) {
      setDisplayNameError(err.message || 'Something went wrong');
    } finally {
      setDisplayNameLoading(false);
    }
  }

  const avatarSrc = preview || user?.profilePictureUrl || DEFAULT_AVATAR;

  return (
    <main className={styles.main}>
      <div className={styles.profileCard}>
        <div className={styles.pfpContainer}>
          <img src={avatarSrc} alt="profile" className={styles.pfpImg} />

          <button
            type="button"
            className={styles.editPfpBtn}
            onClick={openPfpModal}
          >
            <FaEdit />
          </button>
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.displayNameRow}>
            <h1 className={styles.displayName}>{user?.displayName}</h1>

            <button
              type="button"
              className={styles.editDisplayNameBtn}
              onClick={openDisplayNameModal}
            >
              <FaEdit />
            </button>
          </div>

          <p className={styles.username}>@{user?.username}</p>
        </div>
      </div>

      {showEditPfp && (
        <div className={styles.modalOverlay} onClick={closePfpModal}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <FaRegWindowClose
              className={styles.modalClose}
              onClick={closePfpModal}
            />

            <h2 className={styles.modalTitle}>Upload profile picture</h2>

            <form className={styles.modalForm} onSubmit={handleUpload}>
              <input
                className={styles.fileInput}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />

              <div className={styles.previewWrapper}>
                <img
                  src={avatarSrc}
                  alt="preview"
                  className={styles.previewImg}
                />
              </div>

              {uploadError && <p className={styles.error}>{uploadError}</p>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={uploadLoading}
              >
                {uploadLoading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditDisplayName && (
        <div className={styles.modalOverlay} onClick={closeDisplayNameModal}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <FaRegWindowClose
              className={styles.modalClose}
              onClick={closeDisplayNameModal}
            />

            <h2 className={styles.modalTitle}>Change display name</h2>

            <form
              className={styles.modalForm}
              onSubmit={handleDisplayNameSubmit}
            >
              <label className={styles.label} htmlFor="displayName">
                Display name
              </label>

              <input
                id="displayName"
                className={styles.textInput}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                minLength={DISPLAY_NAME_MIN_LENGTH}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
              />

              {displayNameError && (
                <p className={styles.error}>{displayNameError}</p>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={displayNameLoading}
              >
                {displayNameLoading ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
