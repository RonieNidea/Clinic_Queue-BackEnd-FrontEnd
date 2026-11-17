import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../services/api';

const printStyles = `
  @page {
    size: A4;
    margin: 18mm;
  }

  body {
    margin: 0;
    color: #172b45;
    background: white;
    font-family: Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.6;
  }

  .slip-header {
    padding-bottom: 16px;
    margin-bottom: 24px;
    border-bottom: 2px solid #17345b;
  }

  h1 {
    margin: 0;
    font-size: 24pt;
  }

  h2 {
    margin: 8px 0;
    font-size: 18pt;
  }

  h3 {
    margin-bottom: 8px;
    font-size: 13pt;
  }

  p {
    margin: 8px 0;
    overflow-wrap: anywhere;
  }

  .slip-section {
    margin-top: 24px;
  }

  .slip-text {
    white-space: pre-wrap;
  }

  .slip-footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #bbbbbb;
    font-size: 10pt;
    color: #555555;
  }
`;

function VisitSlipButton({ token, visitId }) {
  const [slip, setSlip] = useState(null);
  const [printDocument, setPrintDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const frame = useRef(null);
  const requesting = useRef(false);

  useEffect(() => {
    if (!slip || !printDocument) return;

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
  }, [slip, printDocument]);

  async function handlePrint() {
    if (requesting.current) return;

    requesting.current = true;
    setLoading(true);
    setError('');
    setSlip(null);
    setPrintDocument(null);

    try {
      const data = await apiRequest(
        `/staff/visits/${visitId}/slip`,
        { token }
      );

      setSlip(data.visit);
    } catch (err) {
      setError(err.message);
    } finally {
      requesting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="visit-slip-action">
      <button
        type="button"
        className="secondary-button"
        disabled={loading}
        onClick={handlePrint}
      >
        {loading ? 'Preparing Slip...' : 'Print Visit Slip'}
      </button>

      {error && (
        <p className="appointment-error" role="alert">
          {error}
        </p>
      )}

      {slip && (
        <iframe
          ref={frame}
          title="Printable clinic visit slip"
          className="visit-slip-frame"
          srcDoc={
            '<!doctype html><html lang="en"><head>' +
            '<meta charset="utf-8">' +
            '<title>Clinic Visit Slip</title>' +
            '</head><body></body></html>'
          }
          onLoad={() => {
            const document = frame.current?.contentDocument;

            if (document?.body) {
              setPrintDocument(document);
            } else {
              setError('The visit slip could not be prepared.');
            }
          }}
        />
      )}

      {slip && printDocument && createPortal(
        <>
          <style>{printStyles}</style>

          <header className="slip-header">
            <h1>ClinicQueue</h1>
            <p>St. Peter&apos;s College — Campus Clinic</p>
            <h2>Visit Slip</h2>
            <p>Reference: VISIT-{slip.id}</p>
          </header>

          <p><strong>Patient:</strong> {slip.patient_name}</p>
          <p>
            <strong>Student number:</strong>{' '}
            {slip.student_number || 'Not recorded'}
          </p>
          <p><strong>Visit date:</strong> {slip.visit_date}</p>
          <p><strong>Department:</strong> {slip.department}</p>
          <p><strong>Service:</strong> {slip.service}</p>

          <section className="slip-section">
            <h3>Visit Summary</h3>
            <p className="slip-text">
              {slip.summary || 'Not recorded'}
            </p>
          </section>

          <section className="slip-section">
            <h3>Care Given</h3>
            <p className="slip-text">
              {slip.care_given || 'Not recorded'}
            </p>
          </section>

          <footer className="slip-footer">
            This slip summarizes a recorded clinic visit.
            It is not a medical clearance certificate.
          </footer>
        </>,
        printDocument.body
      )}
    </div>
  );
}

export default VisitSlipButton;