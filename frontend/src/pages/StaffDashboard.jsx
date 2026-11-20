import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

const departments = [
  'General Medicine',
  'Nursing Assistance',
  'Basic First Aid',
  'Health Assessment',
];

const cards = [
  ['total', 'Total Queue Entries'],
  ['waiting', 'Waiting'],
  ['serving', 'Now Serving'],
  ['completed', 'Served'],
  ['cancelled', 'Cancelled'],
  ['no_show', 'No-shows'],
];

function StaffDashboard({ token, user }) {
  const isAdmin = user.role === 'admin';

  const [department, setDepartment] = useState(
    isAdmin ? 'all' : user.department
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let running = false;

    setLoading(true);
    setData(null);
    setError('');

    async function loadStats() {
      if (running) return;
      running = true;

      try {
        const query = new URLSearchParams({ department });

        const result = await apiRequest(
          `/staff/dashboard?${query}`,
          { token }
        );

        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err.message);
        }
      } finally {
        running = false;

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();

    const timer = window.setInterval(loadStats, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, department, refresh]);

    const hourlyActivity = data?.hourly_activity || [];

  const highestCount = Math.max(
    0,
    ...hourlyActivity.map((item) => item.count)
  );

  const busiestHours = highestCount > 0
    ? hourlyActivity
        .filter((item) => item.count === highestCount)
        .map((item) => item.label)
    : [];

  return (
    <main className="staff-dashboard-page">
      <div className="section-heading">
        <span className="eyebrow">CLINIC OVERVIEW</span>
        <h1>Staff Dashboard</h1>
        <p>Today&apos;s queue activity, updated every 30 seconds.</p>
      </div>

      <div className="history-toolbar">
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

        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p role="status">Loading today&apos;s statistics...</p>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : data && (
        <>
          <p className="history-note">
            Queue date: {data.date} · Philippine time
          </p>

          <div className="dashboard-stat-grid">
            {cards.map(([key, label]) => (
              <article
                className={`dashboard-stat-card stat-${key}`}
                key={key}
              >
                <h2>{label}</h2>
                <p>{data.stats[key]}</p>
              </article>
            ))}
          </div>

                    <section className="busiest-hours-panel">
            <h2>Busiest Hours</h2>

            <p className="history-note">
              Queue entries grouped by the hour they joined today.
              Each label marks the start of a one-hour period.
              Times use Philippine time.
            </p>

            {highestCount === 0 ? (
              <p>No queue activity to chart yet today.</p>
            ) : (
              <>
                <p>
                  <strong>
                    {busiestHours.length === 1
                      ? 'Busiest hour: '
                      : 'Busiest hours: '}
                  </strong>

                  {busiestHours.join(', ')}
                  {' — '}
                  {highestCount} queue
                  {highestCount === 1 ? ' entry' : ' entries'}
                  {busiestHours.length > 1 ? ' each' : ''}
                </p>

                <div
                  className="hourly-chart-scroll"
                  role="region"
                  aria-label="Hourly queue activity"
                  tabIndex={0}
                >
                  <ul className="hourly-chart">
                    {hourlyActivity.map((item) => (
                      <li
                        className="hourly-chart-column"
                        key={item.hour}
                        aria-label={
                          `${item.label}: ${item.count} queue entries`
                        }
                        title={`${item.label}: ${item.count} queue entries`}
                      >
                        <span
                          className="hourly-chart-count"
                          aria-hidden="true"
                        >
                          {item.count}
                        </span>

                        <div
                          className="hourly-chart-track"
                          aria-hidden="true"
                        >
                          <span
                            className={
                              'hourly-chart-bar' +
                              (item.count === highestCount
                                ? ' peak-hour'
                                : '')
                            }
                            style={{
                              height: `${(item.count / highestCount) * 100}%`,
                            }}
                          />
                        </div>

                        <span
                          className="hourly-chart-label"
                          aria-hidden="true"
                        >
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </section>

          {data.stats.total === 0 && (
            <section className="history-empty">
              <h2>No queue entries yet today</h2>
              <p>
                Statistics will appear as patients join the queue
                or check in for appointments.
              </p>
            </section>
          )}

          <p className="history-note">
            These totals count queue entries, not unique patients.
            Appointments without a queue check-in are not included.
          </p>
        </>
      )}
    </main>
  );
}

export default StaffDashboard;