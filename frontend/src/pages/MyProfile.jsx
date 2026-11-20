import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

function MyProfile({ token, onUpdated }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);

  const fileInput = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setLoadError('');

      try {
        const data = await apiRequest('/profile', { token });

        if (!cancelled) {
          setProfile(data.user);
          setName(data.user.name);
          setCourse(data.user.course || '');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token, retry]);

  useEffect(() => {
    if (!photo) {
      setPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    setError('');
    setMessage('');

    if (!file) {
      setPhoto(null);
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, or WebP image.');
      setPhoto(null);
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Your photo must be 2 MB or smaller.');
      setPhoto(null);
      event.target.value = '';
      return;
    }

    setPhoto(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError('');
    setMessage('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setSaving(true);

    const body = new FormData();
    body.append('name', name.trim());
    body.append('course', course.trim());

    if (photo) {
      body.append('photo', photo);
    }

    try {
      const data = await apiRequest('/profile', {
        method: 'POST',
        token,
        body,
      });

      setProfile(data.user);
      setName(data.user.name);
      setCourse(data.user.course || '');
      setPhoto(null);
      setMessage(data.message);

      if (fileInput.current) {
        fileInput.current.value = '';
      }

      onUpdated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="auth-page">
        <p role="status">Loading your profile...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>My Profile</h1>
          <p role="alert">{loadError}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  const photoUrl = photo ? preview : profile?.photo_url;

  return (
    <main className="auth-page">
      <form className="auth-card profile-form" onSubmit={handleSubmit}>
        <span className="eyebrow">ACCOUNT DETAILS</span>
        <h1>My Profile</h1>
        <p>Update your name, course, and profile photo.</p>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="notice success" role="status">
            {message}
          </div>
        )}

        <div className="profile-photo-area">
          {photoUrl ? (
            <img
              className="profile-photo"
              src={photoUrl}
              alt="Your profile"
            />
          ) : (
            <span className="profile-photo-placeholder" aria-hidden="true">
              {name.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        <label>
          Profile photo
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            disabled={saving}
          />
        </label>

        <p className="profile-upload-note">
          JPG, PNG, or WebP. Maximum file size: 2 MB.
          Changes are saved when you click Save Changes.
        </p>

        <label>
          Full name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            autoComplete="name"
            disabled={saving}
            required
          />
        </label>

        <label>
          Course (optional)
          <input
            type="text"
            value={course}
            onChange={(event) => setCourse(event.target.value)}
            maxLength={150}
            placeholder="For example: BS Information Technology"
            disabled={saving}
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            value={profile?.email || ''}
            readOnly
          />
        </label>

        <button
          type="submit"
          className="primary-button submit-button"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </main>
  );
}

export default MyProfile;