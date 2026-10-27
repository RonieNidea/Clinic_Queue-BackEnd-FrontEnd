import { useEffect, useState } from 'react';
import './App.css';

import AuthForm from './components/AuthForm';
import ClinicHours from './components/ClinicHours';
import Announcements from './components/Announcements';
import ClinicLocation from './components/ClinicLocation';
import ClinicStatus from './components/ClinicStatus';
import Appointments from './pages/Appointments';
import AppointmentReminder from './components/AppointmentReminder';
import StaffApprovals from './pages/StaffApprovals';
import CreateStaffAccount from './pages/CreateStaffAccount';
import { apiRequest, TOKEN_KEY } from './services/api';
import Reception from './pages/Reception';
import LiveQueueBoard from './pages/LiveQueueBoard';
import NextAppointment from './components/NextAppointment';
import AppointmentHistory from './pages/AppointmentHistory';
import PatientQueue from './pages/PatientQueue';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  account_type: 'patient',
  invitation_code: '',
};

function App() {
  const [page, setPage] = useState('home');
  const [form, setForm] = useState({ ...emptyForm });
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        setSessionChecking(false);
        return;
      }

      try {
        const account = await apiRequest('/user', {
          token: savedToken,
        });

        if (!cancelled) {
          setUser(account);
          setToken(savedToken);
          setPage('dashboard');
        }
      } catch (err) {
        if (!cancelled) {
          if (err.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            setPage('login');
            setError('Your session has expired. Please log in again.');
          } else {
            setSessionError(err.message);
          }
        }
      } finally {
        if (!cancelled) {
          setSessionChecking(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function openPage(nextPage) {
    if (loading) return;

    setPage(nextPage);
    setMessage('');
    setError('');
    setForm({ ...emptyForm });
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

    if (loading) return;

    const isStaffRegister = page === 'staffRegister';
    const isRegister = page === 'register' || isStaffRegister;

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const data = await apiRequest(
          isStaffRegister
          ? '/staff/register'
          : isRegister
            ? '/register'
            : '/login',
        {
          method: 'POST',
          body: JSON.stringify(
            isRegister
              ? form
              : {
                  email: form.email,
                  password: form.password,
                }
          ),
        }
      );

      if (isRegister && data.approval_required) {
        setForm({ ...emptyForm });
        setPage('login');
        setMessage(data.message);
        return;
      }

      if (!data.token || !data.user) {
        throw new Error('The server returned an incomplete login response.');
      }

      localStorage.setItem(TOKEN_KEY, data.token);

      setToken(data.token);
      setUser(data.user);
      setForm({ ...emptyForm });
      setPage('dashboard');
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setMessage('');
    setError('');

    try {
      await apiRequest('/logout', {
        method: 'POST',
        token,
      });
    } catch (err) {
      // An expired token already means the session has ended.
      if (err.status !== 401) {
        setError(err.message);
        setLoading(false);
        return;
      }
    }

    localStorage.removeItem(TOKEN_KEY);

    setToken('');
    setUser(null);
    setForm({ ...emptyForm });
    setPage('home');
    setMessage('You have logged out successfully.');
    setLoading(false);
  }

  const navigationDisabled =
    loading || sessionChecking || Boolean(sessionError);

  return (
    <div className="app">
      <header className="navbar">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault();

            if (!navigationDisabled) {
              openPage('home');
            }
          }}
        >
          <span className="brand-icon">+</span>
          ClinicQueue
        </a>

        <nav>

            <button
            type="button"
            className="secondary-button"
            disabled={navigationDisabled}
            onClick={() => openPage('liveBoard')}
          >
            Queue Board
          </button>

          {!sessionChecking && !sessionError && (
            user ? (
              <>

                {['admin', 'reception'].includes(user.role) && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={loading}
                    onClick={() => openPage('reception')}
                  >
                    Reception
                  </button>
                )}

                {user.role === 'admin' && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={loading}
                    onClick={() => openPage('createStaff')}
                  >
                    Create Staff
                  </button>
                )}

                {user.role === 'patient' && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={loading}
                    onClick={() => openPage('patientQueue')}
                  >
                    My Queue
                  </button>
                )}

                {user.role === 'patient' && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={loading}
                    onClick={() => openPage('appointmentHistory')}
                  >
                    Appointment History
                  </button>
                )}

                <button
                  type="button"
                  className="secondary-button"
                  disabled={loading}
                  onClick={() => openPage('appointments')}
                >
                  Appointments
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={loading}
                  onClick={() => openPage('dashboard')}
                >
                  My Account
                </button>

                <button
                  type="button"
                  className="login-button"
                  disabled={loading}
                  onClick={handleLogout}
                >
                  {loading ? 'Please wait...' : 'Log Out'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="login-button"
                disabled={loading}
                onClick={() => openPage('login')}
              >
                Log In
              </button>
            )
          )}
        </nav>
      </header>

      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {user && !sessionChecking && !sessionError && (
        <AppointmentReminder
          token={token}
          page={page}
          openPage={openPage}
        />
      )}

      {sessionChecking ? (
        <main className="auth-page">
          <p role="status">Checking your session...</p>
        </main>
      ) : sessionError ? (
        <main className="auth-page">
          <section className="auth-card">
            <h1>Connection problem</h1>

            <p role="alert">{sessionError}</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </section>
        </main>
      ) : (
        <>
          {page === 'home' && (
            <main>
              <section className="hero">
                <div className="hero-content">
                  <span className="eyebrow">
                    CAMPUS HEALTHCARE, MADE SIMPLE
                  </span>

                  <h1>
                    Your health.
                    <br />
                    <span>Your time matters.</span>
                  </h1>

                  <p>
                    Plan your campus clinic visit with ClinicQueue.
                    Create an account to get started.
                  </p>

                  <div className="hero-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        openPage(user ? 'dashboard' : 'register')
                      }
                    >
                      {user ? 'My Account' : 'Create Account'}
                    </button>

                    {!user && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openPage('login')}
                      >
                        Log In
                      </button>
                    )}
                  </div>
                </div>

                <article className="queue-card">
                  <span className="eyebrow">
                    WELCOME TO CLINICQUEUE
                  </span>

                  <h2>Your campus clinic companion</h2>

                  <p className="queue-description">
                    One account for managing your clinic visits.
                  </p>

                  <div className="queue-divider" />

                  <div className="queue-details">
                    <span>Campus</span>
                    <strong>St. Peter&apos;s College</strong>
                  </div>

                  <div className="queue-details">
                    <span>Account</span>
                    <strong>
                      {user ? 'Signed in' : 'Get started today'}
                    </strong>
                  </div>
                </article>
              </section>
              {user?.role === 'patient' && (
                <NextAppointment
                  token={token}
                  openPage={openPage}
                />
              )}
              <ClinicStatus />
              <ClinicHours />
              <Announcements />
              <ClinicLocation />
            </main>
          )}

          {(page === 'login' || page === 'register') && !user && (
            <AuthForm
              page={page}
              form={form}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              openPage={openPage}
              loading={loading}
            />
          )}

            {page === 'appointments' && user && (
            <Appointments token={token} user={user} />
          )}

          {page === 'staffApprovals' && user?.role === 'admin' && (
            <StaffApprovals token={token} />
          )}

          {page === 'createStaff' && user?.role === 'admin' && (
            <CreateStaffAccount token={token} />
          )}

            {page === 'reception' &&
            user?.approval_status === 'approved' &&
            ['admin', 'reception'].includes(user?.role) && (
              <Reception token={token} />
            )}

            {page === 'liveBoard' && (
            <LiveQueueBoard />
          )}
          {page === 'appointmentHistory' && user?.role === 'patient' && (
            <AppointmentHistory
              token={token}
              openPage={openPage}
            />
          )}
          {page === 'patientQueue' && user?.role === 'patient' && (
            <PatientQueue
              token={token}
              openPage={openPage}
            />
          )}
          {page === 'dashboard' && user && (
            <main className="auth-page">
              <section className="dashboard-card">
                <span className="eyebrow">MY ACCOUNT</span>

                <h1>Welcome, {user.name}!</h1>

                <p>You are successfully signed in to ClinicQueue.</p>

                <div className="queue-divider" />

                <div className="queue-details">
                  <span>Full name</span>
                  <strong>{user.name}</strong>
                </div>

                <div className="queue-details">
                  <span>Email address</span>
                  <strong>{user.email}</strong>
                </div>
              </section>
            </main>
          )}
        </>
      )}

      <footer>
        <p>
          <strong>ClinicQueue</strong>
          {' '}· St. Peter&apos;s College
        </p>
        <span>Campus clinic appointments</span>
      </footer>
    </div>
  );
}

export default App;