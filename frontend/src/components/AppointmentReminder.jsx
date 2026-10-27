import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function tomorrowInManila() {
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

  const tomorrow = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day) + 1
    )
  );

  return tomorrow.toISOString().slice(0, 10);
}

function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${
    hour >= 12 ? 'PM' : 'AM'
  }`;
}

function AppointmentReminder({ token, page, openPage }) {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let controller;
    let requestNumber = 0;

    async function loadReminders() {
      const currentRequest = ++requestNumber;

      controller?.abort();
      controller = new AbortController();

      try {
        const data = await apiRequest('/appointments', {
          token,
          signal: controller.signal,
        });

        if (cancelled || currentRequest !== requestNumber) return;

        const tomorrow = tomorrowInManila();

        const reminders = data.appointments
          .filter(
            (appointment) =>
              appointment.status === 'booked' &&
              appointment.appointment_date === tomorrow
          )
          .sort((first, second) =>
            first.appointment_time.localeCompare(second.appointment_time)
          );

        setAppointments(reminders);
        setError('');
      } catch {
        if (cancelled || currentRequest !== requestNumber) return;

        setAppointments([]);
        setError('Appointment reminders could not be checked.');
      }
    }

    loadReminders();

    const timer = window.setInterval(loadReminders, 60000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadReminders();
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(timer);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [token, page, retry]);

  if (error) {
    return (
      <div className="appointment-reminder reminder-error">
        <p role="status">{error}</p>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setRetry((value) => value + 1)}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (appointments.length === 0) return null;

  return (
    <aside
      className="appointment-reminder"
      aria-labelledby="appointment-reminder-title"
    >
      <div role="status" aria-live="polite">
        <span className="eyebrow">UPCOMING VISIT</span>

        <h2 id="appointment-reminder-title">
          Appointment reminder: tomorrow
        </h2>

        {appointments.map((appointment) => (
          <p key={appointment.id}>
            <strong>{appointment.patient_name}</strong>
            {' — '}
            {appointment.department}
            {' on '}
            {appointment.appointment_date}
            {' at '}
            <strong>{formatTime(appointment.appointment_time)}</strong>
            {' (Philippine time).'}
          </p>
        ))}
      </div>

      {page !== 'appointments' && (
        <button
          type="button"
          className="primary-button"
          onClick={() => openPage('appointments')}
        >
          View Appointments
        </button>
      )}
    </aside>
  );
}

export default AppointmentReminder;