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

function formatTime(time) {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

function Appointments({ token, user }) {
  const [patientName, setPatientName] = useState(user.name);
  const [department, setDepartment] = useState(departments[0]);
  const [date, setDate] = useState(todayInManila);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const [slots, setSlots] = useState([]);
  const [clinicClosed, setClinicClosed] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setSlotsLoading(true);
      setSlotsError('');
      setSlots([]);
      setTime('');
      setClinicClosed(false);

      if (!date) {
        setSlotsLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          appointment_date: date,
          department,
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
          setSlotsLoading(false);
        }
      }
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [date, department, token, refresh]);

  useEffect(() => {
    let cancelled = false;

    async function loadAppointments() {
      setListLoading(true);
      setListError('');

      try {
        const data = await apiRequest('/appointments', { token });

        if (!cancelled) {
          setAppointments(data.appointments);
        }
      } catch (err) {
        if (!cancelled) {
          setListError(err.message);
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    loadAppointments();

    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  async function bookAppointment(event) {
    event.preventDefault();

    if (busy || slotsLoading) return;

    setError('');
    setMessage('');
    setConfirmation(null);

    const selectedSlot = slots.find((slot) => slot.time === time);

    if (!selectedSlot?.available) {
      setError('Please choose an available appointment time.');
      return;
    }

    setBusy(true);

    try {
      const data = await apiRequest('/appointments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          patient_name: patientName.trim(),
          department,
          appointment_date: date,
          appointment_time: time,
          reason: reason.trim(),
        }),
      });

      setConfirmation(data.appointment);
      setReason('');
      setTime('');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);

      // Reload the slots if availability changed during booking.
      setRefresh((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  async function cancelAppointment(appointment) {
    if (busy) return;

    const confirmed = window.confirm(
      `Cancel your ${appointment.department} appointment on ` +
      `${appointment.appointment_date} at ` +
      `${formatTime(appointment.appointment_time)}?`
    );

    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(
        `/appointments/${appointment.id}/cancel`,
        {
          method: 'PATCH',
          token,
        }
      );

      if (confirmation?.id === appointment.id) {
        setConfirmation(null);
      }

      setMessage(data.message);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="appointments-page">
      <div className="section-heading">
        <span className="eyebrow">PLAN YOUR CLINIC VISIT</span>
        <h1>Appointments</h1>
        <p>Choose a department, select an open time, and book your visit.</p>
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

      {confirmation && (
        <section className="booking-confirmation" role="status">
          <h2>Appointment confirmed!</h2>
          <p>
            Your booking reference is <strong>#{confirmation.id}</strong>.
          </p>
          <p><strong>Patient:</strong> {confirmation.patient_name}</p>
          <p><strong>Department:</strong> {confirmation.department}</p>
          <p>
            <strong>Date and time:</strong>{' '}
            {confirmation.appointment_date} at{' '}
            {formatTime(confirmation.appointment_time)}
          </p>
        </section>
      )}

      <div className="appointments-layout">
        <form
          className="auth-card booking-form"
          onSubmit={bookAppointment}
        >
          <h2>Book an Appointment</h2>

          <fieldset disabled={busy}>
            <label>
              Patient name
              <input
                type="text"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                maxLength={255}
                autoComplete="name"
                required
              />
            </label>

            <label>
              Department
              <select
                value={department}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setTime('');
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

            <label>
              Appointment date
              <input
                type="date"
                value={date}
                min={todayInManila()}
                onChange={(event) => {
                  setDate(event.target.value);
                  setTime('');
                }}
                required
              />
            </label>

            <div className="slot-picker">
              <h3>Appointment time</h3>
              <p className="slot-note">
                All times are Philippine time. Taken and past slots
                cannot be selected.
              </p>

              {slotsLoading ? (
                <p role="status">Loading appointment times...</p>
              ) : slotsError ? (
                <p className="appointment-error" role="alert">
                  {slotsError}
                </p>
              ) : !date ? (
                <p>Please select a date.</p>
              ) : clinicClosed ? (
                <p>The clinic is closed on Sundays. Choose another date.</p>
              ) : (
                <>
                  <div className="slot-grid">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        className={
                          `time-slot ${slot.status}` +
                          (time === slot.time ? ' selected' : '')
                        }
                        disabled={!slot.available}
                        aria-pressed={time === slot.time}
                        onClick={() => setTime(slot.time)}
                      >
                        <strong>{formatTime(slot.time)}</strong>
                        <small>
                          {slot.status === 'booked'
                            ? 'Taken'
                            : slot.status === 'past'
                              ? 'Past'
                              : 'Available'}
                        </small>
                      </button>
                    ))}
                  </div>

                  {!slots.some((slot) => slot.available) && (
                    <p>No open times remain. Please choose another date.</p>
                  )}
                </>
              )}
            </div>

            <label>
              Reason for visit (optional)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Briefly describe the reason for your visit."
              />
            </label>

            <button
              type="submit"
              className="primary-button submit-button"
              disabled={
                busy || slotsLoading || Boolean(slotsError) || !time
              }
            >
              {busy ? 'Please wait...' : 'Confirm Appointment'}
            </button>
          </fieldset>
        </form>

        <section
          className="my-appointments"
          aria-labelledby="my-appointments-title"
        >
          <div className="appointment-list-heading">
            <h2 id="my-appointments-title">My Appointments</h2>

            <button
              type="button"
              className="secondary-button"
              disabled={busy || slotsLoading || listLoading}
              onClick={() => setRefresh((value) => value + 1)}
            >
              Refresh
            </button>
          </div>

          {listLoading ? (
            <p role="status">Loading your appointments...</p>
          ) : listError ? (
            <p className="appointment-error" role="alert">
              {listError}
            </p>
          ) : appointments.length === 0 ? (
            <p>You have no appointments yet.</p>
          ) : (
            appointments.map((appointment) => (
              <article
                className="appointment-item"
                key={appointment.id}
              >
                <span className={`booking-status ${appointment.status}`}>
                  {appointment.status}
                </span>

                <h3>{appointment.department}</h3>
                <p>{appointment.patient_name}</p>
                <p>
                  {appointment.appointment_date}
                  {' · '}
                  {formatTime(appointment.appointment_time)}
                </p>

                {appointment.status === 'booked' && (
                  <button
                    type="button"
                    className="secondary-button cancel-booking"
                    disabled={busy}
                    onClick={() => cancelAppointment(appointment)}
                  >
                    Cancel Appointment
                  </button>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

export default Appointments;