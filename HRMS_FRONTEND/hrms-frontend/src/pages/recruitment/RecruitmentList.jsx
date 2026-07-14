import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatusBadge from '../../components/common/StatusBadge';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { jobsService, applicationsService, interviewsService, offersService } from '../../services/recruitmentService';
import { departmentsService, positionsService, gradesService } from '../../services/employeesService';
import { userService } from '../../services/userService';
import { IS_HR_OR_ADMIN, IS_DEPARTMENT_HEAD_OR_ABOVE } from '../../utils/constants';
import styles from './RecruitmentList.module.css';

const JOB_TYPES = ['full_time', 'contract', 'intern', 'graduate'];
const JOB_STATUSES = ['draft', 'open', 'closed', 'cancelled'];
const APPLICATION_STATUSES = ['submitted', 'under_review', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn'];
const INTERVIEW_TYPES = ['phone', 'panel', 'technical', 'final'];
const INTERVIEW_OUTCOMES = ['pending', 'passed', 'failed', 'no_show'];
const OFFER_STATUSES = ['pending', 'accepted', 'declined'];

/* ---------- Jobs tab ---------- */

function JobFormModal({ editing, departments, positions, grades, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    department: editing.department?.id ?? editing.department,
    position: editing.position?.id ?? editing.position,
    grade: editing.grade?.id ?? editing.grade,
  } : {
    title: '', reference_no: '', department: '', position: '', grade: '',
    job_type: 'full_time', vacancies: 1, description: '', requirements: '',
    min_salary: '', max_salary: '', deadline: '', status: 'draft',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.position) delete payload.position;
      if (!payload.grade) delete payload.grade;
      if (editing) await jobsService.update(editing.id, payload);
      else await jobsService.create(payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? `Edit ${editing.reference_no}` : 'New Job Posting'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.row2}>
        <div className={styles.field}><label>Title</label><input value={form.title} onChange={(e) => setField('title', e.target.value)} required /></div>
        <div className={styles.field}><label>Reference No.</label><input value={form.reference_no} onChange={(e) => setField('reference_no', e.target.value)} required /></div>
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
          <label>Job Type</label>
          <select value={form.job_type} onChange={(e) => setField('job_type', e.target.value)}>
            {JOB_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Position (optional)</label>
          <select value={form.position} onChange={(e) => setField('position', e.target.value)}>
            <option value="">—</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Grade (optional)</label>
          <select value={form.grade} onChange={(e) => setField('grade', e.target.value)}>
            <option value="">—</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.field}><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} required /></div>
      <div className={styles.field}><label>Requirements</label><textarea rows={2} value={form.requirements} onChange={(e) => setField('requirements', e.target.value)} required /></div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Min Salary</label><input type="number" value={form.min_salary} onChange={(e) => setField('min_salary', e.target.value)} /></div>
        <div className={styles.field}><label>Max Salary</label><input type="number" value={form.max_salary} onChange={(e) => setField('max_salary', e.target.value)} /></div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Vacancies</label><input type="number" value={form.vacancies} onChange={(e) => setField('vacancies', e.target.value)} /></div>
        <div className={styles.field}><label>Deadline</label><input type="date" value={form.deadline} onChange={(e) => setField('deadline', e.target.value)} required /></div>
      </div>
      <div className={styles.field}>
        <label>Status</label>
        <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
          {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </FormModal>
  );
}

