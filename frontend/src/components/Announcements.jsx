import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function publicationDate(value) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    const controller = new AbortController();

    async function loadAnnouncements(silent = false) {
      if (running) return;
      running = true;

      if (!silent) setLoading(true);

      try {
        const data = await apiRequest(`/announcements?page=${page}`, {
          signal: controller.signal,
        });

        if (!cancelled) {
          if (page > data.announcements.last_page) {
            setPage(data.announcements.last_page);
          } else {
            setAnnouncements(data.announcements.data);
            setLastPage(data.announcements.last_page);
            setError('');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAnnouncements([]);
          setError(err.message);
        }
      } finally {
        running = false;
        if (!cancelled) setLoading(false);
      }
    }

    loadAnnouncements();

    const timer = window.setInterval(() => loadAnnouncements(true), 60000);

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') loadAnnouncements(true);
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [page, refresh]);

  return (
    <section className="announcements" id="announcements">
      <div className="section-heading">
        <span className="eyebrow">STAY INFORMED</span>
        <h2>Clinic Announcements</h2>
        <p>Updates and reminders for your campus clinic visits.</p>
      </div>

      {loading ? (
        <p className="announcement-note" role="status">Loading clinic announcements...</p>
      ) : error ? (
        <div className="announcement-note notice error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Try Again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <p className="announcement-note">No announcements right now. Check back for clinic updates.</p>
      ) : (
        <div className="announcement-list">
          {announcements.map((announcement) => (
            <article className="announcement-card" key={announcement.id}>
              <div className="announcement-content">
                <span className="announcement-tag">{announcement.category}</span>
                <h3>{announcement.title}</h3>
                <time dateTime={announcement.published_at} className="announcement-published-date">
                  {publicationDate(announcement.published_at)}
                </time>
                <p className="announcement-body">{announcement.content}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && lastPage > 1 && (
        <nav className="announcement-pagination" aria-label="Announcement pages">
          <button
            type="button"
            className="secondary-button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {lastPage}</span>
          <button
            type="button"
            className="secondary-button"
            disabled={page >= lastPage}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

export default Announcements;
