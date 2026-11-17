import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import VisitRatingForm from '../components/VisitRatingForm';

function VisitSummaries({ token }) {
  const [visits, setVisits] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaries() {
      setLoading(true);
      setError('');

      try {
        const data = await apiRequest(
          `/patient/visit-summaries?page=${page}`,
          { token }
        );

        if (!cancelled) {
          setVisits(data.visits.data);
          setLastPage(data.visits.last_page);
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

    loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [token, page, refresh]);

  function handleRatingSaved(visitId, rating) {
    setVisits((previous) =>
      previous.map((visit) =>
        visit.id === visitId
          ? { ...visit, rating }
          : visit
      )
    );
  }

  return (
    <main className="visit-summaries-page">
      <div className="section-heading">
        <span className="eyebrow">YOUR CLINIC RECORDS</span>
        <h1>Visit Summaries</h1>

        <p>
          Read the summaries and care recorded for your completed
          clinic visits.
        </p>

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
        <p role="status">Loading your visit summaries...</p>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : visits.length === 0 ? (
        <section className="visit-summary-empty">
          <h2>No visit summaries yet</h2>
          <p>
            Your summaries will appear here after clinic staff
            complete and save your visit records.
          </p>
        </section>
      ) : (
        <>
          <div className="visit-summary-list">
            {visits.map((visit) => (
              <article className="visit-summary-card" key={visit.id}>
                <div className="visit-summary-heading">
                  <div>
                    <span className="eyebrow">
                      VISIT #{visit.id}
                    </span>
                    <h2>{visit.service}</h2>
                  </div>

                  <span className="visit-completed-label">
                    Completed
                  </span>
                </div>

                <p>
                  <strong>Date:</strong> {visit.visit_date}
                </p>

                <p>
                  <strong>Department:</strong> {visit.department}
                </p>

                <div className="visit-summary-section">
                  <h3>Visit Summary</h3>
                  <p>
                    {visit.summary?.trim() ||
                      'No summary was provided for this visit.'}
                  </p>
                </div>

                <div className="visit-summary-section">
                  <h3>Care Given</h3>
                  <p>
                    {visit.care_given?.trim() ||
                      'No care details were provided for this visit.'}
                  </p>
                </div>

                <div className="visit-summary-section health-notes-section">
                  <h3>Health Notes</h3>
                  <p>
                    {visit.health_notes?.trim() ||
                      'No health notes were added for this visit.'}
                  </p>
                </div>

                <VisitRatingForm
                  visit={visit}
                  token={token}
                  onSaved={(rating) =>
                    handleRatingSaved(visit.id, rating)
                  }
                />
              </article>
            ))}
          </div>

          <div className="visit-summary-pagination">
            <button
              type="button"
              className="secondary-button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>

            <span>Page {page} of {lastPage}</span>

            <button
              type="button"
              className="secondary-button"
              disabled={page >= lastPage || loading}
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

export default VisitSummaries;