import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

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

function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${
    hour >= 12 ? 'PM' : 'AM'
  }`;
}

function RescheduleAppointment({
  appointment,
  token,
  onSaved,
  onClose,
}) {
  const [date, setDate] = useState(appointment.appointment_date);
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [error, setError] = useState('');
  const [clinicClosed, setClinicClosed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setLoading(true);
      setSlotsError('');
      setSlots([]);
      setTime('');
      setClinicClosed(false);

      if (!date) {
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          appointment_date: date,
          department: appointment.department,
        });

        const data = await apiRequest(
          `/appointments/available-slots?${query}`,
          { token }
        );

        if (!cancelled) {
          setSlots(data.slots);
          setClinicClosed(data.clinic_closed);
        }
      } catch (err) {
        if (!cancelled) {
          setSlotsError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [date, appointment.department, token, refresh]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || loading) return;

    setError('');

    const selectedSlot = slots.find((slot) => slot.time === time);

    if (!selectedSlot?.available) {
      setError('Please choose an available time.');
      return;
    }

    setSaving(true);

    try {
      const data = await apiRequest(
        `/appointments/${appointment.id}/reschedule`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            appointment_date: date,
            appointment_time: time,
          }),
        }
      );

      onSaved(data);
        } catch (err) {
      setError(
        err.status === 409
          ? 'That slot was just taken by another patient. Your original booking is unchanged. Please choose another available time.'
          : err.message
      );

      setTime('');
      setRefresh((value) => value + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="reschedule-panel">
      <form
        className="auth-card booking-form"
        onSubmit={handleSubmit}
        aria-labelledby="reschedule-title"
      >
        <span className="eyebrow">CHANGE YOUR VISIT</span>
        <h2 id="reschedule-title">Reschedule Appointment</h2>

        <p>
          <strong>{appointment.department}</strong>
          <br />
          Current booking: {appointment.appointment_date}
          {' at '}
          {formatTime(appointment.appointment_time)}
        </p>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        <fieldset disabled={saving}>
          <label>
            New appointment date
            <input
              type="date"
              value={date}
              min={todayInManila()}
              onChange={(event) => {
                setDate(event.target.value);
                setTime('');
                setError('');
              }}
              required
            />
          </label>

          <div className="slot-picker">
            <h3>Choose a new time</h3>

            <p className="slot-note">
              All times are Philippine time. Your current booking
              stays reserved until the change succeeds.
            </p>

            {loading ? (
              <p role="status">Loading appointment times...</p>
            ) : slotsError ? (
              <p className="appointment-error" role="alert">
                {slotsError}
              </p>
            ) : !date ? (
              <p>Please select a date.</p>
            ) : clinicClosed ? (
              <p>The clinic is closed on Sundays.</p>
            ) : (
              <>
                <div className="slot-grid">
                  {slots.map((slot) => {
                    const isCurrent =
                      date === appointment.appointment_date &&
                      slot.time === appointment.appointment_time;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        className={
                          `time-slot ${slot.status}` +
                          (time === slot.time ? ' selected' : '')
                        }
                        disabled={!slot.available || isCurrent}
                        aria-pressed={time === slot.time}
                        onClick={() => setTime(slot.time)}
                      >
                        <strong>{formatTime(slot.time)}</strong>
                        <small>
                          {isCurrent
                            ? 'Current booking'
                            : slot.status === 'booked'
                              ? 'Taken'
                              : slot.status === 'past'
                                ? 'Past'
                                : 'Available'}
                        </small>
                      </button>
                    );
                  })}
                </div>

                {!slots.some((slot) => slot.available) && (
                  <p>No open times remain. Choose another date.</p>
                )}
              </>
            )}
          </div>

          <div className="reschedule-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving || loading || Boolean(slotsError) || !time}
            >
              {saving ? 'Saving...' : 'Save New Schedule'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Keep Original Booking
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={() => setRefresh((value) => value + 1)}
            >
              Refresh Times
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

export default RescheduleAppointment;