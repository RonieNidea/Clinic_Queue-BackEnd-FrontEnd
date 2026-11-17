import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import StudentVisitHistory from '../components/StudentVisitHistory';

function StaffRecords({ token }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [visits, setVisits] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [date, setDate] = useState('');
  const [service, setService] = useState('');
  const [status, setStatus] = useState('');
  const [services, setServices] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [filters, setFilters] = useState({
    visit_date: '',
    service: '',
    status: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError('');

      try {
        const parameters = new URLSearchParams({
          search: query,
          page: String(page),
          visit_date: filters.visit_date,
          service: filters.service,
          status: filters.status,
        });

        const data = await apiRequest(
          `/staff/visits?${parameters}`,
          { token }
        );

        if (!cancelled) {
          setVisits(data.visits.data);
          setLastPage(data.visits.last_page);
          setTotal(data.visits.total);
          setServices(data.services || []);
        }
      } catch (err) {
        if (!cancelled) {
          setVisits([]);
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
  }, [token, query, page, refresh, filters]);

  function handleSearch(event) {
    event.preventDefault();

    setPage(1);
    setQuery(search.trim());
    setFilters({
      visit_date: date,
      service,
      status,
    });
    setRefresh((value) => value + 1);
  }

  function clearSearch() {
    setSearch('');
    setQuery('');
    setDate('');
    setService('');
    setStatus('');
    setPage(1);
    setFilters({
      visit_date: '',
      service: '',
      status: '',
    });
    setRefresh((value) => value + 1);
  }

    if (selectedVisit !== null) {
    return (
      <StudentVisitHistory
        key={selectedVisit}
        token={token}
        visitId={selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />
    );
  }

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">DEPARTMENT RECORDS</span>
        <h1>Visit Records</h1>
        <p>Search visit records by student name or student number.</p>
      </div>

      <form className="records-search-form" onSubmit={handleSearch}>
        <label className="staff-search">
          Student name or number
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={100}
            placeholder="Enter a name or student number"
          />
        </label>

        <label className="records-filter">
          Visit date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <label className="records-filter">
          Service
          <select
            value={service}
            onChange={(event) => setService(event.target.value)}
          >
            <option value="">All services</option>

            {services.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="records-filter">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <button
          type="submit"
          className="primary-button"
          disabled={loading}
        >
          Apply Filters
        </button>

        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={clearSearch}
        >
          Clear
        </button>
      </form>

      {loading ? (
        <p role="status">Loading visit records...</p>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : visits.length === 0 ? (
        <div className="history-empty">
          <h2>No matching records</h2>
          <p>
            {query || Object.values(filters).some(Boolean)
              ? 'Try changing the search or filters.'
              : 'Visit records will appear after staff save them.'}
          </p>
        </div>
      ) : (
        <>
          <p className="history-count">{total} matching record(s)</p>

          <div
            className="history-table-wrapper"
            role="region"
            aria-label="Visit records table"
            tabIndex={0}
          >
            <table className="history-table">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Student</th>
                  <th scope="col">Student Number</th>
                  <th scope="col">Department</th>
                  <th scope="col">Service</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>#{visit.id}</td>
                    <td>{visit.patient_name}</td>
                    <td>{visit.student_number || 'Not recorded'}</td>
                    <td>{visit.department}</td>
                    <td>{visit.service}</td>
                    <td>{visit.visit_date}</td>
                    <td>
                      <span className="history-status recorded">
                        {visit.status}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setSelectedVisit(visit.id)}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="visit-summary-pagination">
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
          </div>
        </>
      )}
    </main>
  );
}

export default StaffRecords;