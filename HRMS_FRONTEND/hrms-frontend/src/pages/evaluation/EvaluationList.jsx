import React, { useState, useEffect } from 'react';
import EvaluationDashboard from '../../components/evaluation/EvaluationDashboard';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatusBadge from '../../components/common/StatusBadge';
import EmployeePicker from '../../components/common/EmployeePicker';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { cyclesService, kpisService, reviewsService, jobEvaluationsService, evaluationService } from '../../services/evaluationService';
import { employeesService, positionsService, gradesService } from '../../services/employeesService';
import { IS_HR_OR_ADMIN, IS_DEPARTMENT_HEAD_OR_ABOVE } from '../../utils/constants';
import styles from './EvaluationList.module.css';

const PERIODS = ['annual', 'q1', 'q2', 'q3', 'q4'];

/* ---------- Cycles tab ---------- */

function CycleFormModal({ editing, onClose, onSaved }) {
  const [form, setForm] = useState(editing || { name: '', year: new Date().getFullYear(), period: 'annual', start_date: '', end_date: '', is_active: true });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await cyclesService.update(editing.id, form);
      else await cyclesService.create(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? `Edit ${editing.name}` : 'New Performance Cycle'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}><label>Name</label><input value={form.name} onChange={(e) => setField('name', e.target.value)} required /></div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Year</label><input type="number" value={form.year} onChange={(e) => setField('year', e.target.value)} required /></div>
        <div className={styles.field}>
          <label>Period</label>
          <select value={form.period} onChange={(e) => setField('period', e.target.value)}>
            {PERIODS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} required /></div>
        <div className={styles.field}><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} required /></div>
      </div>
      <label className={styles.checkboxField}><input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} /> Active</label>
    </FormModal>
  );
}

