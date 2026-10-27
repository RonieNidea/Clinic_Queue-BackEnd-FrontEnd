const announcements = [
  {
    id: 1,
    category: 'Sample announcement',
    title: 'Welcome to ClinicQueue',
    content:
      'Create an account to start managing your campus clinic appointments.',
  },
  {
    id: 2,
    category: 'Sample announcement',
    title: 'Plan your clinic visit',
    content:
      'Check the clinic hours and available services before visiting the campus clinic.',
  },
];

function Announcements() {
  return (
    <section className="announcements" id="announcements">
      <div className="section-heading">
        <span className="eyebrow">STAY INFORMED</span>
        <h2>Clinic Announcements</h2>
        <p>Updates and reminders for your campus clinic visits.</p>
      </div>

      <div className="announcement-list">
        {announcements.map((announcement) => (
          <article
            className="announcement-card"
            key={announcement.id}
          >
            <div className="announcement-content">
              <span className="announcement-tag">
                {announcement.category}
              </span>

              <h3>{announcement.title}</h3>
              <p>{announcement.content}</p>
            </div>
          </article>
        ))}
      </div>

      <p className="announcement-note">
        These are sample announcements. Replace them with approved
        clinic updates before publishing.
      </p>
    </section>
  );
}

export default Announcements;