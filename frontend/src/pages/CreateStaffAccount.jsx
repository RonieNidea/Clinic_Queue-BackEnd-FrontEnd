import { useState } from 'react';
import { apiRequest } from '../services/api';

const emptyForm = {
  name: '',
  email: '',
  role: 'staff',
  department: 'General Medicine',
  password: '',
  password_confirmation: '',
};

const departments = [
  'General Medicine',
  'Nursing Assistance',
  'Basic First Aid',
  'Health Assessment',
];

function CreateStaffAccount({ token }) {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');
    setCreated(null);

    try {
      const data = await apiRequest('/admin/staff', {
        method: 'POST',
        token,
        body: JSON.stringify(form),
      });

      setCreated(data);
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="staff-approvals-page">
      <div className="section-heading">
        <span className="eyebrow">ADMINISTRATION</span>
        <h1>Create Staff Account</h1>
        <p>Register a staff member and assign their department.</p>
      </div>

      {created && (
        <section className="booking-confirmation" role="status">
          <h2>Staff Account Created</h2>
          <p>{created.message}</p>
          <p><strong>Name:</strong> {created.staff.name}</p>
          <p><strong>Email:</strong> {created.staff.email}</p>
                    <p>
            <strong>Staff type:</strong>{' '}
            {created.staff.role === 'reception'
              ? 'Reception Staff'
              : 'Department Staff'}
          </p>

          {created.staff.department && (
            <p>
              <strong>Department:</strong> {created.staff.department}
            </p>
          )}
        </section>
      )}

      <form className="auth-card invitation-form" onSubmit={handleSubmit}>
        <h2>Staff Details</h2>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        <label>
          Full name
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            maxLength={255}
            autoComplete="off"
            disabled={saving}
            required
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            maxLength={255}
            autoComplete="off"
            disabled={saving}
            required
          />
        </label>

                <label>
          Staff type
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            disabled={saving}
            required
          >
            <option value="staff">Department Staff</option>
            <option value="reception">Reception Staff</option>
          </select>
        </label>

        {form.role === 'staff' ? (
          <label>
            Department
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              disabled={saving}
              required
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="staff-registration-note">
            Reception staff register walk-in patients and select
            the department they need to visit. No department
            assignment is required for this account.
          </p>
        )}

        <label>
          Initial password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            autoComplete="new-password"
            disabled={saving}
            required
          />
        </label>

        <label>
          Confirm password
          <input
            type="password"
            name="password_confirmation"
            value={form.password_confirmation}
            onChange={handleChange}
            minLength={8}
            autoComplete="new-password"
            disabled={saving}
            required
          />
        </label>

        <p className="staff-registration-note">
          This account will be approved immediately.
          Share the login details privately with the staff member.
        </p>

        <button
          type="submit"
          className="primary-button submit-button"
          disabled={saving}
        >
          {saving ? 'Creating...' : 'Create Staff Account'}
        </button>
      </form>
    </main>
  );
}

export default CreateStaffAccount;