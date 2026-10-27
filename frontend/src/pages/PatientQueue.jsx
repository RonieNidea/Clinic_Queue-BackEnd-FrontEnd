import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

const departments = [
  'General Medicine',
  'Nursing Assistance',
  'Basic First Aid',
  'Health Assessment',
];

function PatientQueue({ token, openPage }) {
  const [department, setDepartment] = useState(departments[0]);
  const [queues, setQueues] = useState([]);
  const [board, setBoard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [queueError, setQueueError] = useState('');
  const [boardError, setBoardError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  const submitting = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    const controller = new AbortController();

    async function loadQueue() {
      if (running) return;
      running = true;

      const results = await Promise.allSettled([
        apiRequest('/patient/queues', {
          token,
          signal: controller.signal,
        }),
        apiRequest('/queues/live-board', {
          signal: controller.signal,
        }),
      ]);

      if (!cancelled) {
        const [queueResult, boardResult] = results;

        if (queueResult.status === 'fulfilled') {
          setQueues(queueResult.value.queues);
          setQueueError('');
        } else {
          setQueues([]);
          setQueueError(queueResult.reason.message);
        }

        if (boardResult.status === 'fulfilled') {
          setBoard(boardResult.value);
          setBoardError('');
        } else {
          setBoard(null);
          setBoardError(
            'Wait estimates could not be updated. Please check again shortly.'
          );
        }

        setLoading(false);
      }

      running = false;
    }

    loadQueue();

    const timer = window.setInterval(loadQueue, 10000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadQueue();
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [token, refresh]);

  const activeQueue = queues.find((queue) =>
    ['waiting', 'serving'].includes(queue.status)
  );

    const departmentBoard =
    board &&
    activeQueue &&
    board.date === activeQueue.queue_date
      ? board.departments.find(
          (item) => item.department === activeQueue.department
        )
      : null;

  const waitingIndex = departmentBoard
    ? departmentBoard.waiting_numbers.indexOf(activeQueue.queue_number)
    : -1;

  const peopleAhead =
    waitingIndex >= 0
      ? waitingIndex + (departmentBoard.now_serving ? 1 : 0)
      : null;

  const estimatedMinutes =
    peopleAhead === null
      ? null
      : peopleAhead * board.average_service_minutes;

  function trackQueue(queue) {
    localStorage.setItem(
      'clinicqueueweb_tracked_queue',
      JSON.stringify({
        date: queue.queue_date,
        department: queue.department,
        number: queue.queue_number,
      })
    );
  }

  async function handleJoin(event) {
    event.preventDefault();

    if (submitting.current || activeQueue || loading || queueError) return;

    submitting.current = true;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest('/patient/queues', {
        method: 'POST',
        token,
        body: JSON.stringify({ department }),
      });

      trackQueue(data.queue);
      setQueues((previous) => [data.queue, ...previous]);
      setMessage(data.message);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);

      if (err.status === 409) {
        setRefresh((value) => value + 1);
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="patient-queue-page">
      <div className="section-heading">
        <span className="eyebrow">YOUR CLINIC VISIT</span>
        <h1>My Queue</h1>
        <p>
          Join a department queue and arrive at the clinic before
          your number is called.
        </p>

        <button
          type="button"
          className="secondary-button"
          disabled={saving}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p role="status">Checking your queue...</p>
      ) : queueError ? (
        <div className="notice error" role="alert">
          {queueError}
        </div>
      ) : activeQueue ? (
        <section className="patient-queue-card">
          <span className="eyebrow">YOUR QUEUE NUMBER</span>
          <h2>{activeQueue.queue_number}</h2>
          <p><strong>{activeQueue.department}</strong></p>
          <p>{activeQueue.patient_name}</p>

          <span className={`reception-status ${activeQueue.status}`}>
            {activeQueue.status}
          </span>

          {activeQueue.status === 'serving' ? (
            <p className="near-turn-notice" role="status">
              Your number has been called. Please go to your department now.
            </p>
          ) : boardError ? (
            <p role="status">{boardError}</p>
          ) : peopleAhead !== null ? (
            <>
              <p>
                People ahead: <strong>{peopleAhead}</strong>
              </p>

              <p>
                Estimated wait:{' '}
                <strong>
                  {estimatedMinutes === 0
                    ? 'You are next in line'
                    : `About ${estimatedMinutes} minutes`}
                </strong>
              </p>

              {peopleAhead <= 2 && (
                <p className="near-turn-notice" role="status">
                  Your turn is nearly up. Please be ready at the clinic.
                </p>
              )}
            </>
          ) : (
            <p role="status">Waiting for the queue board to update...</p>
          )}

          <p className="queue-estimate-note">
            Estimates assume 10 minutes per patient and may change.
            This page refreshes every 10 seconds.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              trackQueue(activeQueue);
              openPage('liveBoard');
            }}
          >
            View Queue Board
          </button>
        </section>
      ) : (
        <form
          className="auth-card patient-join-form"
          onSubmit={handleJoin}
        >
          <h2>Join the Queue</h2>

          <p>
            Your queue entry will use the name on your patient account.
          </p>

          <label>
            Department
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              disabled={saving}
              required
            >
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <p className="staff-registration-note">
            You can have only one active queue entry per day,
            including appointment check-ins. Remote joining is
            available during clinic operating hours.
          </p>

          <button
            type="submit"
            className="primary-button submit-button"
            disabled={saving}
          >
            {saving ? 'Joining...' : 'Join Queue'}
          </button>
        </form>
      )}

      {!loading && !queueError && queues.length > 0 && (
        <section className="patient-queue-records">
          <h2>Today&apos;s Queue Entries</h2>

          {queues.map((queue) => (
            <article className="appointment-item" key={queue.id}>
              <h3>{queue.queue_number}</h3>
              <p>{queue.department}</p>
              <p>
                Status: <strong>{queue.status.replaceAll('_', ' ')}</strong>
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default PatientQueue;