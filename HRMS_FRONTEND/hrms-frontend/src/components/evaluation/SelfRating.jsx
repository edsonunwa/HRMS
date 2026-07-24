import React, { useState, useEffect } from 'react';
import { evaluationService } from '../../services/evaluationService';
import styles from './ManagerRating.module.css';

function SelfStarRating({ value, onChange, label }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className={styles.starRating}>
      <span className={styles.ratingLabel}>{label}</span>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${styles.star} ${(hovered || value) >= star ? styles.starActive : ''}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            title={['Poor', 'Below Average', 'Average', 'Very Good', 'Excellent'][star - 1]}
          >
            ★
          </button>
        ))}
        <span className={styles.scoreText}>
          {value ? `${value}/5` : '—'}
        </span>
      </div>
    </div>
  );
}

export default function SelfRating() {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selfCommunication, setSelfCommunication] = useState('');
  const [selfProductivity, setSelfProductivity] = useState('');
  const [selfInnovation, setSelfInnovation] = useState('');
  const [selfComment, setSelfComment] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSelfRating();
  }, []);

  async function loadSelfRating() {
    setLoading(true);
    try {
      const data = await evaluationService.getSelfRating();
      setReview(data);
      setSelfCommunication(data.self_communication_score ?? '');
      setSelfProductivity(data.self_productivity_score ?? '');
      setSelfInnovation(data.self_innovation_score ?? '');
      setSelfComment(data.self_comment ?? '');
    } catch (err) {
      console.error('Failed to load self rating:', err);
      if (err.response?.status !== 404) {
        setErrorMsg('Failed to load self-rating data.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const result = await evaluationService.saveSelfRating({
        self_communication_score: selfCommunication || null,
        self_productivity_score: selfProductivity || null,
        self_innovation_score: selfInnovation || null,
        self_comment: selfComment || '',
      });
      setReview(result);
      setSelfCommunication(result.self_communication_score ?? '');
      setSelfProductivity(result.self_productivity_score ?? '');
      setSelfInnovation(result.self_innovation_score ?? '');
      setSelfComment(result.self_comment ?? '');
      setSuccessMsg('Self-rating submitted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save self rating:', err);
      setErrorMsg('Failed to save self-rating. Please try again.');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.card}>
        <p className={styles.loadingText}>Loading your self-rating...</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <h3>Self Rating</h3>
          <p>No active performance cycle found. Please contact your HR department.</p>
        </div>
      </div>
    );
  }

  const hasAllScores = selfCommunication && selfProductivity && selfInnovation;
  const isSubmitted = review.status !== 'pending';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Self Rating</h3>
        <p className={styles.subtitle}>
          Rate yourself on Communication, Productivity, and Innovation (1-5 scale)
        </p>
        {review.cycle_name && (
          <span className={styles.cycleName} style={{ display: 'inline-block', marginTop: '0.5rem' }}>
            {review.cycle_name}
          </span>
        )}
        {isSubmitted && (
          <span className={styles.cycleName} style={{ display: 'inline-block', marginTop: '0.5rem', marginLeft: '0.5rem', background: '#d1fae5', color: '#065f46' }}>
            Submitted
          </span>
        )}
      </div>

      {successMsg && <div className={styles.successBanner}>{successMsg}</div>}
      {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

      <div className={styles.ratingsSection}>
        <SelfStarRating
          label="Communication"
          value={selfCommunication}
          onChange={setSelfCommunication}
        />
        <SelfStarRating
          label="Productivity"
          value={selfProductivity}
          onChange={setSelfProductivity}
        />
        <SelfStarRating
          label="Innovation"
          value={selfInnovation}
          onChange={setSelfInnovation}
        />
      </div>

      <div className={styles.commentSection}>
        <label className={styles.commentLabel}>Employee Comment:</label>
        <textarea
          className={styles.commentInput}
          rows={3}
          value={selfComment}
          onChange={(e) => setSelfComment(e.target.value)}
          placeholder="Share your thoughts about your performance this cycle..."
        />
      </div>

      <div className={styles.actions}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : hasAllScores ? 'Submit Self-Rating' : 'Save (Incomplete)'}
        </button>
      </div>
    </div>
  );
}