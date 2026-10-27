import { useEffect, useState } from 'react';

const clinicTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getClinicStatus(date) {
  const parts = Object.fromEntries(
    clinicTimeFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value])
  );

  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const isSunday = parts.weekday === 'Sun';
  const isSaturday = parts.weekday === 'Sat';

  const openingTime = 8 * 60;
  const closingTime = isSaturday ? 12 * 60 : 17 * 60;

  const isOpen =
    !isSunday &&
    minutes >= openingTime &&
    minutes < closingTime;

  let message;

  if (isOpen) {
    message = isSaturday
      ? 'The clinic is open until 12:00 PM today.'
      : 'The clinic is open until 5:00 PM today.';
  } else if (isSunday) {
    message = 'The clinic is closed on Sundays. It opens Monday at 8:00 AM.';
  } else if (minutes < openingTime) {
    message = 'The clinic is currently closed. It opens today at 8:00 AM.';
  } else if (isSaturday) {
    message = 'The clinic is closed for the weekend. It opens Monday at 8:00 AM.';
  } else {
    message = 'The clinic is closed for the day. It opens tomorrow at 8:00 AM.';
  }

  return { isOpen, message };
}

function ClinicStatus() {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const { isOpen, message } = getClinicStatus(currentTime);

  return (
    <section
      className={`clinic-status ${isOpen ? 'is-open' : 'is-closed'}`}
      aria-label="Clinic operating status"
    >
      <div
        className="clinic-status-indicator"
        role="status"
        aria-live="polite"
      >
        <span className="clinic-status-dot" aria-hidden="true" />

        <div>
          <h3>{isOpen ? 'Clinic is open' : 'Clinic is closed'}</h3>
          <p>{message}</p>
        </div>
      </div>

      <small>
        Based on the sample schedule: Monday–Friday, 8:00 AM–5:00 PM;
        Saturday, 8:00 AM–12:00 PM. Philippine time.
        Holiday closures and special schedule changes are not included.
      </small>
    </section>
  );
}

export default ClinicStatus;