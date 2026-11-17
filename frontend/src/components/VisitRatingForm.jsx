import { useState } from 'react';
import { apiRequest } from '../services/api';

function VisitRatingForm({ visit, token, onSaved }) {
  const [score, setScore] = useState(visit.rating?.score || '');
  const [comment, setComment] = useState(visit.rating?.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await apiRequest(
        `/patient/visits/${visit.id}/rating`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({
            score: Number(score),
            comment: comment.trim(),
          }),
        }
      );

      setMessage(data.message);
      onSaved(data.rating);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="visit-rating-form" onSubmit={handleSubmit}>
      <h3>Rate Your Visit</h3>

      {visit.rating && (
        <p>Your saved rating: {visit.rating.score} out of 5.</p>
      )}

      <label>
        Rating
        <select
          value={score}
          onChange={(event) => setScore(event.target.value)}
          disabled={saving}
          required
        >
          <option value="">Choose a rating</option>
          <option value="1">1 — Very dissatisfied</option>
          <option value="2">2 — Dissatisfied</option>
          <option value="3">3 — Neutral</option>
          <option value="4">4 — Satisfied</option>
          <option value="5">5 — Very satisfied</option>
        </select>
      </label>

      <label>
        Feedback (optional)
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={1000}
          rows={3}
          disabled={saving}
          placeholder="Tell us about your clinic visit."
        />
      </label>

      {error && <p className="appointment-error" role="alert">{error}</p>}
      {message && <p className="rating-success" role="status">{message}</p>}

      <button
        type="submit"
        className="primary-button"
        disabled={saving || !score}
      >
        {saving
          ? 'Saving...'
          : visit.rating
            ? 'Update Rating'
            : 'Submit Rating'}
      </button>
    </form>
  );
}

export default VisitRatingForm;