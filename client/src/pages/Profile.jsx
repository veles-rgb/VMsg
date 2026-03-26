import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiAtSymbol, HiCalendarDays } from 'react-icons/hi2';
import { FaArrowLeft, FaUserLarge } from 'react-icons/fa6';
import { useAuth } from '../auth/AuthContext';
import styles from './styles/Profile.module.css';

const DEFAULT_AVATAR =
  'https://simplyilm.com/wp-content/uploads/2017/08/temporary-profile-placeholder-1.jpg';

function formatJoinedDate(dateString) {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);

  return new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function Profile() {
  const { username } = useParams();
  const { token } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        setProfileLoading(true);
        setProfileError('');

        const res = await fetch(
          `${apiUrl}/user/${encodeURIComponent(username || '')}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              `Something went wrong: ${res.status}`,
          );
        }

        setProfile(data.user);
      } catch (err) {
        setProfileError(err.message || 'Something went wrong');
      } finally {
        setProfileLoading(false);
      }
    }

    if (!username) {
      setProfileError('Username is required');
      setProfileLoading(false);
      return;
    }

    if (!token) {
      setProfileError('Missing token');
      setProfileLoading(false);
      return;
    }

    fetchProfile();
  }, [apiUrl, username, token]);

  if (profileLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <Link to="/" className={styles.backLink}>
              <FaArrowLeft />
              Back
            </Link>
            <div className={styles.headerText}>
              <span className={styles.headerBadge}>Profile</span>
              <h1 className={styles.headerTitle}>Loading profile...</h1>
            </div>
          </div>
        </div>

        <div className={styles.pageContent}>
          <section className={styles.stateCard}>
            <h2 className={styles.stateTitle}>Loading profile...</h2>
            <p className={styles.stateText}>Pulling user information now.</p>
          </section>
        </div>
      </main>
    );
  }

  if (profileError) {
    return (
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <Link to="/" className={styles.backLink}>
              <FaArrowLeft />
              Back
            </Link>
            <div className={styles.headerText}>
              <span className={styles.headerBadge}>Profile</span>
              <h1 className={styles.headerTitle}>Profile</h1>
            </div>
          </div>
        </div>

        <div className={styles.pageContent}>
          <section className={styles.stateCard}>
            <h2 className={styles.stateTitle}>Could not load profile</h2>
            <p className={styles.stateError}>{profileError}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <Link to="/" className={styles.backLink}>
            <FaArrowLeft />
            Back
          </Link>

          <div className={styles.headerText}>
            <span className={styles.headerBadge}>Profile</span>
            <h1 className={styles.headerTitle}>{profile.displayName}</h1>
            <p className={styles.headerSubtitle}>
              Public account details for @{profile.username}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.pageContent}>
        <section className={styles.profileCard}>
          <div className={styles.profileTop}>
            <div className={styles.avatarWrap}>
              <img
                className={styles.avatar}
                src={profile.profilePictureUrl || DEFAULT_AVATAR}
                alt={`${profile.displayName}'s avatar`}
              />
            </div>

            <div className={styles.identityBlock}>
              <h2 className={styles.displayName}>{profile.displayName}</h2>
              <p className={styles.username}>
                <HiAtSymbol className={styles.inlineIcon} />
                {profile.username}
              </p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>
                <FaUserLarge className={styles.infoIcon} />
                Display Name
              </div>
              <div className={styles.infoValue}>{profile.displayName}</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>
                <HiAtSymbol className={styles.infoIcon} />
                Username
              </div>
              <div className={styles.infoValue}>@{profile.username}</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>
                <HiCalendarDays className={styles.infoIcon} />
                Joined
              </div>
              <div className={styles.infoValue}>
                {formatJoinedDate(profile.createdAt)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
