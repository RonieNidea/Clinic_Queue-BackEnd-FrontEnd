import { useState } from 'react';
import { apiRequest } from '../services/api';

const fields = [
  ['patient_name', 'Patient name'],
  ['student_number', 'Student number'],
  ['department', 'Department'],
  ['service', 'Service'],
  ['visit_date', 'Visit date'],
  ['reason', 'Reason for visit'],
  ['summary', 'Visit summary'],
  ['care_given', 'Care given'],
  ['health_notes', 'Health notes'],
  ['other', 'Other details'],
];

function VisitReportForm({ token, visitId }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState('summary');
  const [details, setDetails] = useState('');
  const [correction, setCorrection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError('');

    if (!details.trim()) {
      setError('Please explain which details are incorrect.');
      return;
    }

    setSaving(true);

    try {
      const data = await apiRequest(
        `/staff/visits/${visitId}/reports`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({
            field,
            details: details.trim(),
            suggested_correction: correction.trim(),
          }),
        }
      );

      setMessage(`${data.message} Report reference: #${data.report.id}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="visit-report-section">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setOpen(true);
            setMessage('');
            setError('');
            setDetails('');
            setCorrection('');
          }}
        >
          Report Incorrect Details
        </button>
      </div>
    );
  }

  return (
    <section className="visit-report-section">
      <h3>Report Incorrect Details</h3>

      {message ? (
        <>
          <p className="report-success" role="status">
            {message}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </>
      ) : (
        <form className="visit-report-form" onSubmit={handleSubmit}>
          <p>
            Describe the issue for review. Submitting a report
            does not change the original visit record.
          </p>

          <label>
            Which detail is incorrect?
            <select
              value={field}
              onChange={(event) => setField(event.target.value)}
              disabled={saving}
              required
            >
              {fields.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Explain the issue
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={saving}
              required
            />
          </label>

          <label>
            Suggested correction (optional)
            <textarea
              value={correction}
              onChange={(event) => setCorrection(event.target.value)}
              maxLength={2000}
              rows={3}
              disabled={saving}
            />
          </label>

          {error && (
            <p className="appointment-error" role="alert">
              {error}
            </p>
          )}

          <div className="record-visit-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default VisitReportForm;