import React, { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiUsers, FiBookOpen, FiAward, FiClipboard } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import EmployeePicker from '../../components/common/EmployeePicker';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { trainingProgramsService, traineesService, traineeAssessmentsService, traineeCoursesService } from '../../services/traineesService';
import { departmentsService, employeesService } from '../../services/employeesService';
import { userService } from '../../services/userService';
import { IS_HR_OR_ADMIN, IS_DEPARTMENT_HEAD_OR_ABOVE } from '../../utils/constants';
import styles from './TraineeList.module.css';

const PROGRAM_TYPES = ['graduate', 'internship'];
const PROGRAM_STATUSES = ['open', 'closed', 'completed'];
const TRAINEE_TYPES = ['graduate', 'intern'];
const TRAINEE_STATUSES = ['active', 'completed', 'terminated', 'extended'];
const ASSESSMENT_PERIODS = ['monthly', 'midterm', 'final'];
const ASSESSMENT_GRADES = ['A', 'B', 'C', 'D'];

/* ---------- Programs tab ---------- */

function ProgramFormModal({ editing, departments, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    department: editing.department?.id ?? editing.department,
  } : {
    title: '', program_type: 'graduate', department: '', start_date: '', end_date: '',
    capacity: 10, description: '', requirements: '', status: 'open',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await trainingProgramsService.update(editing.id, form);
      else await trainingProgramsService.create(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? `Edit ${editing.title}` : 'New Training Program'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}><label>Title</label><input value={form.title} onChange={(e) => setField('title', e.target.value)} required /></div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Program Type</label>
          <select value={form.program_type} onChange={(e) => setField('program_type', e.target.value)}>
            {PROGRAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Department</label>
          <select value={form.department} onChange={(e) => setField('department', e.target.value)} required>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} required /></div>
        <div className={styles.field}><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} required /></div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Capacity</label><input type="number" value={form.capacity} onChange={(e) => setField('capacity', e.target.value)} /></div>
        <div className={styles.field}>
          <label>Status</label>
          <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
            {PROGRAM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.field}><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
      <div className={styles.field}><label>Requirements</label><textarea rows={2} value={form.requirements} onChange={(e) => setField('requirements', e.target.value)} /></div>
    </FormModal>
  );
}

function ProgramsTab({ canWrite }) {
  const { data, loading, error, refetch } = useApiResource(trainingProgramsService);
  const filtered = useSearch(data, ['title', 'program_type', 'department_name', 'status']);
  const departmentsRes = useApiResource(departmentsService);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailProgram, setDetailProgram] = useState(null);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(row) { setEditing(row); setModalOpen(true); }
  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDelete(row) {
    if (!window.confirm(`Delete program "${row.title}"?`)) return;
    await trainingProgramsService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'program_type', label: 'Type' },
    { key: 'department_name', label: 'Department' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'enrolled_count', label: 'Enrolled' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> New Program</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={(row) => (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className={styles.iconBtn} onClick={() => setDetailProgram(row)} title="View details"><FiEye /></button>
            {canWrite && (
              <>
                <button className={styles.iconBtn} onClick={() => openEdit(row)}><FiEdit2 /></button>
                <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)}><FiTrash2 /></button>
              </>
            )}
          </div>
        )}
      />
      {modalOpen && <ProgramFormModal editing={editing} departments={departmentsRes.data} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
      {detailProgram && <ProgramDetailModal program={detailProgram} onClose={() => setDetailProgram(null)} />}
    </div>
  );
}

/* ---------- Program Detail View ---------- */

