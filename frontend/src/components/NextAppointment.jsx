import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${
    hour >= 12 ? 'PM' : 'AM'
  }`;
}

function NextAppointment({ token, openPage }) {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let running = false;

    async function loadNextAppointment() {
      if (running) return;
      running = true;

      try {
        const data = await apiRequest('/appointments', { token });
        const now = Date.now();

        const upcoming = data.appointments
          .filter((item) => {
            const appointmentTime = new Date(
              `${item.appointment_date}T${item.appointment_time}:00+08:00`
            ).getTime();

            return item.status === 'booked' && appointmentTime > now;
          })
          .sort((first, second) =>
            `${first.appointment_date} ${first.appointment_time}`.localeCompare(
              `${second.appointment_date} ${second.appointment_time}`
            )
          );

        if (!cancelled) {
          setAppointment(upcoming[0] || null);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setAppointment(null);
          setError(err.message);
        }
      } finally {
        running = false;

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNextAppointment();

    const timer = window.setInterval(loadNextAppointment, 60000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadNextAppointment();
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [token, refresh]);

  return (
    <section className="next-appointment">
      <div>
        <span className="eyebrow">YOUR NEXT VISIT</span>
        <h2>Next Appointment</h2>

        {loading ? (
          <p role="status">Checking your next appointment...</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : appointment ? (
          <>
            <h3>{appointment.department}</h3>
            <p>{appointment.patient_name}</p>
            <p>
              <strong>
                {appointment.appointment_date}
                {' at '}
                {formatTime(appointment.appointment_time)}
              </strong>
              {' · Philippine time'}
            </p>
            <p>Booking reference: #{appointment.id}</p>
          </>
        ) : (
          <p>You have no upcoming appointments.</p>
        )}
      </div>

      <div className="next-appointment-actions">
        {error ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setLoading(true);
              setError('');
              setRefresh((value) => value + 1);
            }}
          >
            Try Again
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={() => openPage('appointments')}
          >
            {appointment ? 'Manage Appointment' : 'Book an Appointment'}
          </button>
        )}
      </div>
    </section>
  );
}

export default NextAppointment;