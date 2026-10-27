import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

const STORAGE_KEY = 'clinicqueueweb_tracked_queue';

function readSavedQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function LiveQueueBoard() {
  const [board, setBoard] = useState(null);
  const [tracked, setTracked] = useState(readSavedQueue);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadBoard() {
      if (inFlight.current) return;

      inFlight.current = true;

      try {
        const data = await apiRequest('/queues/live-board', {
          signal: controller.signal,
        });

        if (!cancelled) {
          setBoard(data);
          setError('');
          setUpdatedAt(new Date());
        }
      } catch {
        if (!cancelled) {
          setError(
            'The queue board could not be updated. Displayed numbers may be outdated.'
          );
        }
      } finally {
        inFlight.current = false;

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBoard();

    const timer = window.setInterval(loadBoard, 10000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadBoard();
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
  }, [refresh]);

  function trackNumber(department, number) {
    const selection = {
      date: board.date,
      department,
      number,
    };

    setTracked(selection);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  }

  function clearTracking() {
    setTracked(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const trackedDepartment =
    board && tracked?.date === board.date
      ? board.departments.find(
          (item) => item.department === tracked.department
        )
      : null;

  const waitingIndex = trackedDepartment
    ? trackedDepartment.waiting_numbers.indexOf(tracked.number)
    : -1;

  const isServing =
    trackedDepartment?.now_serving === tracked?.number &&
    Boolean(trackedDepartment);

  const peopleAhead =
    waitingIndex >= 0
      ? waitingIndex + (trackedDepartment.now_serving ? 1 : 0)
      : null;

  const estimatedMinutes =
    peopleAhead === null
      ? null
      : peopleAhead * board.average_service_minutes;

  const nearlyUp =
    !error &&
    waitingIndex >= 0 &&
    peopleAhead <= 2;

  return (
    <main className="live-board-page">
      <div className="section-heading">
        <span className="eyebrow">TODAY AT THE CLINIC</span>
        <h1>Live Queue Board</h1>
        <p>
          Select the queue number issued to you to follow your place.
          The board updates every 10 seconds.
        </p>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh Board
        </button>
      </div>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {loading && <p role="status">Loading queue board...</p>}

      {board && tracked && (
        <section className="tracked-queue">
          <span className="eyebrow">YOUR SELECTED NUMBER</span>
          <h2>{tracked.number}</h2>
          <p>{tracked.department}</p>

          {tracked.date !== board.date ? (
            <p>This number belongs to a previous day. Select today’s number.</p>
          ) : isServing ? (
            <p role="status">
              <strong>
                Your number is now being served. Please go to your department.
              </strong>
            </p>
          ) : waitingIndex >= 0 ? (
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

              {nearlyUp && (
                <p className="near-turn-notice" role="status">
                  Your turn is nearly up. Please stay near the department.
                </p>
              )}
            </>
          ) : (
            <p>
              This number is no longer in the active queue.
              Check with reception for its status.
            </p>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={clearTracking}
          >
            Stop Tracking
          </button>
        </section>
      )}

      {board && (
        <>
          <p className="queue-estimate-note">
            Wait times use an assumed 10 minutes per patient, including
            any patient currently being served. Actual waiting times vary.
            Near-turn notices appear only while this page is open.
          </p>

          <div className="live-board-grid">
            {board.departments.map((department) => (
              <section
                className="department-board"
                key={department.department}
              >
                <h2>{department.department}</h2>

                <div className="now-serving">
                  <span>NOW SERVING</span>
                  <strong>
                    {department.now_serving || '—'}
                  </strong>

                  {department.now_serving && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        trackNumber(
                          department.department,
                          department.now_serving
                        )
                      }
                    >
                      Track This Number
                    </button>
                  )}
                </div>

                <h3>
                  Waiting: {department.waiting_numbers.length}
                </h3>

                {department.waiting_numbers.length === 0 ? (
                  <p>No patients waiting.</p>
                ) : (
                  <div className="waiting-number-list">
                    {department.waiting_numbers.map((number) => (
                      <button
                        key={number}
                        type="button"
                        className={
                          'secondary-button' +
                          (tracked?.date === board.date &&
                          tracked?.number === number
                            ? ' tracked-number'
                            : '')
                        }
                        onClick={() =>
                          trackNumber(department.department, number)
                        }
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {updatedAt && (
            <p className="queue-estimate-note">
              Last updated:{' '}
              {updatedAt.toLocaleTimeString('en-PH', {
                timeZone: 'Asia/Manila',
              })}
              {' · Philippine time'}
            </p>
          )}
        </>
      )}
    </main>
  );
}

export default LiveQueueBoard;