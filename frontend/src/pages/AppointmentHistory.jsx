import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${
    hour >= 12 ? 'PM' : 'AM'
  }`;
}

function appointmentTimestamp(appointment) {
  return new Date(
    `${appointment.appointment_date}T` +
    `${appointment.appointment_time}:00+08:00`
  ).getTime();
}

function statusLabel(appointment) {
  if (appointment.status === 'cancelled') return 'Cancelled';
  if (appointment.status === 'completed') return 'Completed';
  if (appointment.checked_in_at) return 'Checked in';

  return appointmentTimestamp(appointment) <= Date.now()
    ? 'Past booking'
    : 'Booked';
}

function AppointmentHistory({ token, openPage }) {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError('');

      try {
        const data = await apiRequest('/appointments', { token });

        const sorted = [...data.appointments].sort(
          (first, second) =>
            appointmentTimestamp(second) - appointmentTimestamp(first) ||
            second.id - first.id
        );

        if (!cancelled) {
          setAppointments(sorted);
        }
      } catch (err) {
        if (!cancelled) {
          setAppointments([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  const now = Date.now();

  const visibleAppointments = appointments.filter((appointment) => {
    if (filter === 'cancelled') {
      return appointment.status === 'cancelled';
    }

    if (filter === 'upcoming') {
      return (
        appointment.status === 'booked' &&
        appointmentTimestamp(appointment) > now
      );
    }

    if (filter === 'past') {
      return (
        appointment.status !== 'cancelled' &&
        appointmentTimestamp(appointment) <= now
      );
    }

    return true;
  });

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">YOUR CLINIC RECORDS</span>
        <h1>Appointment History</h1>
        <p>Review your appointment dates, departments, and reasons for visiting.</p>
      </div>

      <div className="history-toolbar">
        <label>
          Show appointments
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All appointments</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past appointments</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={() => openPage('appointments')}
        >
          Manage Appointments
        </button>
      </div>

      {loading ? (
        <p role="status">Loading your appointment history...</p>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : visibleAppointments.length === 0 ? (
        <div className="history-empty">
          <h2>No appointments to display</h2>
          <p>Try another filter or book your first appointment.</p>
        </div>
      ) : (
        <>
          <p className="history-count">
            {visibleAppointments.length} appointment(s)
          </p>

          <div
            className="history-table-wrapper"
            role="region"
            aria-label="Appointment history table"
            tabIndex={0}
          >
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Department</th>
                  <th scope="col">Date and Time</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>

              <tbody>
                {visibleAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>#{appointment.id}</td>
                    <td>{appointment.patient_name}</td>
                    <td>{appointment.department}</td>
                    <td>
                      {appointment.appointment_date}
                      <br />
                      {formatTime(appointment.appointment_time)}
                    </td>
                    <td className="history-reason">
                      {appointment.reason?.trim() || 'No reason provided'}
                    </td>
                    <td>
                      <span
                        className={
                          'history-status ' +
                          (appointment.status === 'cancelled'
                            ? 'cancelled'
                            : 'recorded')
                        }
                      >
                        {statusLabel(appointment)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="history-note">
            Times are shown in Philippine time. A past booking does not
            automatically mean the visit was completed.
          </p>
        </>
      )}
    </main>
  );
}

export default AppointmentHistory;