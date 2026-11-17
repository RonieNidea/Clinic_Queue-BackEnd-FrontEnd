import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

const departments = [
  'General Medicine',
  'Nursing Assistance',
  'Basic First Aid',
  'Health Assessment',
];

function todayInManila() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function AppointmentBlocks({ token, user }) {
  const isAdmin = user.role === 'admin';

  const [department, setDepartment] = useState(
    isAdmin ? departments[0] : user.department
  );
  const [date, setDate] = useState(todayInManila);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBlocks() {
      setLoading(true);
      setListError('');

      if (!date || !department) {
        setBlocks([]);
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          department,
          block_date: date,
        });

        const data = await apiRequest(
          `/staff/appointment-blocks?${query}`,
          { token }
        );

        if (!cancelled) {
          setBlocks(data.blocks);
        }
      } catch (err) {
        if (!cancelled) {
          setBlocks([]);
          setListError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBlocks();

    return () => {
      cancelled = true;
    };
  }, [token, department, date, refresh]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError('');
    setMessage('');

    if (endTime <= startTime) {
      setError('The end time must be later than the start time.');
      return;
    }

    setSaving(true);

    try {
      const data = await apiRequest('/staff/appointment-blocks', {
        method: 'POST',
        token,
        body: JSON.stringify({
          department,
          block_date: date,
          start_time: startTime,
          end_time: endTime,
          reason: reason.trim(),
        }),
      });

      setMessage(data.message);
      setReason('');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(block) {
    if (saving) return;

    if (
      !window.confirm(
        `Remove the ${block.start_time}–${block.end_time} block? ` +
        'Unbooked times in this period will become available again.'
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(
        `/staff/appointment-blocks/${block.id}`,
        {
          method: 'DELETE',
          token,
          body: JSON.stringify({ department }),
        }
      );

      setMessage(data.message);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">CLINIC SCHEDULE</span>
        <h1>Block Appointment Times</h1>
        <p>
          Reserve time for lunch, holidays, or special events.
          All times use Philippine time.
        </p>
      </div>

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

      <form
        className="auth-card record-visit-form"
        onSubmit={handleSubmit}
      >
        <fieldset disabled={saving}>
          {isAdmin ? (
            <label>
              Department
              <select
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setError('');
                  setMessage('');
                }}
                required
              >
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p><strong>Department:</strong> {department}</p>
          )}

          <label>
            Date
            <input
              type="date"
              value={date}
              min={todayInManila()}
              onChange={(event) => {
                setDate(event.target.value);
                setError('');
                setMessage('');
              }}
              required
            />
          </label>

          <div className="block-time-fields">
            <label>
              Start time
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </label>

            <label>
              End time
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="record-visit-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setStartTime('12:00');
                setEndTime('13:00');
              }}
            >
              Use Lunch Hours
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setStartTime('00:00');
                setEndTime('23:59');
              }}
            >
              Block Whole Day
            </button>
          </div>

          <label>
            Reason
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={255}
              placeholder="Lunch break, holiday, or clinic event"
              required
            />
          </label>

          <p className="staff-registration-note">
            Existing bookings will be preserved. A block cannot
            overlap an active appointment or another block.
          </p>

          <button
            type="submit"
            className="primary-button submit-button"
          >
            {saving ? 'Saving...' : 'Block These Times'}
          </button>
        </fieldset>
      </form>

      <section className="staff-approval-panel">
        <div className="staff-approval-toolbar">
          <h2>Blocks for {date || 'Selected Date'}</h2>

          <button
            type="button"
            className="secondary-button"
            disabled={loading || saving}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh
          </button>
        </div>

        <p>{department}</p>

        {loading ? (
          <p role="status">Loading blocked periods...</p>
        ) : listError ? (
          <p className="appointment-error" role="alert">
            {listError}
          </p>
        ) : blocks.length === 0 ? (
          <p>No blocked periods for this date and department.</p>
        ) : (
          <div className="staff-application-list">
            {blocks.map((block) => (
              <article className="staff-application-card" key={block.id}>
                <div>
                  <h3>{block.start_time} – {block.end_time}</h3>
                  <p>{block.reason}</p>
                </div>

                <button
                  type="button"
                  className="secondary-button staff-reject-button"
                  disabled={saving}
                  onClick={() => removeBlock(block)}
                >
                  Remove Block
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default AppointmentBlocks;