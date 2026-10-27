import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

const departments = [
  'General Medicine',
  'Nursing Assistance',
  'Basic First Aid',
  'Health Assessment',
];

function Reception({ token }) {
  const [patientName, setPatientName] = useState('');
  const [department, setDepartment] = useState(departments[0]);
  const [queues, setQueues] = useState([]);
  const [registered, setRegistered] = useState(null);
  const [search, setSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const submitting = useRef(false);
  const nameInput = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQueues() {
      setLoading(true);
      setListError('');

      try {
        const data = await apiRequest('/reception/queues', { token });

        if (!cancelled) {
          setQueues(data.queues);
        }
      } catch (err) {
        if (!cancelled) {
          setListError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQueues();

    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting.current) return;

    submitting.current = true;
    setSaving(true);
    setError('');
    setRegistered(null);

    try {
      const data = await apiRequest('/reception/walk-ins', {
        method: 'POST',
        token,
        body: JSON.stringify({
          patient_name: patientName.trim(),
          department,
        }),
      });

      setRegistered(data.queue);
      setPatientName('');
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const searchTerm = search.trim().toLowerCase();

  const visibleQueues = queues.filter((queue) =>
    [
      queue.queue_number,
      queue.patient_name,
      queue.department,
      queue.status,
    ].some((value) =>
      (value || '').toLowerCase().includes(searchTerm)
    )
  );

  return (
    <main className="reception-page">
      <div className="section-heading">
        <span className="eyebrow">CLINIC RECEPTION</span>
        <h1>Walk-in Registration</h1>
        <p>
          Register a patient, select their department, and issue
          their queue number.
        </p>
      </div>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {registered && (
        <section className="reception-ticket" role="status">
          <span className="eyebrow">PATIENT REGISTERED</span>
          <h2>{registered.queue_number}</h2>
          <p><strong>{registered.patient_name}</strong></p>
          <p>{registered.department}</p>
          <p>Queue date: {registered.queue_date}</p>
          <p>
            Please give this number to the patient and direct them
            to the selected department.
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setRegistered(null);
              nameInput.current?.focus();
            }}
          >
            Register Next Patient
          </button>
        </section>
      )}

      <div className="reception-layout">
        <form
          className="auth-card reception-form"
          onSubmit={handleSubmit}
        >
          <h2>Patient Details</h2>

          <label>
            Patient full name
            <input
              ref={nameInput}
              type="text"
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              maxLength={255}
              autoComplete="off"
              disabled={saving}
              required
            />
          </label>

          <label>
            Department
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              disabled={saving}
              required
            >
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <p className="staff-registration-note">
            The patient does not need an online account.
            Check the selected department before registering.
          </p>

          <button
            type="submit"
            className="primary-button submit-button"
            disabled={saving}
          >
            {saving ? 'Registering...' : 'Register and Get Queue Number'}
          </button>
        </form>

        <section className="my-appointments">
          <div className="appointment-list-heading">
            <h2>Today&apos;s Queue</h2>

            <button
              type="button"
              className="secondary-button"
              disabled={loading || saving}
              onClick={() => setRefresh((value) => value + 1)}
            >
              Refresh
            </button>
          </div>

          <label className="staff-search">
            Search registrations
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Number, patient, department, or status"
            />
          </label>

          {loading ? (
            <p role="status">Loading today&apos;s queue...</p>
          ) : listError ? (
            <p className="appointment-error" role="alert">
              {listError}
            </p>
          ) : visibleQueues.length === 0 ? (
            <p>
              {searchTerm
                ? 'No registrations match your search.'
                : 'No patients have joined today’s queue yet.'}
            </p>
          ) : (
            visibleQueues.map((queue) => (
              <article className="appointment-item" key={queue.id}>
                <span className={`reception-status ${queue.status}`}>
                  {queue.status}
                </span>

                <h3>{queue.queue_number}</h3>
                <p><strong>{queue.patient_name}</strong></p>
                <p>{queue.department}</p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

export default Reception;