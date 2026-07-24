import React, { useState } from 'react';
import { evaluationService } from '../../services/evaluationService';
import FormModal from '../../components/common/FormModal';
import styles from './ManagerRating.module.css';

const RATING_LABELS = {
    self_communication_score: 'Communication',
    self_productivity_score: 'Productivity',
    self_innovation_score: 'Innovation',
};

const RATING_FIELDS = [
    'self_communication_score',
    'self_productivity_score',
    'self_innovation_score',
];

/**
 * Modal that lets a Department Head confirm (approve) an employee's self-assessment
 * and send it to HR, or send it back for revision with feedback comments.
 */
export default function ReviewConfirmModal({ review, onClose, onSaved }) {
    const [action, setAction] = useState('confirm');
    const [hodComments, setHodComments] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await evaluationService.confirmReview(review.id, {
                action,
                hod_comments: hodComments,
            });
            onSaved();
        } catch (err) {
            setError(err.response?.data ? JSON.stringify(err.response?.data) : 'Action failed.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <FormModal
            title="Review Self-Assessment"
            onClose={onClose}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
        >
            {/* --- Employee self-ratings (read-only) --- */}
            <div className={styles.ratingsSection}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    Employee Self-Ratings
                </h4>
                {RATING_FIELDS.map((field) => {
                    const value = review[field];
                    return (
                        <div key={field} className={styles.starRating}>
                            <span className={styles.ratingLabel}>
                                {RATING_LABELS[field]}
                            </span>
                            <div className={styles.stars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                        key={star}
                                        className={
                                            star <= (value || 0)
                                                ? styles.starActive
                                                : styles.star
                                        }
                                    >
                                        ★
                                    </span>
                                ))}
                                <span className={styles.scoreText}>
                                    {value ? `${value}/5` : '—'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- Employee self-comment (read-only) --- */}
            {review.self_comment && (
                <div className={styles.commentSection}>
                    <label className={styles.commentLabel}>
                        Employee Comment:
                    </label>
                    <div
                        className={styles.commentInput}
                        style={{
                            minHeight: '60px',
                            padding: '0.5rem',
                            backgroundColor: '#f9fafb',
                        }}
                    >
                        {review.self_comment}
                    </div>
                </div>
            )}

            {/* --- Decision --- */}
            <div className={styles.field}>
                <label>Decision</label>
                <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    required
                >
                    <option value="confirm">
                        Confirm and Send to HR
                    </option>
                    <option value="reject">
                        Send Back for Revision
                    </option>
                </select>
            </div>

            {/* --- Department head comments --- */}
            <div className={styles.commentSection}>
                <label className={styles.commentLabel}>
                    {action === 'reject'
                        ? 'Revision Feedback (required)'
                        : 'Comments (optional)'}
                </label>
                <textarea
                    className={styles.commentInput}
                    rows={3}
                    value={hodComments}
                    onChange={(e) => setHodComments(e.target.value)}
                    placeholder={
                        action === 'reject'
                            ? 'Please explain what needs to be revised...'
                            : 'Add any comments...'
                    }
                    required={action === 'reject'}
                />
            </div>
        </FormModal>
    );
}