function JobsTab({ canWrite }) {
  const { data, loading, error, refetch } = useApiResource(jobsService);
  const filtered = useSearch(data, ['reference_no', 'title', 'department_name', 'job_type']);
  const departmentsRes = useApiResource(departmentsService);
  const positionsRes = useApiResource(positionsService);
  const gradesRes = useApiResource(gradesService);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDelete(row) {
    if (!window.confirm(`Delete job "${row.title}"?`)) return;
    await jobsService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'reference_no', label: 'Ref' },
    { key: 'title', label: 'Title' },
    { key: 'department_name', label: 'Department' },
    { key: 'job_type', label: 'Type' },
    { key: 'vacancies', label: 'Vacancies' },
    { key: 'application_count', label: 'Applications' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New Job</button>
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
      {modalOpen && (
        <JobFormModal
          editing={editing}
          departments={departmentsRes.data}
          positions={positionsRes.data}
          grades={gradesRes.data}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ---------- Applications tab ---------- */

function ApplicationFormModal({ openJobs, onClose, onSaved }) {
  const [job, setJob] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [cv, setCv] = useState(null);
  const [academicDocs, setAcademicDocs] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('job', job);
      formData.append('cover_letter', coverLetter);
      if (cv) formData.append('cv', cv);
      if (academicDocs) formData.append('academic_docs', academicDocs);
      await applicationsService.create(formData);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Application failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="Apply for a Job" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Job Posting</label>
        <select value={job} onChange={(e) => setJob(e.target.value)} required>
          <option value="">—</option>
          {openJobs.map((j) => <option key={j.id} value={j.id}>{j.reference_no} — {j.title}</option>)}
        </select>
      </div>
      <div className={styles.field}>
        <label>Cover Letter</label>
        <textarea rows={3} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label>CV / Resume</label>
        <input type="file" onChange={(e) => setCv(e.target.files[0])} required />
      </div>
      <div className={styles.field}>
        <label>Academic Documents (optional)</label>
        <input type="file" onChange={(e) => setAcademicDocs(e.target.files[0])} />
      </div>
    </FormModal>
  );
}

function ApplicationsTab({ canManage }) {
  const { data, loading, error, refetch } = useApiResource(applicationsService);
  const filtered = useSearch(data, ['job_ref', 'job_title', 'applicant_name', 'status']);
  const jobsRes = useApiResource(jobsService, { status: 'open' });
  const [modalOpen, setModalOpen] = useState(false);

  function handleSaved() { setModalOpen(false); refetch(); }

  async function handleStatusChange(row, newStatus) {
    await applicationsService.updateStatus(row.id, { status: newStatus });
    refetch();
  }

  const columns = [
    { key: 'job_ref', label: 'Job Ref' },
    { key: 'job_title', label: 'Job Title' },
    ...(canManage ? [{ key: 'applicant_name', label: 'Applicant' }] : []),
    { key: 'status', label: 'Status', render: (r) => (
      canManage ? (
        <select className={styles.statusSelect} value={r.status} onChange={(e) => handleStatusChange(r, e.target.value)}>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      ) : <StatusBadge status={r.status} />
    ) },
    { key: 'score', label: 'Score' },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
        <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}><FiPlus /> Apply for a Job</button>
      </div>
      <DataTable columns={columns} rows={filtered} loading={loading} />
      {modalOpen && (
        <ApplicationFormModal openJobs={jobsRes.data} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ---------- Interviews tab ---------- */

function InterviewFormModal({ editing, applications, users, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    application: editing.application?.id ?? editing.application,
  } : {
    application: '', interview_type: 'panel', scheduled_at: '', venue: '', link: '',
    panel_ids: [], outcome: 'pending', score: '', notes: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }
  function handlePanelChange(e) {
    const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
    setField('panel_ids', ids);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await interviewsService.update(editing.id, form);
      else await interviewsService.create(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? 'Edit Interview' : 'Schedule Interview'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Application</label>
        <select value={form.application} onChange={(e) => setField('application', e.target.value)} required>
          <option value="">—</option>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.job_ref} — {a.applicant_name}</option>)}
        </select>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Type</label>
          <select value={form.interview_type} onChange={(e) => setField('interview_type', e.target.value)}>
            {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Scheduled At</label>
          <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setField('scheduled_at', e.target.value)} required />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Venue</label><input value={form.venue} onChange={(e) => setField('venue', e.target.value)} /></div>
        <div className={styles.field}><label>Link (virtual)</label><input value={form.link} onChange={(e) => setField('link', e.target.value)} /></div>
      </div>
      <div className={styles.field}>
        <label>Panel Members</label>
        <select multiple value={form.panel_ids} onChange={handlePanelChange} style={{ height: '80px' }}>
          {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Outcome</label>
          <select value={form.outcome} onChange={(e) => setField('outcome', e.target.value)}>
            {INTERVIEW_OUTCOMES.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className={styles.field}><label>Score</label><input type="number" value={form.score} onChange={(e) => setField('score', e.target.value)} /></div>
      </div>
      <div className={styles.field}><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)} /></div>
    </FormModal>
  );
}

function InterviewsTab({ canWrite }) {
  const { data, loading, error, refetch } = useApiResource(interviewsService);
  const filtered = useSearch(data, ['interview_type', 'venue', 'outcome']);
  const applicationsRes = useApiResource(applicationsService);
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  React.useEffect(() => {
    if (modalOpen) userService.list().then(setUsers).catch(() => setUsers([]));
  }, [modalOpen]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDelete(row) {
    if (!window.confirm('Cancel this interview?')) return;
    await interviewsService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'application', label: 'Application', render: (r) => r.application?.job?.reference_no || r.application },
    { key: 'interview_type', label: 'Type' },
    { key: 'scheduled_at', label: 'Scheduled', render: (r) => new Date(r.scheduled_at).toLocaleString() },
    { key: 'venue', label: 'Venue' },
    { key: 'outcome', label: 'Outcome', render: (r) => <StatusBadge status={r.outcome} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> Schedule Interview</button>
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
      {modalOpen && (
        <InterviewFormModal editing={editing} applications={applicationsRes.data} users={users} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ---------- Offers tab ---------- */

function OfferFormModal({ editing, applications, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    application: editing.application?.id ?? editing.application,
  } : {
    application: '', offered_salary: '', start_date: '', status: 'pending', expires_at: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await offersService.update(editing.id, form);
      else await offersService.create(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? 'Edit Offer' : 'New Job Offer'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Application</label>
        <select value={form.application} onChange={(e) => setField('application', e.target.value)} required>
          <option value="">—</option>
          {applications.map((a) => <option key={a.id} value={a.id}>{a.job_ref} — {a.applicant_name}</option>)}
        </select>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Offered Salary</label><input type="number" value={form.offered_salary} onChange={(e) => setField('offered_salary', e.target.value)} required /></div>
        <div className={styles.field}><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} required /></div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Status</label>
          <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
            {OFFER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className={styles.field}><label>Expires At</label><input type="date" value={form.expires_at} onChange={(e) => setField('expires_at', e.target.value)} required /></div>
      </div>
    </FormModal>
  );
}

function OffersTab({ canWrite }) {
  const { data, loading, error, refetch } = useApiResource(offersService);
  const filtered = useSearch(data, ['offered_salary', 'status']);
  const applicationsRes = useApiResource(applicationsService);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }

  const columns = [
    { key: 'application', label: 'Application', render: (r) => r.application?.job?.reference_no || r.application },
    { key: 'offered_salary', label: 'Salary' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'expires_at', label: 'Expires' },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New Offer</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={canWrite ? (row) => (
          <button className={styles.iconBtn} onClick={() => openEdit(row)}><FiEdit2 /></button>
        ) : undefined}
      />
      {modalOpen && (
        <OfferFormModal editing={editing} applications={applicationsRes.data} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ---------- Page shell ---------- */

export default function RecruitmentList() {
  const { user } = useAuth();
  const [tab, setTab] = useState('jobs');
  const canManageJobs = IS_HR_OR_ADMIN.includes(user?.role);
  const canManageInterviews = IS_DEPARTMENT_HEAD_OR_ABOVE.includes(user?.role);
  const canManageOffers = IS_HR_OR_ADMIN.includes(user?.role);

  return (
    <DashboardLayout portalLabel="Recruitment" searchPlaceholder="Search jobs…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Recruitment</h1>
          <p className={styles.sub}>Job postings, applications, interviews and offers.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'jobs' ? styles.tabActive : ''}`} onClick={() => setTab('jobs')}>Jobs</button>
        <button className={`${styles.tab} ${tab === 'applications' ? styles.tabActive : ''}`} onClick={() => setTab('applications')}>Applications</button>
        {canManageInterviews && (
          <button className={`${styles.tab} ${tab === 'interviews' ? styles.tabActive : ''}`} onClick={() => setTab('interviews')}>Interviews</button>
        )}
        {canManageOffers && (
          <button className={`${styles.tab} ${tab === 'offers' ? styles.tabActive : ''}`} onClick={() => setTab('offers')}>Offers</button>
        )}
      </div>

      {tab === 'jobs' && <JobsTab canWrite={canManageJobs} />}
      {tab === 'applications' && <ApplicationsTab canManage={canManageJobs} />}
      {tab === 'interviews' && canManageInterviews && <InterviewsTab canWrite={canManageInterviews} />}
      {tab === 'offers' && canManageOffers && <OffersTab canWrite={canManageOffers} />}
    </DashboardLayout>
  );
}
