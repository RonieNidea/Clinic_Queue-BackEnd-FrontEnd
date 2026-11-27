import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

const emptyForm = { title: '', category: 'Clinic update', content: '' };

function ManageAnnouncements({ token }) {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const busy = useRef(false);
  const editor = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      setLoading(true);
      setListError('');

      try {
        const data = await apiRequest(`/admin/announcements?page=${page}`, { token });

        if (!cancelled) {
          if (page > data.announcements.last_page) {
            setPage(data.announcements.last_page);
          } else {
            setAnnouncements(data.announcements.data);
            setLastPage(data.announcements.last_page);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAnnouncements([]);
          setListError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnnouncements();
    return () => { cancelled = true; };
  }, [token, page, refresh]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function editAnnouncement(announcement) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      category: announcement.category,
      content: announcement.content,
    });
    setError('');
    setMessage('');
    editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current) return;

    const publish = event.nativeEvent.submitter?.value === 'publish';
    busy.current = true;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(
        editingId === null ? '/admin/announcements' : `/admin/announcements/${editingId}`,
        {
          method: editingId === null ? 'POST' : 'PATCH',
          token,
          body: JSON.stringify({
            title: form.title.trim(),
            category: form.category.trim() || null,
            content: form.content.trim(),
            is_published: publish,
          }),
        }
      );

      setMessage(data.message);
      resetForm();
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function updateAnnouncement(announcement, remove = false) {
    if (busy.current) return;
    if (remove && !window.confirm(`Delete "${announcement.title}"? This cannot be undone.`)) return;

    busy.current = true;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(`/admin/announcements/${announcement.id}`, {
        method: remove ? 'DELETE' : 'PATCH',
        token,
        ...(remove ? {} : {
          body: JSON.stringify({ is_published: !announcement.is_published }),
        }),
      });

      setMessage(data.message);
      if (remove && editingId === announcement.id) resetForm();
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>Announcements</h1>
        <p>Publish clinic updates for everyone visiting the homepage.</p>
      </div>

      {message && <div className="notice success" role="status">{message}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}

      <form className="auth-card announcement-editor" ref={editor} onSubmit={handleSubmit}>
        <h2>{editingId === null ? 'Create Announcement' : 'Edit Announcement'}</h2>
        <fieldset disabled={saving}>
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              maxLength={180}
              placeholder="For example: Clinic hours during examinations"
              required
            />
          </label>
          <label>
            Category
            <input
              type="text"
              value={form.category}
              onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))}
              maxLength={60}
              placeholder="Clinic update"
            />
          </label>
          <label>
            Announcement
            <textarea
              value={form.content}
              onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))}
              maxLength={10000}
              rows={7}
              placeholder="Write the update you want to share."
              required
            />
          </label>
          <p className="clinic-info-note">
            Publishing makes this announcement public. Saving a draft keeps it off the homepage.
          </p>
          <div className="record-visit-actions">
            <button type="submit" value="publish" className="primary-button">
              {saving ? 'Saving...' : editingId === null ? 'Publish Announcement' : 'Save & Publish'}
            </button>
            <button type="submit" value="draft" className="secondary-button">Save Draft</button>
            {editingId !== null && (
              <button type="button" className="secondary-button" onClick={resetForm}>Cancel Editing</button>
            )}
          </div>
        </fieldset>
      </form>

      <section className="staff-approval-panel" aria-labelledby="announcement-list-title">
        <div className="staff-approval-toolbar">
          <h2 id="announcement-list-title">Your Clinic Announcements</h2>
          <button
            type="button"
            className="secondary-button"
            disabled={loading || saving}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p role="status">Loading announcements...</p>
        ) : listError ? (
          <p className="appointment-error" role="alert">{listError}</p>
        ) : announcements.length === 0 ? (
          <p>No announcements yet. Write your first update above.</p>
        ) : (
          <div className="announcement-management-list">
            {announcements.map((announcement) => (
              <article className="announcement-card announcement-management-card" key={announcement.id}>
                <div className="announcement-content">
                  <span className={`staff-approval-status ${announcement.is_published ? 'approved' : 'pending'}`}>
                    {announcement.is_published ? 'Published' : 'Draft'}
                  </span>
                  <h3>{announcement.title}</h3>
                  <span className="announcement-tag">{announcement.category}</span>
                  <p className="announcement-body">{announcement.content}</p>
                </div>
                <div className="record-visit-actions">
                  <button type="button" className="secondary-button" disabled={saving} onClick={() => editAnnouncement(announcement)}>
                    Edit
                  </button>
                  <button type="button" className="secondary-button" disabled={saving} onClick={() => updateAnnouncement(announcement)}>
                    {announcement.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" className="secondary-button" disabled={saving} onClick={() => updateAnnouncement(announcement, true)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !listError && lastPage > 1 && (
          <nav className="announcement-pagination" aria-label="Manage announcement pages">
            <button type="button" className="secondary-button" disabled={saving || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {lastPage}</span>
            <button type="button" className="secondary-button" disabled={saving || page >= lastPage} onClick={() => setPage((value) => value + 1)}>Next</button>
          </nav>
        )}
      </section>
    </main>
  );
}

export default ManageAnnouncements;