function ProgramDetailModal({ program, onClose }) {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState('enrolled');

  useEffect(() => {
    async function load() {
      try {
        const res = await traineesService.list({ program: program.id });
        const list = Array.isArray(res) ? res : (res.results || []);
        setTrainees(list);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [program.id]);

  const activeTrainees = trainees.filter(t => t.status === 'active');
  const completedTrainees = trainees.filter(t => t.status === 'completed');

  return (
    <FormModal title={`${program.title}`} onClose={onClose} onSubmit={(e) => { e.preventDefault(); onClose(); }} submitLabel="Close">
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Type</span><span className={styles.siValue}>{program.program_type}</span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Department</span><span className={styles.siValue}>{program.department_name}</span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Capacity</span><span className={styles.siValue}>{program.capacity}</span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Enrolled</span><span className={styles.siValue}>{program.enrolled_count}</span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Status</span><span className={styles.siValue}><StatusBadge status={program.status} /></span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Coordinator</span><span className={styles.siValue}>{program.coordinator_name || '—'}</span></div>
      </div>
      {program.description && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{program.description}</p>}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.75rem' }}>
        <button className={`${styles.miniTab} ${viewTab === 'enrolled' ? styles.miniTabActive : ''}`} onClick={() => setViewTab('enrolled')}>
          Enrolled ({trainees.length})
        </button>
        <button className={`${styles.miniTab} ${viewTab === 'stats' ? styles.miniTabActive : ''}`} onClick={() => setViewTab('stats')}>
          Stats
        </button>
      </div>

      {viewTab === 'enrolled' && (
        <div>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading trainees…</div>
          ) : trainees.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No trainees enrolled yet.</div>
          ) : (
            <ul className={styles.miniList}>
              {trainees.map(t => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t.full_name} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>({t.trainee_type})</span></span>
                  <StatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {viewTab === 'stats' && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.siLabel}>Active</span>
            <span className={styles.siValue} style={{ color: 'var(--color-success)' }}>{activeTrainees.length}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.siLabel}>Completed</span>
            <span className={styles.siValue} style={{ color: 'var(--color-primary)' }}>{completedTrainees.length}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.siLabel}>Total</span>
            <span className={styles.siValue}>{trainees.length}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.siLabel}>Capacity Used</span>
            <span className={styles.siValue}>{program.capacity > 0 ? Math.round((trainees.length / program.capacity) * 100) : 0}%</span>
          </div>
        </div>
      )}
    </FormModal>
  );
}

/* ---------- Trainee detail (assessments/courses) ---------- */

