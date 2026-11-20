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

function formatTime(value) {
  if (!value) return '—';

  const [hour, minute] = value.split(':').map(Number);

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${
    hour >= 12 ? 'PM' : 'AM'
  }`;
}

function DailyExceptions({ token, user }) {
  const isAdmin = user.role === 'admin';

  const [date, setDate] = useState(todayInManila);
  const [department, setDepartment] = useState(
    isAdmin ? 'all' : user.department
  );
  const [status, setStatus] = useState('all');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError('');

      if (!date) {
        setRecords([]);
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          date,
          department,
        });

        const data = await apiRequest(
          `/staff/daily-exceptions?${query}`,
          { token }
        );

        const combined = [
          ...data.appointments.map((appointment) => ({
            key: `appointment-${appointment.id}`,
            reference: `Appointment #${appointment.id}`,
            source: 'Appointment',
            patient: appointment.patient_name,
            department: appointment.department,
            date: appointment.appointment_date,
            time: appointment.appointment_time,
            status: appointment.status,
          })),
          ...data.queues.map((queue) => ({
            key: `queue-${queue.id}`,
            reference: queue.queue_number,
            source: 'Queue',
            patient: queue.patient_name,
            department: queue.department,
            date: queue.queue_date,
            time: null,
            status: queue.status,
          })),
        ];

        if (!cancelled) {
          setRecords(combined);
        }
      } catch (err) {
        if (!cancelled) {
          setRecords([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      cancelled = true;
    };
  }, [token, date, department, refresh]);

  const visibleRecords = records.filter(
    (record) => status === 'all' || record.status === status
  );

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">DAILY CLINIC RECORDS</span>
        <h1>No-shows &amp; Cancellations</h1>
        <p>
          Review recorded no-shows and cancellations by appointment
          date or queue date.
        </p>
      </div>

      <div className="history-toolbar exceptions-toolbar">
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        {isAdmin ? (
          <label>
            Department
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="all">All departments</option>

              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p><strong>Department:</strong> {user.department}</p>
        )}

        <label>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All exceptions</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </label>

        <button
          type="button"
          className="secondary-button"
          disabled={loading || !date}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p role="status">Loading daily records...</p>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : !date ? (
        <p>Please select a date.</p>
      ) : visibleRecords.length === 0 ? (
        <section className="history-empty">
          <h2>No matching records</h2>
          <p>
            No recorded no-shows or cancellations match your
            selected date, department, and status.
          </p>
        </section>
      ) : (
        <>
          <p className="history-count">
            {visibleRecords.length} record(s)
          </p>

          <div
            className="history-table-wrapper"
            role="region"
            aria-label="Daily no-shows and cancellations"
            tabIndex={0}
          >
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Source</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Department</th>
                  <th scope="col">Date</th>
                  <th scope="col">Appointment Time</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>

              <tbody>
                {visibleRecords.map((record) => (
                  <tr key={record.key}>
                    <td>{record.reference}</td>
                    <td>{record.source}</td>
                    <td>{record.patient}</td>
                    <td>{record.department}</td>
                    <td>{record.date}</td>
                    <td>{formatTime(record.time)}</td>
                    <td>
                      <span className="history-status cancelled">
                        {record.status === 'no_show'
                          ? 'No-show'
                          : 'Cancelled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="history-note">
        Dates refer to the scheduled appointment or queue day,
        not when cancellation occurred. Appointment and queue
        records are listed separately, so totals are not unique patients.
      </p>
    </main>
  );
}

export default DailyExceptions;