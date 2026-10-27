import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

function StaffApprovals({ token }) {
  const [staff, setStaff] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff() {
      setLoading(true);
      setError('');

      try {
        const data = await apiRequest('/admin/staff', { token });

        if (!cancelled) {
          setStaff(data.staff);
        }
      } catch (err) {
        if (!cancelled) {
          setStaff([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  async function reviewApplication(applicant, decision) {
    if (busy) return;

    const action = decision === 'approved' ? 'Approve' : 'Reject';

    if (
      !window.confirm(
        `${action} ${applicant.name}'s staff application for ` +
        `${applicant.department}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(`/admin/staff/${applicant.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          approval_status: decision,
        }),
      });

      setMessage(data.message);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

    const searchTerm = search.trim().toLowerCase();
    const visibleStaff = staff.filter((applicant) => {
    const matchesStatus =
      filter === 'all' || applicant.approval_status === filter;

    const matchesSearch = [
      applicant.name,
      applicant.email,
      applicant.department,
    ].some((value) =>
      (value || '').toLowerCase().includes(searchTerm)
    );

    return matchesStatus && matchesSearch;
  });

  const pendingCount = staff.filter(
    (applicant) => applicant.approval_status === 'pending'
  ).length;

  return (
    <main className="staff-approvals-page">
      <div className="section-heading">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>Staff Approvals</h1>
        <p>Review staff applications and their selected departments.</p>
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

      <section className="staff-approval-panel">
        <div className="staff-approval-toolbar">
          <h2>
            {loading ? 'Loading applications...' : `${pendingCount} pending`}
          </h2>

         <label className="staff-search">
            Search staff
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, or department"
            />
          </label>

          <label>
            Show applications
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              disabled={busy}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All staff</option>
            </select>
          </label>

          <button
            type="button"
            className="secondary-button"
            disabled={loading || busy}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p role="status">Loading staff registrations...</p>
        ) : error ? (
          <p>Use Refresh to reload the application list.</p>
        ) : visibleStaff.length === 0 ? (
        <p>
            {searchTerm
              ? 'No staff match your search in this category.'
              : 'No applications in this category.'}
          </p>
        ) : (
          <div className="staff-application-list">
            {visibleStaff.map((applicant) => (
              <article
                className="staff-application-card"
                key={applicant.id}
              >
                <div>
                  <span
                    className={`staff-approval-status ${applicant.approval_status}`}
                  >
                    {applicant.approval_status}
                  </span>

                  <h3>{applicant.name}</h3>
                  <p>{applicant.email}</p>
                  <p>
                  <strong>Assignment:</strong>{' '}
                    {applicant.role === 'reception'
                      ? 'Reception Staff'
                      : applicant.department}
                  </p>
                </div>

                {applicant.approval_status === 'pending' && (
                  <div className="staff-approval-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={busy}
                      onClick={() =>
                        reviewApplication(applicant, 'approved')
                      }
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      className="secondary-button staff-reject-button"
                      disabled={busy}
                      onClick={() =>
                        reviewApplication(applicant, 'rejected')
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default StaffApprovals;