import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatusBadge from '../../components/common/StatusBadge';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { leaveTypesService, leaveBalancesService, leaveRequestsService } from '../../services/leaveService';
import { IS_HR_OR_ADMIN, IS_DEPARTMENT_HEAD_OR_ABOVE, ROLES } from '../../utils/constants';
import styles from './LeaveList.module.css';

/* ---------- Leave Types tab ---------- */

function LeaveTypeFormModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing || {
    name: '', days_allowed: 0, is_paid: true, requires_approval: true,
    carry_forward: false, max_carry_days: 0, description: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await leaveTypesService.update(editing.id, form);
      else await leaveTypesService.create(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? `Edit ${editing.name}` : 'New Leave Type'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}><label>Name</label><input value={form.name} onChange={(e) => setField('name', e.target.value)} required /></div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Days Allowed</label><input type="number" value={form.days_allowed} onChange={(e) => setField('days_allowed', e.target.value)} required /></div>
        <div className={styles.field}><label>Max Carry Days</label><input type="number" value={form.max_carry_days} onChange={(e) => setField('max_carry_days', e.target.value)} /></div>
      </div>
      <label className={styles.checkboxField}><input type="checkbox" checked={form.is_paid} onChange={(e) => setField('is_paid', e.target.checked)} /> Paid Leave</label>
      <label className={styles.checkboxField}><input type="checkbox" checked={form.requires_approval} onChange={(e) => setField('requires_approval', e.target.checked)} /> Requires Approval</label>
      <label className={styles.checkboxField}><input type="checkbox" checked={form.carry_forward} onChange={(e) => setField('carry_forward', e.target.checked)} /> Allow Carry Forward</label>
      <div className={styles.field}><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
    </FormModal>
  );
}

function LeaveTypesTab({ canWrite }) {
  const { data, loading, error, refetch } = useApiResource(leaveTypesService);
  const filtered = useSearch(data, ['name', 'description']);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDelete(row) {
    if (!window.confirm(`Delete leave type "${row.name}"?`)) return;
    await leaveTypesService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'days_allowed', label: 'Days Allowed' },
    { key: 'is_paid', label: 'Paid', render: (r) => (r.is_paid ? 'Yes' : 'No') },
    { key: 'requires_approval', label: 'Needs Approval', render: (r) => (r.requires_approval ? 'Yes' : 'No') },
    { key: 'carry_forward', label: 'Carry Forward', render: (r) => (r.carry_forward ? 'Yes' : 'No') },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New Leave Type</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={canWrite ? (row) => (
          <>
            <button className={styles.iconBtn} onClick={() => openEdit(row)}><FiEdit2 /></button>
            <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)}><FiTrash2 /></button>
          </>
        ) : undefined}
      />
      {modalOpen && <LeaveTypeFormModal editing={editing} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}

/* ---------- Balances tab (read-only) ---------- */

function BalancesTab() {
  const { data, loading, error } = useApiResource(leaveBalancesService);
  const filtered = useSearch(data, ['leave_type_name', 'year']);
  const columns = [
    { key: 'employee', label: 'Employee ID' },
    { key: 'leave_type_name', label: 'Leave Type' },
    { key: 'year', label: 'Year' },
    { key: 'total_days', label: 'Total Days' },
    { key: 'used_days', label: 'Used Days' },
    { key: 'remaining_days', label: 'Remaining' },
  ];
  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <DataTable columns={columns} rows={filtered} loading={loading} emptyMessage="No leave balances found." />
    </div>
  );
}

/* ---------- Requests tab ---------- */

const TODAY = new Date().toISOString().slice(0, 10);

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days - 1);
  return d.toISOString().slice(0, 10);
}

