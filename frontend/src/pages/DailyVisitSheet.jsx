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

function DailyVisitSheet({ token }) {
  const [date, setDate] = useState(todayInManila);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const [snapshot, setSnapshot] = useState(null);
  const [printDocument, setPrintDocument] = useState(null);
  const [printVersion, setPrintVersion] = useState(0);

  const frame = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSheet() {
      setLoading(true);
      setError('');
      setData(null);

      if (!date) {
        setLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({ date });

        const result = await apiRequest(
          `/staff/daily-visit-sheet?${query}`,
          { token }
        );

        if (!cancelled) {
          setData(result);
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
  }, [token, date, refresh]);

  useEffect(() => {
    if (!snapshot || !printDocument) return;

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
  }, [snapshot, printDocument]);

  function handlePrint() {
    if (!data || data.date !== date || loading) return;

    setError('');
    setPrintDocument(null);
    setSnapshot(data);
    setPrintVersion((value) => value + 1);
  }

  const ready = data && data.date === date;

  return (
    <main className="history-page">
      <div className="section-heading">
        <span className="eyebrow">STAFF REPORTS</span>
        <h1>Daily Visit Sheet</h1>
        <p>Preview and print the completed visits for a selected date.</p>
      </div>

      <div className="history-toolbar exceptions-toolbar">
        <label>
          Visit date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        <button
          type="button"
          className="secondary-button"
          disabled={loading || !date}
          onClick={() => setRefresh((value) => value + 1)}
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
          <h2>No completed visits for this date</h2>
          <p>Choose another date or complete a visit record first.</p>
        </section>
      ) : ready ? (
        <div className="daily-sheet-preview">
          <SheetContent sheet={data} />
        </div>
      ) : null}

      {snapshot && (
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

      {snapshot && printDocument && createPortal(
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