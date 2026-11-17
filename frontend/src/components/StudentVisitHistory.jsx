import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api'; 
import VisitSlipButton from './VisitSlipButton';

function StudentVisitHistory({ token, visitId, onClose }) {
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError('');

      try {
        const data = await apiRequest(
          `/staff/visits/${visitId}/history?page=${page}`,
          { token }
        );

        if (!cancelled) {
          setPatient(data.patient);
          setVisits(data.visits.data);
          setLastPage(data.visits.last_page);
        }
      } catch (err) {
        if (!cancelled) {
          setPatient(null);
          setVisits([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [token, visitId, page, refresh]);

  return (
    <main className="history-page">
      <div className="history-toolbar">
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
        >
          Back to Records
        </button>

        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </div>

      <div className="section-heading">
        <span className="eyebrow">STUDENT VISIT HISTORY</span>
        <h1>{patient?.name || 'Visit History'}</h1>

        {patient && (
          <p>
            Student number: {patient.student_number || 'Not recorded'}
          </p>
        )}
      </div>

      {loading ? (
        <p role="status">Loading visit history...</p>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
        </div>
      ) : (
        <>
          {patient && !patient.account_linked && (
            <p className="history-note">
              This walk-in record is not linked to a patient account.
              Only the selected visit is shown.
            </p>
          )}

          <div className="visit-summary-list">
            {visits.map((visit) => (
              <article className="visit-summary-card" key={visit.id}>
                <div className="visit-summary-heading">
                  <div>
                    <span className="eyebrow">VISIT #{visit.id}</span>
                    <h2>{visit.service}</h2>
                  </div>

                  <span className="history-status recorded">
                    {visit.status}
                  </span>
                </div>

                <p><strong>Date:</strong> {visit.visit_date}</p>
                <p><strong>Department:</strong> {visit.department}</p>

                {[
                  ['Reason for Visit', visit.reason],
                  ['Visit Summary', visit.summary],
                  ['Care Given', visit.care_given],
                  ['Health Notes', visit.health_notes],
                ].map(([label, value]) => (
                  <section className="visit-summary-section" key={label}>
                    <h3>{label}</h3>
                    <p>{value?.trim() || 'Not recorded'}</p>
                  </section>
                ))}
                
                {visit.status === 'completed' && (
                  <VisitSlipButton
                    token={token}
                    visitId={visit.id}
                  />
                )}
              </article>
            ))}
          </div>

          {visits.length === 0 && (
            <p>No visit records to display.</p>
          )}

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

export default StudentVisitHistory;