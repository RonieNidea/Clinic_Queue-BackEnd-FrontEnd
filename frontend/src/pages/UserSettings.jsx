import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function UserSettings({ token, user, onSaved }) {
  const isPatient = user?.role === 'patient';

  const [enabled, setEnabled] = useState(true);
  const [visibility, setVisibility] = useState('department_staff');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setLoadError('');

      try {
        const data = await apiRequest('/settings', { token });

        if (!cancelled) {
          setEnabled(data.settings.walk_in_alerts);
          setVisibility(data.settings.record_visibility);
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

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [token, retry]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest('/settings', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          walk_in_alerts: enabled,
          ...(isPatient
            ? { record_visibility: visibility }
            : {}),
        }),
      });

      setEnabled(data.settings.walk_in_alerts);
      setVisibility(data.settings.record_visibility);
      onSaved(data.settings);
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="settings-card">
        <span className="eyebrow">ACCOUNT PREFERENCES</span>
        <h1>Settings</h1>

        {loading ? (
          <p role="status">Loading your settings...</p>
        ) : loadError ? (
          <>
            <p role="alert">{loadError}</p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Try Again
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2>Queue Alerts</h2>

            <label className="settings-checkbox">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => {
                  setEnabled(event.target.checked);
                  setMessage('');
                }}
                disabled={saving}
              />

              <span>Enable walk-in queue alerts</span>
            </label>

            <p>
              Show near-turn and number-called notices on My Queue
              and the Queue Board while you are signed in.
            </p>

            <p>
              Queue status and estimated waiting times remain visible
              when alerts are off. Appointment reminders are separate.
            </p>

            {isPatient && (
              <section className="record-privacy-settings">
                <h2>Record Privacy</h2>

                <label htmlFor="record-visibility">
                  Who can access your clinical visit records?
                </label>

                <select
                  id="record-visibility"
                  value={visibility}
                  onChange={(event) => {
                    setVisibility(event.target.value);
                    setMessage('');
                  }}
                  disabled={saving}
                  required
                >
                  <option value="department_staff">
                    Me, admin, and staff in the visit's department
                  </option>
                  <option value="admin_only">
                    Me and admin only
                  </option>
                </select>

                <p>
                  You can always access your own completed visit
                  summaries and health notes.
                </p>

                {visibility === 'admin_only' ? (
                  <p className="privacy-explanation">
                    Department staff cannot access your clinical
                    records or record new visits for you.
                    An admin must handle your visit records.
                  </p>
                ) : (
                  <p className="privacy-explanation">
                    Approved department staff can access records
                    within their assigned department.
                    Admin can access records across departments.
                  </p>
                )}

                <p>
                  This preference applies to records linked to your
                  account. Basic appointment and queue information
                  remains available for clinic operations.
                </p>
              </section>
            )}

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

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default UserSettings;