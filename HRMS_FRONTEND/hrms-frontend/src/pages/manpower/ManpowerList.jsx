import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSend } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatusBadge from '../../components/common/StatusBadge';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { manpowerPlansService, establishmentPostsService } from '../../services/manpowerService';
import { departmentsService, positionsService, gradesService } from '../../services/employeesService';
import { IS_DEPARTMENT_HEAD_OR_ABOVE, IS_MANAGEMENT, IS_HR_OR_ADMIN } from '../../utils/constants';
import styles from './ManpowerList.module.css';

/* ---------- Plans tab ---------- */

function PlanFormModal({ editing, departments, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    department: editing.department?.id ?? editing.department,
  } : {
    title: '', department: '', financial_year: '', current_staff: 0,
    required_staff: 0, budget: '', justification: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await manpowerPlansService.update(editing.id, form);
      } else {
        await manpowerPlansService.create(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      title={editing ? `Edit ${editing.title}` : 'New Manpower Plan'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      <div className={styles.field}>
        <label>Title</label>
        <input value={form.title} onChange={(e) => setField('title', e.target.value)} required />
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Department</label>
          <select value={form.department} onChange={(e) => setField('department', e.target.value)} required>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Financial Year</label>
          <input placeholder="2026/27" value={form.financial_year} onChange={(e) => setField('financial_year', e.target.value)} required />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Current Staff</label>
          <input type="number" value={form.current_staff} onChange={(e) => setField('current_staff', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Required Staff</label>
          <input type="number" value={form.required_staff} onChange={(e) => setField('required_staff', e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <label>Budget</label>
        <input type="number" step="0.01" value={form.budget} onChange={(e) => setField('budget', e.target.value)} />
      </div>
      <div className={styles.field}>
        <label>Justification</label>
        <textarea rows={3} value={form.justification} onChange={(e) => setField('justification', e.target.value)} />
      </div>
    </FormModal>
  );
}

function PlansTab({ canWrite, canApprove }) {
  const { data, loading, error, refetch } = useApiResource(manpowerPlansService);
  const filtered = useSearch(data, ['title', 'department_name', 'financial_year', 'status']);
  const departmentsRes = useApiResource(departmentsService);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }

  async function handleDelete(row) {
    if (!window.confirm(`Delete plan "${row.title}"?`)) return;
    await manpowerPlansService.remove(row.id);
    refetch();
  }
  async function handleSubmitForApproval(row) {
    await manpowerPlansService.update(row.id, { status: 'submitted' });
    refetch();
  }
  async function handleDecision(row, decision) {
    await manpowerPlansService.approve(row.id, { decision });
    refetch();
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'department_name', label: 'Department' },
    { key: 'financial_year', label: 'FY' },
    { key: 'current_staff', label: 'Current' },
    { key: 'required_staff', label: 'Required' },
    { key: 'gap', label: 'Gap', render: (r) => (
      <span className={r.gap > 0 ? styles.gapPositive : styles.gapZero}>{r.gap}</span>
    ) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New Plan</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={(row) => (
          <>
            {canWrite && <button className={styles.iconBtn} onClick={() => openEdit(row)}><FiEdit2 /></button>}
            {canWrite && row.status === 'draft' && (
              <button className={styles.iconBtn} onClick={() => handleSubmitForApproval(row)} title="Submit for approval"><FiSend /></button>
            )}
            {canApprove && row.status === 'submitted' && (
              <>
                <button className={`${styles.iconBtn} ${styles.successBtn}`} onClick={() => handleDecision(row, 'approved')} title="Approve"><FiCheck /></button>
                <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDecision(row, 'rejected')} title="Reject"><FiX /></button>
              </>
            )}
            {canWrite && (
              <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)}><FiTrash2 /></button>
            )}
          </>
        )}
      />
      {modalOpen && (
        <PlanFormModal
          editing={editing}
          departments={departmentsRes.data}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ---------- Establishment Posts tab ---------- */

function PostFormModal({ editing, plans, positions, grades, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    manpower_plan: editing.manpower_plan?.id ?? editing.manpower_plan,
    position: editing.position?.id ?? editing.position,
    grade: editing.grade?.id ?? editing.grade,
  } : {
    manpower_plan: '', position: '', grade: '', approved_count: 1, filled_count: 0, status: 'vacant', notes: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await establishmentPostsService.update(editing.id, form);
      } else {
        await establishmentPostsService.create(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      title={editing ? 'Edit Establishment Post' : 'New Establishment Post'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      <div className={styles.field}>
        <label>Manpower Plan</label>
        <select value={form.manpower_plan} onChange={(e) => setField('manpower_plan', e.target.value)} required>
          <option value="">—</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.financial_year})</option>)}
        </select>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Position</label>
          <select value={form.position} onChange={(e) => setField('position', e.target.value)} required>
            <option value="">—</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Grade</label>
          <select value={form.grade} onChange={(e) => setField('grade', e.target.value)}>
            <option value="">—</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Approved Count</label>
          <input type="number" value={form.approved_count} onChange={(e) => setField('approved_count', e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Filled Count</label>
          <input type="number" value={form.filled_count} onChange={(e) => setField('filled_count', e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <label>Status</label>
        <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
          <option value="vacant">Vacant</option>
          <option value="filled">Filled</option>
          <option value="frozen">Frozen</option>
        </select>
      </div>
      <div className={styles.field}>
        <label>Notes</label>
        <textarea rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
      </div>
    </FormModal>
  );
}

function PostsTab({ canCreate, canEdit }) {
  const { data, loading, error, refetch } = useApiResource(establishmentPostsService);
  const filtered = useSearch(data, ['position_title', 'grade_level', 'status']);
  const plansRes = useApiResource(manpowerPlansService);
  const positionsRes = useApiResource(positionsService);
  const gradesRes = useApiResource(gradesService);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDelete(row) {
    if (!window.confirm('Delete this establishment post?')) return;
    await establishmentPostsService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'position_title', label: 'Position' },
    { key: 'grade_level', label: 'Grade' },
    { key: 'approved_count', label: 'Approved' },
    { key: 'filled_count', label: 'Filled' },
    { key: 'vacant_count', label: 'Vacant' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canCreate && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New Post</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={canEdit ? (row) => (
          <>
            <button className={styles.iconBtn} onClick={() => openEdit(row)}><FiEdit2 /></button>
            <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)}><FiTrash2 /></button>
          </>
        ) : undefined}
      />
      {modalOpen && (
        <PostFormModal
          editing={editing}
          plans={plansRes.data}
          positions={positionsRes.data}
          grades={gradesRes.data}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ---------- Page shell ---------- */

export default function ManpowerList() {
  const { user } = useAuth();
  const [tab, setTab] = useState('plans');
  const canReadWrite = IS_DEPARTMENT_HEAD_OR_ABOVE.includes(user?.role);
  const canApprove = IS_MANAGEMENT.includes(user?.role);
  const canEditPosts = IS_HR_OR_ADMIN.includes(user?.role);

  if (!canReadWrite) {
    return (
      <DashboardLayout portalLabel="Manpower Planning" searchPlaceholder="Search plans…">
        <h1 className={styles.title}>Manpower Planning</h1>
        <div className={styles.card}>You don&apos;t have access to view manpower plans.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="Manpower Planning" searchPlaceholder="Search plans…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Manpower Planning</h1>
          <p className={styles.sub}>Staffing plans and establishment posts by department.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'plans' ? styles.tabActive : ''}`} onClick={() => setTab('plans')}>Plans</button>
        <button className={`${styles.tab} ${tab === 'posts' ? styles.tabActive : ''}`} onClick={() => setTab('posts')}>Establishment Posts</button>
      </div>

      {tab === 'plans' && <PlansTab canWrite={canReadWrite} canApprove={canApprove} />}
      {tab === 'posts' && <PostsTab canCreate={canReadWrite} canEdit={canEditPosts} />}
    </DashboardLayout>
  );
}
