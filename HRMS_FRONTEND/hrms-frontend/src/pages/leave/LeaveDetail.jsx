import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiMinus } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/common/StatusBadge';
import { leaveRequestsService } from '../../services/leaveService';
import styles from './LeaveDetail.module.css';

const LEVEL_LABELS = { 1: 'Supervisor', 2: 'Department Head', 3: 'Senior Management', 4: 'HR' };
const ALL_LEVELS = [1, 2, 3, 4];

function Field({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value ?? '—'}</span>
    </div>
  );
}

function AuditTrail({ request }) {
  const approvals = request.approvals || [];
  const approvalsByLevel = {};
  approvals.forEach((a) => { approvalsByLevel[a.level] = a; });

  // Use skipped_levels from backend to determine which levels are skipped
  const skippedLevels = request.skipped_levels || [];

  // Determine which levels are relevant (skip unassigned ones)
  const hasLevel = {
    1: !!request.supervisor_user_id,
    2: !!request.dept_head_user_id,
    3: !!request.senior_mgmt_exists,
    4: true, // HR always present
  };

  return (
    <div className={styles.trail}>
      {ALL_LEVELS.filter((lvl) => hasLevel[lvl]).map((lvl, idx, arr) => {
        const approval = approvalsByLevel[lvl];
        const isApproved = approval?.decision === 'approved';
        const isRejected = approval?.decision === 'rejected';
        const isCurrent = !approval && request.status === 'pending' && request.current_level === lvl;
        const isSkipped = skippedLevels.includes(lvl);
        const isLast = idx === arr.length - 1;

        let stateClass = styles.nodeWaiting;
        let icon = <span className={styles.nodeNum}>{lvl}</span>;
        if (isApproved) { stateClass = styles.nodeApproved; icon = <FiCheck />; }
        else if (isRejected) { stateClass = styles.nodeRejected; icon = <FiX />; }
        else if (isCurrent) { stateClass = styles.nodeCurrent; icon = <span className={styles.nodeNum}>{lvl}</span>; }
        else if (isSkipped) { stateClass = styles.nodeSkipped; icon = <FiMinus />; }

        return (
          <div key={lvl} className={styles.trailStep}>
            <div className={styles.trailLeft}>
              <div className={`${styles.node} ${stateClass}`}>{icon}</div>
              {!isLast && <div className={`${styles.connector} ${isApproved ? styles.connectorDone : ''}`} />}
            </div>
            <div className={styles.trailContent}>
              <div className={styles.trailTitle}>
                Level {lvl} — {LEVEL_LABELS[lvl]}
                {isCurrent && <span className={styles.currentBadge}>Awaiting</span>}
              </div>
              {approval ? (
                <>
                  <div className={styles.trailMeta}>
                    <strong>{approval.approver_name}</strong>
                    {' · '}
                    {new Date(approval.decided_at).toLocaleString()}
                    {approval.override && <span className={styles.overrideBadge}>Override</span>}
                  </div>
                  {approval.comment && (
                    <div className={styles.trailComment}>"{approval.comment}"</div>
                  )}
                </>
              ) : (
                <div className={styles.trailMeta} style={{ color: 'var(--color-text-muted)' }}>
                  {isCurrent ? 'Pending action' : isSkipped ? 'Skipped' : request.status !== 'pending' ? 'Not reached' : 'Pending'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LeaveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    leaveRequestsService.get(id)
      .then(setRequest)
      .catch((err) => {
        const code = err.response?.status;
        if (code === 404 || code === 403) {
          setError('not_found');
        } else {
          setError('failed');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (!loading && error === 'not_found') {
    return (
      <DashboardLayout portalLabel="Leave Management" searchPlaceholder="Search leave requests…">
        <button className={styles.back} onClick={() => navigate('/leave')}>
          <FiArrowLeft /> Back to Leave
        </button>
        <div className={styles.notFound}>
          <span className={styles.notFoundCode}>404</span>
          <p>This leave request doesn't exist or you don't have access to it.</p>
          <button className={styles.back} onClick={() => navigate('/leave')}>Go back</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="Leave Management" searchPlaceholder="Search leave requests…">
      <button className={styles.back} onClick={() => navigate('/leave')}>
        <FiArrowLeft /> Back to Leave
      </button>

      {loading && <div className={styles.empty}>Loading…</div>}
      {error === 'failed' && <div className={styles.errorBanner}>Failed to load leave request. Please try again.</div>}

      {request && (
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.title}>{request.employee_name}</h1>
              <p className={styles.sub}>{request.leave_type_name} · {request.days_requested} day{request.days_requested !== 1 ? 's' : ''}</p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <div className={styles.grid}>
            {/* Details card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Request Details</h2>
              <Field label="Employee" value={request.employee_name} />
              <Field label="Leave Type" value={request.leave_type_name} />
              <Field label="Start Date" value={request.start_date} />
              <Field label="End Date" value={request.end_date} />
              <Field label="Days Requested" value={request.days_requested} />
              <Field label="Status" value={<StatusBadge status={request.status} />} />
              <Field label="Applied On" value={new Date(request.applied_at).toLocaleString()} />
              {request.reason && <Field label="Reason" value={request.reason} />}
            </div>

            {/* Audit trail card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Approval Trail</h2>
              <AuditTrail request={request} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
