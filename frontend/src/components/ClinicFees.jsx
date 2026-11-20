const services = [
  {
    department: 'General Medicine',
    name: 'General Consultation',
    fee: 50,
  },
  {
    department: 'Nursing Assistance',
    name: 'Nursing Assistance',
    fee: 30,
  },
  {
    department: 'Basic First Aid',
    name: 'Basic First Aid',
    fee: 20,
  },
  {
    department: 'Health Assessment',
    name: 'Health Assessment',
    fee: 40,
  },
];

function formatFee(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function ClinicFees({ department }) {
  if (department) {
    const service = services.find(
      (item) => item.department === department
    );

    return (
      <aside className="booking-fee-note">
        <h3>Service Fee</h3>

        <p>
          {service?.name || department}:{' '}
          <strong>
            {service ? formatFee(service.fee) : 'Confirm with clinic'}
          </strong>
        </p>

        <p>
          Pay in cash at clinic reception. No payment is collected
          when booking online.
        </p>

        <small>
          Demonstration prices for this project, not official campus fees.
        </small>
      </aside>
    );
  }

  return (
    <section className="clinic-fees" id="clinic-fees">
      <div className="section-heading">
        <span className="eyebrow">BEFORE YOU BOOK</span>
        <h2>Service Fees &amp; Payment</h2>
        <p>Review the sample service fees before choosing your visit.</p>
      </div>

      <div className="clinic-fees-grid">
        <article className="clinic-fees-card">
          <h3>Sample Service Fees</h3>

          <table className="clinic-fees-table">
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Fee</th>
              </tr>
            </thead>

            <tbody>
              {services.map((service) => (
                <tr key={service.department}>
                  <td>{service.name}</td>
                  <td>{formatFee(service.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="clinic-info-note">
            Demonstration prices for this project, not official campus fees.
          </p>
        </article>

        <article className="clinic-fees-card">
          <h3>Payment Notes</h3>

          <ul className="clinic-fees-notes">
            <li>Payment method: cash at clinic reception.</li>
            <li>No online payment is required to book an appointment.</li>
            <li>Confirm the amount with reception before paying.</li>
            <li>Request a receipt after payment.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

export default ClinicFees;