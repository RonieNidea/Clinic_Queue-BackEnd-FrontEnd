function ClinicHours() {
  const services = [
    'General Consultation',
    'Nursing Assistance',
    'Basic First Aid',
    'Health Assessment',
  ];

  return (
    <section className="clinic-info" id="clinic-hours">
      <div className="section-heading">
        <span className="eyebrow">PLAN YOUR VISIT</span>
        <h2>Clinic Hours &amp; Services</h2>
        <p>
          Check the clinic schedule and available services before
          your visit.
        </p>
      </div>

      <div className="clinic-info-grid">
        <article className="clinic-info-card">
          <div className="clinic-info-icon" aria-hidden="true">
            ◷
          </div>

          <h3>Operating Hours</h3>
          <p className="clinic-info-description">
            Regular clinic schedule
          </p>

          <div className="clinic-hours-row">
            <span>Monday – Friday</span>
            <strong>8:00 AM – 5:00 PM</strong>
          </div>

          <div className="clinic-hours-row">
            <span>Saturday</span>
            <strong>8:00 AM – 12:00 PM</strong>
          </div>

          <div className="clinic-hours-row">
            <span>Sunday</span>
            <strong className="closed-label">Closed</strong>
          </div>

          <p className="clinic-info-note">
            Sample schedule from the original project. Confirm the
            official clinic hours and holiday closures with campus staff.
          </p>
        </article>

        <article className="clinic-info-card">
          <div className="clinic-info-icon" aria-hidden="true">
            ✚
          </div>

          <h3>Available Services</h3>
          <p className="clinic-info-description">
            Campus healthcare services
          </p>

          <ul className="clinic-service-list">
            {services.map((service) => (
              <li key={service}>
                <span>{service}</span>
              </li>
            ))}
          </ul>

          <p className="clinic-info-note">
            Contact the clinic to confirm service availability.
          </p>
        </article>
      </div>
    </section>
  );
}

export default ClinicHours;