function diffDays(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function RequestFormModal({ leaveTypes, onClose, onSaved }) {
  const [form, setForm] = useState({ leave_type: '', start_date: TODAY, end_date: TODAY, days_requested: 1, reason: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function handleStartChange(e) {
    const start = e.target.value;
    if (!start) return setForm((f) => ({ ...f, start_date: '' }));
    const end = addDays(start, form.days_requested || 1);
    setForm((f) => ({ ...f, start_date: start, end_date: end }));
  }

  function handleDaysChange(e) {
    const days = Math.max(1, parseInt(e.target.value, 10) || 1);
    const end = form.start_date ? addDays(form.start_date, days) : '';
    setForm((f) => ({ ...f, days_requested: days, end_date: end }));
  }

  function handleEndChange(e) {
    const end = e.target.value;
    if (!end) return setForm((f) => ({ ...f, end_date: '' }));
    const days = form.start_date ? diffDays(form.start_date, end) : form.days_requested;
    setForm((f) => ({ ...f, end_date: end, days_requested: days }));
  }

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await leaveRequestsService.create(form);
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? JSON.stringify(data) : 'Request failed. You may need an employee record before you can request leave.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="Request Leave" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Leave Type</label>
        <select value={form.leave_type} onChange={(e) => setField('leave_type', e.target.value)} required>
          <option value="">—</option>
          {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Start Date</label><input type="date" value={form.start_date} min={TODAY} onChange={handleStartChange} required /></div>
        <div className={styles.field}><label>End Date</label><input type="date" value={form.end_date} min={form.start_date || TODAY} onChange={handleEndChange} required /></div>
      </div>
      <div className={styles.field}><label>Days Requested</label><input type="number" min={1} value={form.days_requested} onChange={handleDaysChange} required /></div>
      <div className={styles.field}><label>Reason</label><textarea rows={3} value={form.reason} onChange={(e) => setField('reason', e.target.value)} required /></div>
    </FormModal>
  );
}

const LEVEL_LABELS = { 1: 'Supervisor', 2: 'Dept Head', 3: 'Senior Mgmt', 4: 'HR' };

/**
 * Returns the approval level the current user maps to for a given request,
 * mirroring the backend _get_approver_level logic.
 * row must include: supervisor_id, dept_head_id (added to serializer read fields).
 */
function getMyLevel(user, row) {
  if (!user) return null;
  if (row.supervisor_user_id && user.id === row.supervisor_user_id) return 1;
  if (row.dept_head_user_id && user.id === row.dept_head_user_id) return 2;
  if (user.role === ROLES.SENIOR_MANAGEMENT) return 3;
  if ([ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN].includes(user.role)) return 4;
  return null;
}

/**
 * Returns every level from current_level up to (myLevel - 1) that has an
 * assigned person, as an array of { level, label, person } objects.
 */
function getSkippedLevels(row, myLevel) {
  const skipped = [];
  for (let lvl = row.current_level; lvl < myLevel; lvl++) {
    if (lvl === 1 && !row.supervisor_user_id) continue;
    if (lvl === 2 && !row.dept_head_user_id) continue;
    if (lvl === 3 && !row.senior_mgmt_exists) continue;
    let person = null;
    if (lvl === 1) person = row.supervisor_name;
    else if (lvl === 2) person = row.dept_head_name;
    else if (lvl === 3 && row.senior_mgmt_names?.length) {
      person = row.senior_mgmt_names
        .map(([fn, ln]) => `${fn} ${ln}`.trim())
        .filter(Boolean)
        .join(', ');
    }
    skipped.push({ level: lvl, label: LEVEL_LABELS[lvl] || `Level ${lvl}`, person });
  }
  return skipped;
}

function RequestsTab({ canApprove }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiResource(leaveRequestsService);
  const filtered = useSearch(data, ['employee_name', 'leave_type_name', 'status', 'start_date', 'end_date']);
  const leaveTypesRes = useApiResource(leaveTypesService);
  const [modalOpen, setModalOpen] = useState(false);
  const [commentModal, setCommentModal] = useState(null); // { row, decision, override }
  const [comment, setComment] = useState('');

  function handleSaved() { setModalOpen(false); refetch(); }

  function openDecision(row, decision, override = false, myLevel = null) {
    setComment('');
    setCommentModal({ row, decision, override, myLevel });
  }

  async function submitDecision() {
    const { row, decision, override } = commentModal;
    await leaveRequestsService.approve(row.id, { decision, comment, ...(override && { override: true }) });
    setCommentModal(null);
    refetch();
  }

  async function handleCancel(row) {
    const isApproved = row.status === 'approved';
    const msg = isApproved
      ? 'Recall this approved leave request? The balance will be restored.'
      : 'Cancel this leave request?';
    if (!window.confirm(msg)) return;
    try {
      await leaveRequestsService.cancel(row.id);
      refetch();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Action failed.';
      window.alert(detail);
    }
  }

  const columns = [
    { key: 'employee_name', label: 'Employee', render: (r) => (
      <span className={styles.rowLink} onClick={() => navigate(`/leave/${r.id}`)}>{r.employee_name}</span>
    )},
    { key: 'leave_type_name', label: 'Type' },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date', label: 'End' },
    { key: 'days_requested', label: 'Days' },
    { key: 'current_level', label: 'Awaiting', render: (r) => r.status === 'pending' ? `${LEVEL_LABELS[r.current_level] || `Level ${r.current_level}`}` : '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
        <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}><FiPlus /> Request Leave</button>
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={(row) => {
          const isOwner = row.employee_user_id === user?.id;
          const isHR = [ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN].includes(user?.role);
          const canCancel = row.status === 'pending' && (isOwner || isHR);
          const canRecall = row.status === 'approved' && (isHR || (isOwner && row.start_date > TODAY));
          const cancelBtn = canCancel
            ? <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleCancel(row)} title="Cancel"><FiTrash2 /></button>
            : canRecall
            ? <button className={`${styles.iconBtn} ${styles.warnBtn}`} onClick={() => handleCancel(row)} title="Recall"><FiX /></button>
            : null;

          if (row.status !== 'pending' || !canApprove) return cancelBtn;
          const myLevel = getMyLevel(user, row);
          const required = row.current_level;
          if (myLevel === null) return cancelBtn;

          // Exact turn — normal approve / reject
          if (myLevel === required) return (
            <>
              <button className={`${styles.iconBtn} ${styles.successBtn}`} onClick={() => openDecision(row, 'approved')} title="Approve"><FiCheck /></button>
              <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => openDecision(row, 'rejected')} title="Reject"><FiX /></button>
              {cancelBtn}
            </>
          );

          // Higher level — can override, show warning button only
          if (myLevel > required) return (
            <>
              <button
                className={`${styles.iconBtn} ${styles.warnBtn}`}
                title={`Override: awaiting ${LEVEL_LABELS[required] || `Level ${required}`}`}
                onClick={() => openDecision(row, 'approved', true, myLevel)}
              >
                <FiAlertTriangle />
              </button>
              {cancelBtn}
            </>
          );

          // Lower level or not their turn — read-only, no action
          return cancelBtn;
        }}
      />
      {modalOpen && <RequestFormModal leaveTypes={leaveTypesRes.data} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
      {commentModal && (
        <FormModal
          title={
            commentModal.override
              ? `⚠️ Override Approval — bypassing ${LEVEL_LABELS[commentModal.row.current_level] || `Level ${commentModal.row.current_level}`}`
              : commentModal.decision === 'approved' ? 'Approve Request' : 'Reject Request'
          }
          onClose={() => setCommentModal(null)}
          onSubmit={(e) => { e.preventDefault(); submitDecision(); }}
          submitting={false}
          error={null}
        >
          {commentModal.override && (() => {
            const skipped = getSkippedLevels(commentModal.row, commentModal.myLevel);
            return (
              <div className={styles.overrideWarning}>
                <FiAlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>You are bypassing the following approval level{skipped.length !== 1 ? 's' : ''}:</strong>
                  <ul className={styles.skippedList}>
                    {skipped.map((s) => (
                      <li key={s.level}>
                        <strong>Level {s.level} — {s.label}</strong>
                        {s.person ? `: ${s.person}` : ' (no one assigned)'}
                      </li>
                    ))}
                  </ul>
                  Proceeding will record your approval directly and skip the above. You must provide a reason below.
                </div>
              </div>
            );
          })()}
          <div className={styles.field}>
            <label>Comment {commentModal.override ? '(required — state reason for override)' : '(optional)'}</label>
            <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} required={commentModal.override} />
          </div>
        </FormModal>
      )}
    </div>
  );
}

/* ---------- Page shell ---------- */

export default function LeaveList() {
  const { user } = useAuth();
  const [tab, setTab] = useState('requests');
  const canWriteTypes = IS_HR_OR_ADMIN.includes(user?.role);
  const canApprove = true; // chain membership enforced per-row by getMyLevel

  return (
    <DashboardLayout portalLabel="Leave Management" searchPlaceholder="Search leave requests…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Leave Management</h1>
          <p className={styles.sub}>Leave types, balances and requests.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'requests' ? styles.tabActive : ''}`} onClick={() => setTab('requests')}>Requests</button>
        <button className={`${styles.tab} ${tab === 'balances' ? styles.tabActive : ''}`} onClick={() => setTab('balances')}>Balances</button>
        <button className={`${styles.tab} ${tab === 'types' ? styles.tabActive : ''}`} onClick={() => setTab('types')}>Leave Types</button>
      </div>

      {tab === 'requests' && <RequestsTab canApprove={canApprove} />}
      {tab === 'balances' && <BalancesTab />}
      {tab === 'types' && <LeaveTypesTab canWrite={canWriteTypes} />}
    </DashboardLayout>
  );
}