function TraineeDetailModal({ trainee, onClose }) {
  const [assessments, setAssessments] = useState(trainee.assessments || []);
  const [courses, setCourses] = useState(trainee.courses || []);
  const [newAssessment, setNewAssessment] = useState({ period: 'monthly', score: '', grade: 'A', comments: '' });
  const [newCourse, setNewCourse] = useState({ title: '', completed: false, score: '' });

  async function addAssessment() {
    const created = await traineeAssessmentsService.create(trainee.id, newAssessment);
    setAssessments((a) => [...a, created]);
    setNewAssessment({ period: 'monthly', score: '', grade: 'A', comments: '' });
  }
  async function addCourse() {
    const created = await traineeCoursesService.create(trainee.id, newCourse);
    setCourses((c) => [...c, created]);
    setNewCourse({ title: '', completed: false, score: '' });
  }

  const completedCourses = courses.filter(c => c.completed).length;
  const progress = courses.length > 0 ? Math.round((completedCourses / courses.length) * 100) : 0;

  return (
    <FormModal title={`${trainee.full_name} — Details`} onClose={onClose} onSubmit={(e) => { e.preventDefault(); onClose(); }} submitLabel="Close">
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Type</span><span className={styles.siValue}>{trainee.trainee_type}</span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Program</span><span className={styles.siValue}>{trainee.program_title}</span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Department</span><span className={styles.siValue}>{trainee.department_name}</span></div>
        <div className={styles.summaryItem}><span className={styles.siLabel}>Status</span><span className={styles.siValue}><StatusBadge status={trainee.status} /></span></div>
      </div>

      <div className={styles.subSection}>
        <div className={styles.subSectionTitle}>Assessments ({assessments.length})</div>
        <ul className={styles.miniList}>
          {assessments.length === 0 && <li>No assessments yet.</li>}
          {assessments.map((a) => (
            <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ textTransform: 'capitalize' }}>{a.period}</span>
              <span>Score: {a.score}, Grade: <strong>{a.grade}</strong></span>
            </li>
          ))}
        </ul>
        <div className={styles.miniForm}>
          <select value={newAssessment.period} onChange={(e) => setNewAssessment((f) => ({ ...f, period: e.target.value }))}>
            {ASSESSMENT_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="number" placeholder="Score" value={newAssessment.score} onChange={(e) => setNewAssessment((f) => ({ ...f, score: e.target.value }))} style={{ width: '80px' }} />
          <select value={newAssessment.grade} onChange={(e) => setNewAssessment((f) => ({ ...f, grade: e.target.value }))}>
            {ASSESSMENT_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button type="button" className={`${styles.btnPrimary} ${styles.btnSmall}`} onClick={addAssessment}>Add</button>
        </div>
      </div>

      <div className={styles.subSection}>
        <div className={styles.subSectionTitle}>Courses ({completedCourses}/{courses.length} completed)</div>
        {courses.length > 0 && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-success)', borderRadius: '3px' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{progress}% complete</div>
          </div>
        )}
        <ul className={styles.miniList}>
          {courses.length === 0 && <li>No courses yet.</li>}
          {courses.map((c) => (
            <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{c.title}</span>
              <span style={{ fontSize: '0.75rem', color: c.completed ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                {c.completed ? '✓ Completed' : 'In Progress'}
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.miniForm}>
          <input placeholder="Course title" value={newCourse.title} onChange={(e) => setNewCourse((f) => ({ ...f, title: e.target.value }))} />
          <button type="button" className={`${styles.btnPrimary} ${styles.btnSmall}`} onClick={addCourse}>Add</button>
        </div>
      </div>
    </FormModal>
  );
}

/* ---------- Trainee Form (Create & Edit) ---------- */

function TraineeFormModal({ editing, programs, departments, employeeOptions, users, onClose, onSaved }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    user: editing.user?.id ?? editing.user,
    program: editing.program?.id ?? editing.program,
    department: editing.department?.id ?? editing.department,
    supervisor: (editing.supervisor?.id ?? editing.supervisor) || '',
  } : {
    user: '', program: '', department: '', supervisor: '', trainee_type: 'graduate',
    institution: '', course: '', registration_no: '', start_date: '', end_date: '',
    status: 'active', stipend: '', accommodation: false,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter programs by selected trainee_type
  const filteredPrograms = programs.filter(p => {
    if (!form.trainee_type) return true;
    if (form.trainee_type === 'graduate') return p.program_type === 'graduate';
    if (form.trainee_type === 'intern') return p.program_type === 'internship';
    return true;
  });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.supervisor) delete payload.supervisor;
      if (editing) await traineesService.update(editing.id, payload);
      else await traineesService.create(payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title={editing ? `Edit ${editing.full_name}` : 'New Trainee'} onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>User Account</label>
          <select value={form.user} onChange={(e) => setField('user', e.target.value)} required={!editing}>
            <option value="">—</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Program *</label>
          <select value={form.program} onChange={(e) => setField('program', e.target.value)} required>
            <option value="">— Select a program —</option>
            {filteredPrograms.length === 0 && (
              <option value="" disabled>No {form.trainee_type === 'intern' ? 'internship' : 'training'} programs available. Create one first.</option>
            )}
            {filteredPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.program_type === 'graduate' ? 'Graduate Trainee' : 'Internship'} — {p.department_name})
              </option>
            ))}
          </select>
          {programs.length > 0 && filteredPrograms.length === 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '4px' }}>
              No programs match the selected trainee type. Change trainee type or create a matching program.
            </div>
          )}
          {filteredPrograms.length > 0 && form.program && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Selected: {programs.find(p => String(p.id) === String(form.program))?.title || ''}
            </div>
          )}
        </div>
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
          <label>Supervisor (optional)</label>
          <EmployeePicker options={employeeOptions} value={form.supervisor} onChange={(id) => setField('supervisor', id)} />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Trainee Type</label>
          <select value={form.trainee_type} onChange={(e) => setField('trainee_type', e.target.value)}>
            {TRAINEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Status</label>
          <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
            {TRAINEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Institution</label><input value={form.institution} onChange={(e) => setField('institution', e.target.value)} /></div>
        <div className={styles.field}><label>Course</label><input value={form.course} onChange={(e) => setField('course', e.target.value)} /></div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} required /></div>
        <div className={styles.field}><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} required /></div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}><label>Registration No.</label><input value={form.registration_no} onChange={(e) => setField('registration_no', e.target.value)} /></div>
        <div className={styles.field}><label>Stipend</label><input type="number" value={form.stipend} onChange={(e) => setField('stipend', e.target.value)} /></div>
      </div>
      <label className={styles.checkboxField}><input type="checkbox" checked={form.accommodation} onChange={(e) => setField('accommodation', e.target.checked)} /> Accommodation Provided</label>
    </FormModal>
  );
}

/* ---------- Trainees tab ---------- */

