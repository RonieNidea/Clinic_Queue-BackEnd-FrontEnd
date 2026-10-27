function AuthForm({
  page,
  form,
  handleChange,
  handleSubmit,
  openPage,
  loading,
}) {
  const isRegister = page === 'register';

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">WELCOME TO CLINICQUEUE</span>

        <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>

        <p>
          {isRegister
            ? 'Register to manage your clinic visits.'
            : 'Log in to access your clinic queue.'}
        </p>

        {isRegister && (
          <label>
            Full name
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </label>
        )}

        <label>
          Email address
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
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
            minLength={8}
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
              ? 'Create Account'
              : 'Log In'}
        </button>

        <p className="auth-switch">
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => openPage(isRegister ? 'login' : 'register')}
          >
            {isRegister ? 'Log in' : 'Register'}
          </button>
        </p>

        <button
          type="button"
          className="text-button"
          onClick={() => openPage('home')}
        >
          Back to Home
        </button>
      </form>
    </main>
  );
}

export default AuthForm;