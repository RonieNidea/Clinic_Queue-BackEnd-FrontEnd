import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

const emptyForm = {
  student_number: '',
  service: '',
  reason: '',
  summary: '',
  care_given: '',
  health_notes: '',
};

function RecordVisit({ token, openPage }) {
  const [queues, setQueues] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPatients() {
      setLoading(true);
      setLoadError('');

      try {
        const data = await apiRequest('/staff/visit-candidates', {
          token,
        });

        if (!cancelled) {
          setQueues(data.queues);
        }
      } catch (err) {
        if (!cancelled) {
          setQueues([]);
          setLoadError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPatients();

    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  const selectedQueue = queues.find(
    (queue) => String(queue.id) === selectedId
  );

  function handlePatientChange(event) {
    const id = event.target.value;
    const queue = queues.find((item) => String(item.id) === id);
    const draft = queue?.visit;

    setSelectedId(id);
    setError('');
    setMessage('');

    setForm({
      student_number: draft?.student_number || '',
      service:
        draft?.service ||
        (queue?.department === 'General Medicine'
          ? 'General Consultation'
          : queue?.department || ''),
      reason: draft?.reason || '',
      summary: draft?.summary || '',
      care_given: draft?.care_given || '',
      health_notes: draft?.health_notes || '',
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || !selectedQueue) return;

    const status =
      event.nativeEvent.submitter?.value === 'completed'
        ? 'completed'
        : 'draft';

    setError('');
    setMessage('');

    if (
      status === 'completed' &&
      (!form.summary.trim() || !form.care_given.trim())
    ) {
      setError('Enter the visit summary and care given before completing.');
      return;
    }

    if (
      status === 'completed' &&
      !window.confirm(
        'Complete this visit? It will become visible to the linked patient account and cannot be overwritten from this form.'
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const data = await apiRequest('/staff/visits', {
        method: 'POST',
        token,
        body: JSON.stringify({
          queue_entry_id: selectedQueue.id,
          ...form,
          status,
        }),
      });

      setMessage(data.message);
      setSelectedId('');
      setForm({ ...emptyForm });
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">CLINIC STAFF</span>
        <h1>Record a Visit</h1>
        <p>
          Select a patient from today&apos;s queue and record the
          visit details.
        </p>

        <button
          type="button"
          className="secondary-button"
          disabled={saving}
          onClick={() => openPage('staffRecords')}
        >
          View Visit Records
        </button>
      </div>

      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}

      {loading ? (
        <p role="status">Loading today&apos;s patients...</p>
      ) : loadError ? (
        <section className="history-empty">
          <p role="alert">{loadError}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Try Again
          </button>
        </section>
      ) : queues.length === 0 ? (
        <section className="history-empty">
          <h2>No patients need a visit record</h2>
          <p>
            Register a walk-in patient, join the queue through a patient
            account, or check in for an appointment first.
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh Patients
          </button>
        </section>
      ) : (
        <form
          className="auth-card record-visit-form"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}

          <fieldset disabled={saving}>
            <label>
              Patient
              <select
                value={selectedId}
                onChange={handlePatientChange}
                required
              >
                <option value="">Select a patient</option>

                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.queue_number} — {queue.patient_name}
                    {' — '}{queue.department}
                    {queue.visit ? ' — Saved draft' : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedQueue && (
              <>
                <div className="staff-registration-note">
                  <p>
                    <strong>Department:</strong>{' '}
                    {selectedQueue.department}
                  </p>
                  <p>
                    <strong>Visit date:</strong>{' '}
                    {selectedQueue.queue_date}
                  </p>
                  <p>
                    {selectedQueue.user_id
                      ? 'This record is linked to the patient’s account.'
                      : 'This walk-in has no linked patient account.'}
                  </p>
                </div>

                <label>
                  Student number (optional)
                  <input
                    type="text"
                    name="student_number"
                    value={form.student_number}
                    onChange={handleChange}
                    maxLength={100}
                  />
                </label>

                <label>
                  Service provided
                  <input
                    type="text"
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    maxLength={255}
                    required
                  />
                </label>

                {[
                  ['reason', 'Reason for visit', 2000],
                  ['summary', 'Visit summary', 10000],
                  ['care_given', 'Care given', 10000],
                  ['health_notes', 'Health notes for the patient', 10000],
                ].map(([name, label, limit]) => (
                  <label key={name}>
                    {label}
                    <textarea
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      maxLength={limit}
                      rows={4}
                    />
                  </label>
                ))}

                <p className="staff-registration-note">
                  Drafts are visible to authorized staff only.
                  Completing publishes the summary, care given, and
                  health notes to the linked patient account.
                  Summary and care given are required to complete.
                </p>

                <div className="record-visit-actions">
                  <button
                    type="submit"
                    value="draft"
                    className="secondary-button"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>

                  <button
                    type="submit"
                    value="completed"
                    className="primary-button"
                  >
                    {saving ? 'Saving...' : 'Complete Visit'}
                  </button>
                </div>
              </>
            )}
          </fieldset>
        </form>
      )}
    </main>
  );
}

export default RecordVisit;