function TraineesTab({ canWrite, programsAll, traineesAll }) {
  const { data, loading, error, refetch } = useApiResource(traineesService);
  const filtered = useSearch(data, ['full_name', 'program_title', 'department_name', 'trainee_type', 'status']);
  const programsRes = useApiResource(trainingProgramsService);
  const departmentsRes = useApiResource(departmentsService);
  const employeesRes = useApiResource(employeesService);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState(null);
  const [detailTrainee, setDetailTrainee] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (createModalOpen || editingTrainee) userService.list().then(setUsers).catch(() => setUsers([]));
  }, [createModalOpen, editingTrainee]);

  const employeeOptions = employeesRes.data.map((e) => ({ id: e.id, label: `${e.employee_id} — ${e.full_name}` }));

  function handleSaved() { setCreateModalOpen(false); setEditingTrainee(null); refetch(); }
  async function openDetail(row) {
    const detail = await traineesService.get(row.id);
    setDetailTrainee(detail);
  }

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'program_title', label: 'Program' },
    { key: 'department_name', label: 'Department' },
    { key: 'trainee_type', label: 'Type' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={() => { setEditingTrainee(null); setCreateModalOpen(true); }}><FiPlus /> New Trainee</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        actions={(row) => (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className={styles.iconBtn} onClick={() => openDetail(row)} title="View details"><FiEye /></button>
            {canWrite && <button className={styles.iconBtn} onClick={() => { setEditingTrainee(row); setCreateModalOpen(true); }} title="Edit"><FiEdit2 /></button>}
          </div>
        )}
      />
      {createModalOpen && (
        <TraineeFormModal
          editing={editingTrainee}
          programs={programsRes.data}
          departments={departmentsRes.data}
          employeeOptions={employeeOptions}
          users={users}
          onClose={() => { setCreateModalOpen(false); setEditingTrainee(null); }}
          onSaved={handleSaved}
        />
      )}
      {detailTrainee && <TraineeDetailModal trainee={detailTrainee} onClose={() => setDetailTrainee(null)} />}
    </div>
  );
}

/* ---------- Page shell ---------- */

export default function TraineeList() {
  const { user } = useAuth();
  const [tab, setTab] = useState('trainees');
  const programsRes = useApiResource(trainingProgramsService);
  const traineesRes = useApiResource(traineesService);
  const canManagePrograms = IS_HR_OR_ADMIN.includes(user?.role);
  const canManageTrainees = IS_DEPARTMENT_HEAD_OR_ABOVE.includes(user?.role);

  const programs = programsRes.data || [];
  const trainees = traineesRes.data || [];

  const totalPrograms = programs.length;
  const totalTrainees = trainees.length;
  const activeTrainees = trainees.filter(t => t.status === 'active').length;
  const interns = trainees.filter(t => t.trainee_type === 'intern').length;
  const gradTrainees = trainees.filter(t => t.trainee_type === 'graduate').length;
  const openPrograms = programs.filter(p => p.status === 'open').length;

  return (
    <DashboardLayout portalLabel="Trainees & Interns" searchPlaceholder="Search trainees…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Trainees &amp; Interns</h1>
          <p className={styles.sub}>Training programs, trainee records, assessments and courses.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Total Trainees" value={totalTrainees} icon={<FiUsers />} accent="#00244d" />
        <StatCard label="Active" value={activeTrainees} icon={<FiAward />} accent="#28a745" />
        <StatCard label="Graduate Trainees" value={gradTrainees} icon={<FiBookOpen />} accent="#005a9c" />
        <StatCard label="Interns" value={interns} icon={<FiClipboard />} accent="#fd7e14" />
        <StatCard label="Open Programs" value={openPrograms} icon={<FiBookOpen />} accent="#6f42c1" sub={`${totalPrograms} total`} />
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'trainees' ? styles.tabActive : ''}`} onClick={() => setTab('trainees')}>Trainees</button>
        {canManagePrograms && (
          <button className={`${styles.tab} ${tab === 'programs' ? styles.tabActive : ''}`} onClick={() => setTab('programs')}>Programs</button>
        )}
      </div>

      {tab === 'trainees' && <TraineesTab canWrite={canManageTrainees} programsAll={programs} traineesAll={trainees} />}
      {tab === 'programs' && canManagePrograms && <ProgramsTab canWrite={canManagePrograms} />}
    </DashboardLayout>
  );
}

