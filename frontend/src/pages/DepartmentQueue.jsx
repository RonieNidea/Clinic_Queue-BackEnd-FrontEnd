import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

const departments = [
  'General Medicine',
  'Nursing Assistance',
  'Basic First Aid',
  'Health Assessment',
];

function statusLabel(queue) {
  if (queue.status === 'serving') {
    return queue.arrived_at ? 'Serving' : 'Called — awaiting arrival';
  }

  if (queue.status === 'completed') return 'Served';
  if (queue.status === 'no_show') return 'No-show';

  return queue.status;
}

function DepartmentQueue({ token, user, openPage }) {
  const isAdmin = user.role === 'admin';

  const [department, setDepartment] = useState(
    isAdmin ? departments[0] : user.department
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [clock, setClock] = useState(Date.now());
  const [serverOffset, setServerOffset] = useState(0);

  const mutating = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let running = false;

    setLoading(true);
    setData(null);
    setLoadError('');

    async function loadQueue() {
      if (running || mutating.current) return;
      running = true;

      try {
        const query = new URLSearchParams({ department });

        const result = await apiRequest(
          `/staff/queue?${query}`,
          { token }
        );

        if (!cancelled) {
          setData(result);
          setLoadError('');
          setServerOffset(
            new Date(result.server_time).getTime() - Date.now()
          );
          setClock(Date.now());
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setLoadError(err.message);
        }
      } finally {
        running = false;

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQueue();

    const timer = window.setInterval(loadQueue, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, department, refresh]);

  async function performAction(path, method) {
    if (mutating.current) return;

    mutating.current = true;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const result = await apiRequest(path, {
        method,
        token,
        body: JSON.stringify({ department }),
      });

      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      mutating.current = false;
      setBusy(false);
      setRefresh((value) => value + 1);
    }
  }

  function markNoShow(queue) {
    if (
      !window.confirm(
        `Mark ${queue.queue_number} as a no-show? ` +
        'The patient will lose this place and must rejoin at the end.'
      )
    ) {
      return;
    }

    performAction(`/staff/queue/${queue.id}/no-show`, 'PATCH');
  }

  const current = data?.now_serving;

  const waiting = data?.queues.filter(
    (queue) => queue.status === 'waiting'
  ) || [];

  const deadline = data?.arrival_deadline
    ? new Date(data.arrival_deadline).getTime()
    : null;

  const remainingSeconds = deadline === null
    ? null
    : Math.max(
        0,
        Math.ceil((deadline - (clock + serverOffset)) / 1000)
      );

  const countdown = remainingSeconds === null
    ? 'Unavailable'
    : `${Math.floor(remainingSeconds / 60)}:${String(
        remainingSeconds % 60
      ).padStart(2, '0')}`;

  return (
    <main className="department-queue-page">
      <div className="section-heading">
        <span className="eyebrow">DEPARTMENT STAFF</span>
        <h1>Manage Queue</h1>
        <p>
          Call patients in queue order, confirm arrival, and
          record their completed visits.
        </p>
      </div>

      <div className="history-toolbar">
        {isAdmin ? (
          <label>
            Department
            <select
              value={department}
              disabled={busy}
              onChange={(event) => {
                setDepartment(event.target.value);
                setError('');
                setMessage('');
              }}
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

        <button
          type="button"
          className="secondary-button"
          disabled={busy || loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="notice error" role="alert">{error}</div>
      )}

      {message && (
        <div className="notice success" role="status">{message}</div>
      )}

      {loading ? (
        <p role="status">Loading department queue...</p>
      ) : loadError ? (
        <div className="notice error" role="alert">
          {loadError}
        </div>
      ) : data && (
        <>
          <section className="department-current-patient">
            <span className="eyebrow">CURRENT PATIENT</span>

            {current ? (
              <>
                <h2>{current.queue_number}</h2>
                <p><strong>{current.patient_name}</strong></p>
                <p>{statusLabel(current)}</p>

                {!current.arrived_at ? (
                  <>
                    <p>
                      Arrival window remaining:{' '}
                      <strong className="arrival-countdown">
                        {countdown}
                      </strong>
                    </p>

                    {remainingSeconds === 0 && (
                      <p>
                        The arrival window has ended. Confirm arrival
                        if the patient is present, or mark them as a no-show.
                      </p>
                    )}

                    <div className="record-visit-actions">
                      <button
                        type="button"
                        className="primary-button"
                        disabled={busy}
                        onClick={() =>
                          performAction(
                            `/staff/queue/${current.id}/arrive`,
                            'PATCH'
                          )
                        }
                      >
                        Confirm Arrival
                      </button>

                      <button
                        type="button"
                        className="secondary-button staff-reject-button"
                        disabled={busy || remainingSeconds !== 0}
                        onClick={() => markNoShow(current)}
                      >
                        Mark No-show
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Arrival confirmed. Open Record Visit and select{' '}
                      <strong>{current.queue_number}</strong>.
                      Complete the record after care is provided.
                    </p>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={busy}
                      onClick={() => openPage('recordVisit')}
                    >
                      Record / Complete Visit
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <h2>No patient currently called</h2>
                <p>{waiting.length} patient(s) waiting.</p>

                <button
                  type="button"
                  className="primary-button"
                  disabled={busy || waiting.length === 0}
                  onClick={() =>
                    performAction('/staff/queue/call-next', 'POST')
                  }
                >
                  {busy ? 'Please wait...' : 'Call Next Patient'}
                </button>
              </>
            )}
          </section>

          <section className="department-queue-list">
            <h2>Today&apos;s Queue</h2>

            {data.queues.length === 0 ? (
              <div className="history-empty">
                <h3>No patients in this department today</h3>
                <p>Queue entries will appear when patients join.</p>
              </div>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th scope="col">Number</th>
                      <th scope="col">Patient</th>
                      <th scope="col">Entry Type</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.queues.map((queue) => (
                      <tr key={queue.id}>
                        <td>{queue.queue_number}</td>
                        <td>{queue.patient_name}</td>
                        <td>
                          {queue.registration_type.replaceAll('_', ' ')}
                        </td>
                        <td>{statusLabel(queue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="history-note">
            Queue data refreshes every 10 seconds.
            Laravel checks the five-minute deadline before accepting
            a no-show action.
          </p>
        </>
      )}
    </main>
  );
}

export default DepartmentQueue;