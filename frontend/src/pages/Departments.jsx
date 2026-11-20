import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../services/api';

const emptyForm = {
  name: '',
  service_name: '',
  fee: '',
  is_active: true,
};

function formatFee(value) {
  if (value === null) return 'Confirm with clinic';
  if (Number(value) === 0) return 'Free';

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(value));
}

function Departments({ token }) {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  const submitting = useRef(false);
  const formElement = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments() {
      setLoading(true);
      setListError('');

      try {
        const data = await apiRequest('/admin/departments', {
          token,
        });

        if (!cancelled) {
          setDepartments(data.departments);
        }
      } catch (err) {
        if (!cancelled) {
          setDepartments([]);
          setListError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function editDepartment(department) {
    setEditingId(department.id);
    setForm({
      name: department.name,
      service_name: department.service_name,
      fee: department.fee ?? '',
      is_active: department.is_active,
    });
    setError('');
    setMessage('');

    formElement.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting.current) return;

    submitting.current = true;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(
        editingId === null
          ? '/admin/departments'
          : `/admin/departments/${editingId}`,
        {
          method: editingId === null ? 'POST' : 'PATCH',
          token,
          body: JSON.stringify({
            name: form.name.trim(),
            service_name: form.service_name.trim(),
            fee: form.fee === '' ? null : form.fee,
            is_active: form.is_active,
          }),
        }
      );

      setMessage(data.message);
      resetForm();
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  const term = search.trim().toLowerCase();

  const visibleDepartments = departments.filter((department) =>
    [department.name, department.service_name].some((value) =>
      value.toLowerCase().includes(term)
    )
  );

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>Departments</h1>
        <p>Manage department names, services, fees, and availability.</p>
      </div>

      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}

      <form
        ref={formElement}
        className="auth-card department-editor"
        onSubmit={handleSubmit}
      >
        <h2>
          {editingId === null ? 'Create Department' : 'Edit Department'}
        </h2>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        <label>
          Department name
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            maxLength={255}
            disabled={saving}
            placeholder="For example: Dental Clinic"
            required
          />
        </label>

        <label>
          Service name
          <input
            type="text"
            name="service_name"
            value={form.service_name}
            onChange={handleChange}
            maxLength={255}
            disabled={saving}
            placeholder="For example: Dental Consultation"
            required
          />
        </label>

        <label>
          Fee (PHP)
          <input
            type="number"
            name="fee"
            value={form.fee}
            onChange={handleChange}
            min="0"
            max="99999999.99"
            step="0.01"
            disabled={saving}
            placeholder="Leave blank to confirm with clinic"
          />
        </label>

        <p className="clinic-info-note">
          Leave the fee blank for “Confirm with clinic”, or enter 0
          for a free service.
        </p>

        <label className="department-active-toggle">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
            disabled={saving}
          />
          Active department
        </label>

        <p className="clinic-info-note">
          Deactivation keeps the department and its historical records.
        </p>

        <div className="record-visit-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : editingId === null
                ? 'Create Department'
                : 'Save Changes'}
          </button>

          {editingId !== null && (
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
              onClick={() => {
                resetForm();
                setError('');
              }}
            >
              Cancel Editing
            </button>
          )}
        </div>
      </form>

      <section className="staff-approval-panel">
        <div className="staff-approval-toolbar">
          <h2>Department List</h2>

          <label className="staff-search">
            Search departments
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Department or service name"
            />
          </label>

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
          <p role="status">Loading departments...</p>
        ) : listError ? (
          <p className="appointment-error" role="alert">
            {listError}
          </p>
        ) : visibleDepartments.length === 0 ? (
          <p>No departments match your search.</p>
        ) : (
          <div className="staff-application-list">
            {visibleDepartments.map((department) => (
              <article
                className="staff-application-card"
                key={department.id}
              >
                <div>
                  <span
                    className={
                      'staff-approval-status ' +
                      (department.is_active ? 'approved' : 'rejected')
                    }
                  >
                    {department.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <h3>{department.name}</h3>
                  <p>{department.service_name}</p>
                  <p><strong>Fee:</strong> {formatFee(department.fee)}</p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={saving}
                  onClick={() => editDepartment(department)}
                >
                  Edit
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Departments;