import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../services/api';

function todayInManila() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function SheetContent({ sheet }) {
  return (
    <article className="daily-sheet-content">
      <header>
        <h1>ClinicQueue</h1>
        <p>St. Peter&apos;s College — Campus Clinic</p>
        <h2>Daily Completed Visit List</h2>
      </header>

      <p><strong>Visit date:</strong> {sheet.date}</p>
      <p><strong>Department:</strong> {sheet.department}</p>
      <p><strong>Total completed visits:</strong> {sheet.total}</p>

      <table>
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Reference</th>
            <th scope="col">Patient</th>
            <th scope="col">Student Number</th>
            <th scope="col">Department</th>
            <th scope="col">Service</th>
          </tr>
        </thead>

        <tbody>
          {sheet.visits.map((visit, index) => (
            <tr key={visit.id}>
              <td>{index + 1}</td>
              <td>#{visit.id}</td>
              <td>{visit.patient_name}</td>
              <td>{visit.student_number || 'Not recorded'}</td>
              <td>{visit.department}</td>
              <td>{visit.service}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="daily-sheet-footer">
        Prepared by: {sheet.prepared_by}
      </p>
    </article>
  );
}

const printStyles = `
  @page {
    size: A4 landscape;
    margin: 12mm;
  }

  body {
    margin: 0;
    font: 11pt Arial, sans-serif;
    color: #172b45;
    line-height: 1.5;
  }

  header {
    text-align: center;
    margin-bottom: 20px;
  }

  h1, h2, p {
    margin: 8px 0;
  }

  h1 {
    font-size: 22pt;
  }

  h2 {
    font-size: 16pt;
  }

  table {
    width: 100%;
    margin-top: 20px;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th, td {
    padding: 9px;
    border: 1px solid #aaaaaa;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
  }

  th {
    background: #eeeeee;
  }

  th:first-child {
    width: 5%;
  }

  th:nth-child(2) {
    width: 8%;
  }

  thead {
    display: table-header-group;
  }

  tr {
    break-inside: avoid;
  }

  .daily-sheet-footer {
    margin-top: 24px;
    font-size: 10pt;
  }
`;

function DailyVisitSheet({ token, user }) {
  const isAdmin = user.role === 'admin';
  const [date, setDate] = useState(todayInManila);
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [snapshot, setSnapshot] = useState(null);
  const [printDocument, setPrintDocument] = useState(null);
  const [printVersion, setPrintVersion] = useState(0);

  const frame = useRef(null);
  const selectedDepartment = isAdmin ? department : user.department;
  const ready =
    data &&
    data.date === date &&
    data.department_filter === selectedDepartment;
  const snapshotReady =
    snapshot &&
    snapshot.date === date &&
    snapshot.department_filter === selectedDepartment;

  useEffect(() => {
    let cancelled = false;

    async function loadSheet() {
      setLoading(true);
      setError('');
      setData(null);

      if (!date || !selectedDepartment) {
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          date,
          department: selectedDepartment,
        });

        const result = await apiRequest(
          `/staff/daily-visit-sheet?${query}`,
          { token }
        );

        if (!cancelled) {
          setData(result);
          setDepartments(result.available_departments);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSheet();

    return () => {
      cancelled = true;
    };
  }, [token, date, selectedDepartment, refresh]);

  useEffect(() => {
    if (!snapshotReady || !printDocument) return;

    const printWindow = frame.current?.contentWindow;

    if (!printWindow) return;

    const request = window.requestAnimationFrame(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        setError('The print dialog could not be opened. Please try again.');
      }
    });

    return () => window.cancelAnimationFrame(request);
  }, [snapshot, snapshotReady, printDocument]);

  function clearPrintPreview() {
    setSnapshot(null);
    setPrintDocument(null);
  }

  function handlePrint() {
    if (!ready || loading || data.visits.length === 0) return;

    setError('');
    setPrintDocument(null);
    setSnapshot(data);
    setPrintVersion((value) => value + 1);
  }

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">STAFF REPORTS</span>
        <h1>
          {isAdmin
            ? 'Daily Visit Sheets'
            : `${user.department} Daily Visit Sheet`}
        </h1>
        <p>
          {isAdmin
            ? 'Choose a department and date to preview or print completed visits.'
            : 'Preview and print completed visits you can access in your department.'}
        </p>
      </div>

      <div className="history-toolbar exceptions-toolbar">
        <label>
          Visit date
          <input
            type="date"
            value={date}
            onChange={(event) => {
              clearPrintPreview();
              setDate(event.target.value);
            }}
          />
        </label>

        {isAdmin ? (
          <label>
            Department
            <select
              value={department}
              onChange={(event) => {
                clearPrintPreview();
                setDepartment(event.target.value);
              }}
            >
              <option value="all">All departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p><strong>Department:</strong> {user.department}</p>
        )}

        <button
          type="button"
          className="secondary-button"
          disabled={loading || !date}
          onClick={() => {
            clearPrintPreview();
            setRefresh((value) => value + 1);
          }}
        >
          Refresh
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={loading || !ready || data.visits.length === 0}
          onClick={handlePrint}
        >
          Print / Save as PDF
        </button>
      </div>

      {!isAdmin && (
        <p className="clinic-info-note">
          Your sheet is limited to your department. Records marked
          &quot;Admin only&quot; are excluded.
        </p>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p role="status">Preparing the daily visit sheet...</p>
      ) : !date ? (
        <p>Select a date to view completed visits.</p>
      ) : ready && data.visits.length === 0 ? (
        <section className="history-empty">
          <h2>No completed visits to show</h2>
          <p>
            {isAdmin
              ? 'No completed visits match this department and date.'
              : `No completed visits are available to your account in ${user.department} for this date.`}
          </p>
        </section>
      ) : ready ? (
        <div className="daily-sheet-preview">
          <SheetContent sheet={data} />
        </div>
      ) : null}

      {snapshotReady && (
        <iframe
          key={printVersion}
          ref={frame}
          title="Printable daily visit sheet"
          className="visit-slip-frame"
          srcDoc={
            '<!doctype html><html lang="en"><head>' +
            '<meta charset="utf-8">' +
            '<title>Daily Visit Sheet</title>' +
            '</head><body></body></html>'
          }
          onLoad={() => {
            const document = frame.current?.contentDocument;

            if (document?.body) {
              setPrintDocument(document);
            } else {
              setError('The printable sheet could not be prepared.');
            }
          }}
        />
      )}

      {snapshotReady && printDocument && createPortal(
        <>
          <style>{printStyles}</style>
          <SheetContent sheet={snapshot} />
        </>,
        printDocument.body
      )}
    </main>
  );
}

export default DailyVisitSheet;
