import { useEffect, useRef } from 'react';

function Navbar({
  page,
  user,
  disabled,
  openPage,
  handleLogout,
}) {
  const header = useRef(null);

  const isAdmin = user?.role === 'admin';
  const isPatient = user?.role === 'patient';

  const isClinical =
    user?.approval_status === 'approved' &&
    ['admin', 'staff'].includes(user?.role);

  const isReception =
    user?.approval_status === 'approved' &&
    ['admin', 'reception'].includes(user?.role);

  function closeMenus() {
    header.current?.querySelectorAll('details[open]').forEach((menu) => {
      menu.open = false;
    });
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!header.current?.contains(event.target)) {
        header.current?.querySelectorAll('details[open]').forEach((menu) => {
          menu.open = false;
        });
      }
    }

    function handleEscape(event) {
      if (event.key !== 'Escape') return;

      const openMenu = header.current?.querySelector('details[open]');

      if (openMenu) {
        const summary = openMenu.querySelector('summary');
        openMenu.open = false;
        summary?.focus();
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function navigate(target) {
    if (disabled) return;

    closeMenus();
    openPage(target);
  }

  const groups = [];

  if (user) {
    groups.push({
      label: 'My Visits',
      items: [
        ['appointments', 'Appointments'],
        ...(isPatient
          ? [
              ['patientQueue', 'My Queue'],
              ['appointmentHistory', 'Appointment History'],
              ['visitSummaries', 'Visit Summaries'],
            ]
          : []),
      ],
    });
  }

  if (isClinical) {
    groups.push({
      label: 'Clinic',
      items: [
        ['departmentQueue', 'Manage Queue'],
        ['staffRecords', 'Visit Records'],
        ['recordVisit', 'Record Visit'],
        ['appointmentBlocks', 'Block Appointment Times'],
      ],
    });

    groups.push({
      label: 'Reports',
      items: [
        ['dailyExceptions', 'No-shows & Cancellations'],
        ['dailyVisitSheet', isAdmin ? 'Daily Visit Sheets' : 'Department Daily Sheet'],
      ],
    });
  }

  if (isAdmin) {
    groups.push({
      label: 'Administration',
      items: [
        ['manageAnnouncements', 'Announcements'],
        ['departments', 'Departments'],
        ['createStaff', 'Create Staff'],
        ['staffApprovals', 'Staff Accounts'],
      ],
    });
  }

  if (user) {
    groups.push({
      label: 'Account',
      items: [
        ['profile', 'My Profile'],
        ['settings', 'Settings'],
      ],
    });
  }

  return (
    <header className="cq-navigation" ref={header}>
      <div className="cq-navigation-inner">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            navigate('home');
          }}
        >
          <span className="brand-icon">+</span>
          ClinicQueue
        </a>

        <nav className="cq-nav-links" aria-label="Main navigation">
          {user && (
            <button
              type="button"
              className={`cq-nav-button ${page === 'dashboard' ? 'active' : ''}`}
              disabled={disabled}
              aria-current={page === 'dashboard' ? 'page' : undefined}
              onClick={() => navigate('dashboard')}
            >
              {isClinical ? 'Dashboard' : 'My Account'}
            </button>
          )}

          <button
            type="button"
            className={`cq-nav-button ${page === 'liveBoard' ? 'active' : ''}`}
            disabled={disabled}
            aria-current={page === 'liveBoard' ? 'page' : undefined}
            onClick={() => navigate('liveBoard')}
          >
            Queue Board
          </button>

          {isReception && (
            <button
              type="button"
              className={`cq-nav-button ${page === 'reception' ? 'active' : ''}`}
              disabled={disabled}
              aria-current={page === 'reception' ? 'page' : undefined}
              onClick={() => navigate('reception')}
            >
              Reception
            </button>
          )}

          {groups.map((group) => (
            <details className="cq-nav-group" key={group.label}>
              <summary
                className={
                  group.items.some(([target]) => target === page)
                    ? 'active'
                    : ''
                }
                onClick={(event) => {
                  if (disabled) event.preventDefault();
                }}
                onKeyDown={(event) => {
                  if (
                    disabled &&
                    ['Enter', ' '].includes(event.key)
                  ) {
                    event.preventDefault();
                  }
                }}
                aria-disabled={disabled}
              >
                {group.label}
                <span aria-hidden="true">▾</span>
              </summary>

              <div className="cq-dropdown">
                {group.items.map(([target, label]) => (
                  <button
                    key={target}
                    type="button"
                    disabled={disabled}
                    className={page === target ? 'active' : ''}
                    aria-current={page === target ? 'page' : undefined}
                    onClick={() => navigate(target)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
          ))}

          {user ? (
            <button
              type="button"
              className="login-button"
              disabled={disabled}
              onClick={() => {
                closeMenus();
                handleLogout();
              }}
            >
              Log Out
            </button>
          ) : (
            <button
              type="button"
              className="login-button"
              disabled={disabled}
              onClick={() => navigate('login')}
            >
              Log In
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
