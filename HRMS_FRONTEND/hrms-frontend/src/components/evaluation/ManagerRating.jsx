import React, { useState, useEffect } from 'react';
import { evaluationService } from '../../services/evaluationService';
import styles from './ManagerRating.module.css';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Very Good',
  5: 'Excellent',
};

function StarRating({ value, onChange, label }) {
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
            title={RATING_LABELS[star]}
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

export default function ManagerRating() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    try {
      const data = await evaluationService.getManagerRatings();
      setEmployees(data);
      // Initialize ratings state from existing data
      const initialRatings = {};
      const initialComments = {};
      data.forEach((emp) => {
        const empId = emp.employee_id;
        initialRatings[empId] = {
          communication_score: emp.communication_score ?? '',
          productivity_score: emp.productivity_score ?? '',
          innovation_score: emp.innovation_score ?? '',
        };
        initialComments[empId] = emp.manager_comment ?? '';
      });
      setRatings(initialRatings);
      setComments(initialComments);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setErrorMsg('Failed to load employees for rating.');
    } finally {
      setLoading(false);
    }
  }

  function setRating(empId, field, value) {
    setRatings((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  }

  function setComment(empId, value) {
    setComments((prev) => ({ ...prev, [empId]: value }));
  }

  async function handleSave(empId) {
    setSaving(empId);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const rating = ratings[empId] || {};
      await evaluationService.saveManagerRating({
        employee_id: empId,
        communication_score: rating.communication_score || null,
        productivity_score: rating.productivity_score || null,
        innovation_score: rating.innovation_score || null,
        manager_comment: comments[empId] || '',
      });
      setSuccessMsg('Rating saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save rating:', err);
      setErrorMsg('Failed to save rating. Please try again.');
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.card}>
        <p className={styles.loadingText}>Loading employees...</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyState}>
          <h3>Manager Rating</h3>
          <p>No employees found in your department for rating.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Manager Rating</h3>
        <p className={styles.subtitle}>
          Rate employees in your department on Communication, Productivity, and Innovation (1-5 scale)
        </p>
      </div>

      {successMsg && <div className={styles.successBanner}>{successMsg}</div>}
      {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

      <div className={styles.employeeList}>
        {employees.map((emp) => {
          const empId = emp.employee_id;
          const rating = ratings[empId] || {};
          const hasAllScores = rating.communication_score && rating.productivity_score && rating.innovation_score;

          return (
            <div key={empId} className={styles.employeeCard}>
              <div className={styles.employeeInfo}>
                <div>
                  <div className={styles.employeeName}>{emp.employee_name}</div>
                  <div className={styles.employeeRole}>{emp.position}</div>
                </div>
                <div className={styles.cycleName}>{emp.cycle_name}</div>
              </div>

              <div className={styles.ratingsSection}>
                <StarRating
                  label="Communication"
                  value={rating.communication_score}
                  onChange={(v) => setRating(empId, 'communication_score', v)}
                />
                <StarRating
                  label="Productivity"
                  value={rating.productivity_score}
                  onChange={(v) => setRating(empId, 'productivity_score', v)}
                />
                <StarRating
                  label="Innovation"
                  value={rating.innovation_score}
                  onChange={(v) => setRating(empId, 'innovation_score', v)}
                />
              </div>

              <div className={styles.commentSection}>
                <label className={styles.commentLabel}>Manager Comment:</label>
                <textarea
                  className={styles.commentInput}
                  rows={3}
                  value={comments[empId] ?? ''}
                  onChange={(e) => setComment(empId, e.target.value)}
                  placeholder="Enter your overall comment about this employee..."
                />
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.saveBtn}
                  onClick={() => handleSave(empId)}
                  disabled={saving === empId}
                >
                  {saving === empId ? 'Saving...' : hasAllScores ? 'Save Rating' : 'Save (Incomplete)'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
