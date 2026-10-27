function AuthForm({
  page,
  form,
  handleChange,
  handleSubmit,
  openPage,
  loading,
}) {
  const isRegister = page === 'register';
  const isStaff = form.account_type === 'staff';

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">WELCOME TO CLINICQUEUE</span>

        <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>

        <p>
          {isRegister
            ? 'Register as a patient or apply for a department staff account.'
            : 'Log in to access your ClinicQueue account.'}
        </p>

        {isRegister && (
          <>

            {isStaff && (
              <>
                <label>
                  Department
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  >
                    <option value="">Select your department</option>
                    <option value="General Medicine">
                      General Medicine
                    </option>
                    <option value="Nursing Assistance">
                      Nursing Assistance
                    </option>
                    <option value="Basic First Aid">
                      Basic First Aid
                    </option>
                    <option value="Health Assessment">
                      Health Assessment
                    </option>
                  </select>
                </label>

                <p className="staff-registration-note">
                  Staff accounts require administrator approval.
                  You can log in after your application is approved.
                </p>
              </>
            )}

            <label>
              Full name
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                maxLength={255}
                disabled={loading}
                required
              />
            </label>
          </>
        )}

        <label>
          Email address
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            maxLength={255}
            disabled={loading}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
            disabled={loading}
            required
          />
        </label>

        {isRegister && (
          <label>
            Confirm password
            <input
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              disabled={loading}
              required
            />
          </label>
        )}

        <button
          type="submit"
          className="primary-button submit-button"
          disabled={loading}
        >
          {loading
            ? 'Please wait...'
            : isRegister
              ? isStaff
                ? 'Submit Staff Registration'
                : 'Create Account'
              : 'Log In'}
        </button>

        <p className="auth-switch">
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <button
            type="button"
            disabled={loading}
            onClick={() => openPage(isRegister ? 'login' : 'register')}
          >
            {isRegister ? 'Log in' : 'Register'}
          </button>
        </p>

        <button
          type="button"
          className="text-button"
          disabled={loading}
          onClick={() => openPage('home')}
        >
          Back to Home
        </button>
      </form>
    </main>
  );
}

export default AuthForm;