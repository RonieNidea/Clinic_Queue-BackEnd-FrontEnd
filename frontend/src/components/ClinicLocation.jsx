const campusAddress =
  "St. Peter's College, Sabayle Street, Iligan City, Philippines";

const mapUrl =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(campusAddress);

const embeddedMapUrl =
  'https://maps.google.com/maps?q=' +
  encodeURIComponent(campusAddress) +
  '&output=embed';

function ClinicLocation() {
  return (
    <section className="clinic-location" id="clinic-location">
      <div className="section-heading">
        <span className="eyebrow">FIND YOUR WAY</span>
        <h2>Clinic Location &amp; Directions</h2>
        <p>
          Find the campus and get directions to the clinic.
        </p>
      </div>

      <div className="location-grid">
        <article className="location-card">
          <div className="location-icon" aria-hidden="true">
            📍
          </div>

          <h3>Campus Location</h3>

          <p>
            St. Peter&apos;s College
            <br />
            Sabayle Street
            <br />
            Iligan City, Philippines
          </p>

          <a
            className="location-button"
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Google Maps ↗
          </a>
        </article>

        <article className="location-card">
          <div className="location-icon" aria-hidden="true">
            🧭
          </div>

          <h3>How to Find the Clinic</h3>

          <ol className="location-directions">
            <li>Enter the St. Peter&apos;s College campus.</li>
            <li>
              Ask campus security or school personnel for the
              clinic&apos;s building, floor, and room number.
            </li>
            <li>
              Follow their directions to the clinic reception area.
            </li>
          </ol>

          <p className="location-note">
            The map shows the campus location. Confirm the exact
            clinic room with school personnel.
          </p>
        </article>
      </div>

      <div className="clinic-map">
        <iframe
          title="Map showing St. Peter's College campus"
          src={embeddedMapUrl}
          width="100%"
          height="360"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}

export default ClinicLocation;