function CyclesTab({ canWrite }) {
  const { data, loading, error, refetch } = useApiResource(cyclesService);
  const filtered = useSearch(data, ['name', 'year', 'period']);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDelete(row) {
    if (!window.confirm(`Delete cycle "${row.name}"?`)) return;
    await cyclesService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'year', label: 'Year' },
    { key: 'period', label: 'Period' },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date', label: 'End' },
    { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New Cycle</button>
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
      {modalOpen && <CycleFormModal editing={editing} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}

/* ---------- KPIs tab ---------- */

function KPIFormModal({ editing, cycles, employeeOptions, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    cycle: editing.cycle?.id ?? editing.cycle,
    employee: editing.employee?.id ?? editing.employee,
  } : {
    cycle: '', employee: '', description: '', target: '', weight: 20, self_score: '', appraiser_score: '', evidence: '', comments: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await kpisService.update(editing.id, form);
      else await kpisService.create(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? 'Edit KPI' : 'New KPI'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Cycle</label>
          <select value={form.cycle} onChange={(e) => setField('cycle', e.target.value)} required>
            <option value="">—</option>
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Employee</label>
          <EmployeePicker options={employeeOptions} value={form.employee} onChange={(id) => setField('employee', id)} />
        </div>
      </div>
      <div className={styles.field}><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} required /></div>
      <div className={styles.field}><label>Target</label><textarea rows={2} value={form.target} onChange={(e) => setField('target', e.target.value)} required /></div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Weight (5-100)</label><input type="number" min={5} max={100} value={form.weight} onChange={(e) => setField('weight', e.target.value)} /></div>
        <div />
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Self Score</label><input type="number" step="0.01" value={form.self_score} onChange={(e) => setField('self_score', e.target.value)} /></div>
        <div className={styles.field}><label>Appraiser Score</label><input type="number" step="0.01" value={form.appraiser_score} onChange={(e) => setField('appraiser_score', e.target.value)} /></div>
      </div>
      <div className={styles.field}><label>Evidence</label><textarea rows={2} value={form.evidence} onChange={(e) => setField('evidence', e.target.value)} /></div>
      <div className={styles.field}><label>Comments</label><textarea rows={2} value={form.comments} onChange={(e) => setField('comments', e.target.value)} /></div>
    </FormModal>
  );
}

function KPIsTab() {
  const { data, loading, error, refetch } = useApiResource(kpisService);
  const filtered = useSearch(data, ['description', 'target', 'weight']);
  const cyclesRes = useApiResource(cyclesService);
  const employeesRes = useApiResource(employeesService);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const employeeOptions = employeesRes.data.map((e) => ({ id: e.id, label: `${e.employee_id} — ${e.full_name}` }));

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDelete(row) {
    if (!window.confirm('Delete this KPI?')) return;
    await kpisService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'description', label: 'Description' },
    { key: 'weight', label: 'Weight' },
    { key: 'self_score', label: 'Self Score' },
    { key: 'appraiser_score', label: 'Appraiser Score' },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
        <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New KPI</button>
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={(row) => (
          <>
            <button className={styles.iconBtn} onClick={() => openEdit(row)}><FiEdit2 /></button>
            <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)}><FiTrash2 /></button>
          </>
        )}
      />
      {modalOpen && (
        <KPIFormModal editing={editing} cycles={cyclesRes.data} employeeOptions={employeeOptions} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ---------- Reviews tab ---------- */

function ReviewFormModal({ cycles, employeeOptions, onClose, onSaved }) {
  const [form, setForm] = useState({ cycle: '', employee: '', self_comments: '', appraiser_comments: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await reviewsService.create(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="New Performance Review" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Cycle</label>
          <select value={form.cycle} onChange={(e) => setField('cycle', e.target.value)} required>
            <option value="">—</option>
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Employee</label>
          <EmployeePicker options={employeeOptions} value={form.employee} onChange={(id) => setField('employee', id)} />
        </div>
      </div>
      <div className={styles.field}><label>Self Comments</label><textarea rows={2} value={form.self_comments} onChange={(e) => setField('self_comments', e.target.value)} /></div>
      <div className={styles.field}><label>Appraiser Comments</label><textarea rows={2} value={form.appraiser_comments} onChange={(e) => setField('appraiser_comments', e.target.value)} /></div>
    </FormModal>
  );
}


function ReviewAppraisalModal({ review, cycles, onClose, onSaved }) {
  const [form, setForm] = useState({
    cycle: review.cycle?.id ?? '',
    employee: review.employee?.id ?? '',
    appraiser_score: review.appraiser_score ?? '',
    appraiser_comments: review.appraiser_comments ?? '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await evaluationService.submitReview(review.id, {
        appraiser_score: Number(form.appraiser_score),
        appraiser_comments: form.appraiser_comments,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="Appraise Performance Review" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Cycle</label>
          <select value={form.cycle} onChange={(e) => setField('cycle', e.target.value)} disabled>
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Employee</label>
          <input value={review.employee_name || ''} disabled />
        </div>
      </div>
      <div className={styles.field}>
        <label>Appraiser Score (0-100)</label>
        <input type="number" min="0" max="100" step="0.01" value={form.appraiser_score} onChange={(e) => setField('appraiser_score', e.target.value)} required />
      </div>
      <div className={styles.field}><label>Appraiser Comments</label><textarea rows={3} value={form.appraiser_comments} onChange={(e) => setField('appraiser_comments', e.target.value)} /></div>
    </FormModal>
  );
}


function ReviewSelfAssessModal({ review, onClose, onSaved }) {
  const [form, setForm] = useState({
    self_score: review.self_score ?? '',
    self_comments: review.self_comments ?? '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await evaluationService.selfAssess(review.id, {
        self_score: Number(form.self_score),
        self_comments: form.self_comments,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="Self Assessment" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Self Score (0-100)</label>
        <input type="number" min="0" max="100" step="0.01" value={form.self_score} onChange={(e) => setField('self_score', e.target.value)} required />
      </div>
      <div className={styles.field}><label>Self Comments</label><textarea rows={3} value={form.self_comments} onChange={(e) => setField('self_comments', e.target.value)} /></div>
    </FormModal>
  );
}


function ReviewApproveModal({ review, onClose, onSaved }) {
  const [action, setAction] = useState('approve');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await evaluationService.approveReview(review.id, { action });
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="Review Approval" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Decision</label>
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="approve">Approve</option>
          <option value="reject">Send Back</option>
        </select>
      </div>
    </FormModal>
  );
}

function ReviewsTab({ canWrite }) {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApiResource(reviewsService);
  const filtered = useSearch(data, ['employee_name', 'cycle_name', 'status']);
  const cyclesRes = useApiResource(cyclesService);

  const isDeptHead = user?.role === 'department_head';
  const isEmployee = user?.role === 'employee';
  const isHR = user?.role === 'hr_officer' || user?.role === 'hr_director';
  const isAdmin = user?.role === 'admin';

  const deptEmpRes = useApiResource(isDeptHead ? evaluationService.getDepartmentEmployees : () => Promise.resolve([]), { lazy: true });
  const employeesRes = useApiResource(employeesService);
  const employeeOptions = isDeptHead ? (deptEmpRes.data || []) : (employeesRes.data || []);
  useEffect(() => {
    if (isDeptHead && !deptEmpRes.data) deptEmpRes.refetch();
  }, [isDeptHead]);

  const [modalOpen, setModalOpen] = useState(false);
  const [appraisalModal, setAppraisalModal] = useState(null);
  const [selfAssessModal, setSelfAssessModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);

  function handleSaved() { setModalOpen(false); refetch(); }
  function handleAppraisalSaved() { setAppraisalModal(null); refetch(); }
  function handleSelfAssessSaved() { setSelfAssessModal(null); refetch(); }
  function handleApproveSaved() { setApproveModal(null); refetch(); }

  const columns = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'cycle_name', label: 'Cycle' },
    { key: 'overall_score', label: 'Score', render: (r) => r.overall_score ?? '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}><FiPlus /> New Review</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={(row) => (
          <>
            {isEmployee && row.status === 'pending' && (
              <button className={styles.iconBtn} onClick={() => setSelfAssessModal(row)} title="Self Assess">
                <FiEdit2 />
              </button>
            )}
            {isDeptHead && row.status === 'self_assessed' && (
              <button className={styles.iconBtn} onClick={() => setAppraisalModal(row)} title="Appraise">
                <FiEdit2 />
              </button>
            )}
            {(isHR || isAdmin) && row.status === 'reviewed' && (
              <button className={styles.iconBtn} onClick={() => setApproveModal(row)} title="Approve">
                <FiEdit2 />
              </button>
            )}
          </>
        )}
      />
      {modalOpen && (
        <ReviewFormModal cycles={cyclesRes.data} employeeOptions={employeeOptions} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
      {appraisalModal && (
        <ReviewAppraisalModal review={appraisalModal} cycles={cyclesRes.data} onClose={() => setAppraisalModal(null)} onSaved={handleAppraisalSaved} />
      )}
      {selfAssessModal && (
        <ReviewSelfAssessModal review={selfAssessModal} onClose={() => setSelfAssessModal(null)} onSaved={handleSelfAssessSaved} />
      )}
      {approveModal && (
        <ReviewApproveModal review={approveModal} onClose={() => setApproveModal(null)} onSaved={handleApproveSaved} />
      )}
    </div>
  );
}

/* ---------- Job Evaluations tab ---------- */

function JobEvalFormModal({ positions, grades, onClose, onSaved }) {
  const [position, setPosition] = useState('');
  const [skill, setSkill] = useState(30);
  const [effort, setEffort] = useState(20);
  const [responsibility, setResponsibility] = useState(30);
  const [conditions, setConditions] = useState(20);
  const [recommendedGrade, setRecommendedGrade] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalScore = Number(skill) + Number(effort) + Number(responsibility) + Number(conditions);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await jobEvaluationsService.create({
        position,
        criteria: { skill: Number(skill), effort: Number(effort), responsibility: Number(responsibility), conditions: Number(conditions) },
        total_score: totalScore,
        recommended_grade: recommendedGrade || null,
        notes,
        status: 'evaluated',
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="New Job Evaluation" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Position</label>
        <select value={position} onChange={(e) => setPosition(e.target.value)} required>
          <option value="">—</option>
          {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      <div className={styles.row4}>
        <div className={styles.field}><label>Skill</label><input type="number" value={skill} onChange={(e) => setSkill(e.target.value)} /></div>
        <div className={styles.field}><label>Effort</label><input type="number" value={effort} onChange={(e) => setEffort(e.target.value)} /></div>
        <div className={styles.field}><label>Responsibility</label><input type="number" value={responsibility} onChange={(e) => setResponsibility(e.target.value)} /></div>
        <div className={styles.field}><label>Conditions</label><input type="number" value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
      </div>
      <div className={styles.field}><label>Total Score</label><input value={totalScore} disabled /></div>
      <div className={styles.field}>
        <label>Recommended Grade</label>
        <select value={recommendedGrade} onChange={(e) => setRecommendedGrade(e.target.value)}>
          <option value="">—</option>
          {grades.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
      </div>
      <div className={styles.field}><label>Notes</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
    </FormModal>
  );
}

function JobEvaluationsTab() {
  const { data, loading, error, refetch } = useApiResource(jobEvaluationsService);
  const filtered = useSearch(data, ['position_title', 'recommended_grade_level', 'status']);
  const positionsRes = useApiResource(positionsService);
  const gradesRes = useApiResource(gradesService);
  const [modalOpen, setModalOpen] = useState(false);

  function handleSaved() { setModalOpen(false); refetch(); }

  const columns = [
    { key: 'position_title', label: 'Position' },
    { key: 'total_score', label: 'Total Score' },
    { key: 'recommended_grade_level', label: 'Recommended Grade' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
        <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}><FiPlus /> New Job Evaluation</button>
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} />
      {modalOpen && (
        <JobEvalFormModal positions={positionsRes.data} grades={gradesRes.data} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ---------- Dashboard tab ---------- */

function DashboardTab() {
  return <EvaluationDashboard />;
}

/* ---------- Page shell ---------- */

export default function EvaluationList() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const canManageCycles = IS_HR_OR_ADMIN.includes(user?.role);
  const canManageReviews = IS_DEPARTMENT_HEAD_OR_ABOVE.includes(user?.role);
  const canManageJobEval = IS_HR_OR_ADMIN.includes(user?.role);

  return (
    <DashboardLayout portalLabel="Performance Evaluation" searchPlaceholder="Search reviews…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Performance Evaluation</h1>
          <p className={styles.sub}>Performance cycles, KPIs, reviews and job evaluations.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'dashboard' ? styles.tabActive : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`${styles.tab} ${tab === 'reviews' ? styles.tabActive : ''}`} onClick={() => setTab('reviews')}>Reviews</button>
        <button className={`${styles.tab} ${tab === 'kpis' ? styles.tabActive : ''}`} onClick={() => setTab('kpis')}>KPIs</button>
        {canManageCycles && (
          <button className={`${styles.tab} ${tab === 'cycles' ? styles.tabActive : ''}`} onClick={() => setTab('cycles')}>Cycles</button>
        )}
        {canManageJobEval && (
          <button className={`${styles.tab} ${tab === 'jobEval' ? styles.tabActive : ''}`} onClick={() => setTab('jobEval')}>Job Evaluations</button>
        )}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'reviews' && <ReviewsTab canWrite={canManageReviews} />}
      {tab === 'kpis' && <KPIsTab />}
      {tab === 'cycles' && canManageCycles && <CyclesTab canWrite={canManageCycles} />}
      {tab === 'jobEval' && canManageJobEval && <JobEvaluationsTab />}
    </DashboardLayout>
  );
}
