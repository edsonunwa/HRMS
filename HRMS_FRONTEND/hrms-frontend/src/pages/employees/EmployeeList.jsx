import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatusBadge from '../../components/common/StatusBadge';
import EmployeePicker from '../../components/common/EmployeePicker';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { employeesService, departmentsService, gradesService, positionsService, branchesService } from '../../services/employeesService';
import { IS_HR_OR_ADMIN, IS_DEPARTMENT_HEAD_OR_ABOVE } from '../../utils/constants';
import styles from './EmployeeList.module.css';

const GENDER_OPTIONS = [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'O', label: 'Other' }];
const EMPLOYMENT_STATUS_OPTIONS = ['active', 'on_leave', 'suspended', 'probation', 'terminated', 'retired'];
const CONTRACT_TYPE_OPTIONS = ['permanent', 'contract', 'casual', 'graduate', 'intern'];

/* ---------- Generic simple-resource tab (Departments / Grades / Positions) ---------- */

function GenericFormFields({ fields, form, setField }) {
  return (
    <>
      {fields.map((f) => (
        <div className={styles.field} key={f.key}>
          <label>{f.label}</label>
          {f.type === 'select' ? (
            <select value={form[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)}>
              <option value="">—</option>
              {f.options.map((o) => (
                <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
              ))}
            </select>
          ) : (
            <input
              type={f.type || 'text'}
              value={form[f.key] ?? ''}
              onChange={(e) => setField(f.key, e.target.value)}
              required={f.required}
            />
          )}
        </div>
      ))}
    </>
  );
}

function SimpleResourceTab({ service, fields, columns, searchKeys, canWrite }) {

  const { data, loading, error, refetch } = useApiResource(service);
  const filtered = useSearch(data, searchKeys || []);
  const [modalMode, setModalMode] = useState(null); // 'create' | editingRow | null
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = modalMode && modalMode !== 'create' ? modalMode : null;
  const isOpen = modalMode !== null;
  const [form, setForm] = useState({});

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function openCreate() {
    setFormError(null);
    setForm({});
    setModalMode('create');
  }
  function openEdit(row) {
    setFormError(null);
    setForm(row);
    setModalMode(row);
  }
  function close() {
    setModalMode(null);
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this record?')) return;
    await service.remove(row.id);
    refetch();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await service.update(editing.id, form);
      } else {
        await service.create(form);
      }
      close();
      refetch();
    } catch (err) {
      setFormError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> Add</button>
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
      {isOpen && (
        <FormModal
          title={editing ? 'Edit Record' : 'Add Record'}
          onClose={close}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          error={formError}
        >
          <GenericFormFields fields={fields} form={form} setField={setField} />
        </FormModal>
      )}
    </div>
  );
}

/* ---------- Employees tab ---------- */

function EmployeeFormModal({ editing, onClose, onSaved, departments, grades, positions, branches, employeeOptions }) {
  const [form, setForm] = useState(editing ? {
    ...editing,
    department_id: editing.department?.id ?? editing.department,
    position_id: editing.position?.id ?? editing.position,
    grade_id: editing.grade?.id ?? editing.grade,
    supervisor: editing.supervisor?.id ?? editing.supervisor,
  } : {
    // User fields (required for employee creation)
    first_name: '', last_name: '', email: '', phone: '',
    // Employee fields
    department_id: '', position_id: '', grade_id: '', supervisor: '',
    gender: 'M', date_of_birth: '', national_id: '', join_date: '',
    employment_status: 'active', contract_type: 'permanent', basic_salary: '',
    confirmation_date: '', termination_date: '',
    tin_number: '', nssf_number: '', nationality: 'Ugandan',
    address: '', next_of_kin: '', next_of_kin_contact: '', branch: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filteredPositions = positions.filter(
    (p) => !form.department_id || String(p.department?.id ?? p.department) === String(form.department_id)
  );

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleDepartmentChange(e) {
    setForm((f) => ({ ...f, department_id: e.target.value, position_id: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        // User fields
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || '',
        // Employee fields
        gender: form.gender,
        department_id: form.department_id,
        position_id: form.position_id,
        grade_id: form.grade_id || undefined,
        join_date: form.join_date,
        date_of_birth: form.date_of_birth || undefined,
        confirmation_date: form.confirmation_date || undefined,
        termination_date: form.termination_date || undefined,
        employment_status: form.employment_status,
        contract_type: form.contract_type,
        basic_salary: form.basic_salary || undefined,
        supervisor: form.supervisor || null,
        national_id: form.national_id || undefined,
        tin_number: form.tin_number,
        nssf_number: form.nssf_number,
        nationality: form.nationality,
        address: form.address,
        next_of_kin: form.next_of_kin,
        next_of_kin_contact: form.next_of_kin_contact,
        branch: form.branch || undefined,
      };
      if (editing) {
        // When editing, don't send user fields or branch
        const updatePayload = { ...payload };
        delete updatePayload.first_name;
        delete updatePayload.last_name;
        delete updatePayload.email;
        delete updatePayload.phone;
        await employeesService.update(editing.id, updatePayload);
      } else {
        await employeesService.create(payload);
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
      title={editing ? `Edit ${editing.employee_id}` : 'Add Employee'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      {!editing && (
        <>
          <div className={styles.sectionLabel}>Personal Information</div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>First Name *</label>
              <input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Last Name *</label>
              <input value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} required />
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setField('phone', e.target.value)}required />
            </div>
          </div>
        </>
      )}
      {editing && (
        <div className={styles.info}>
          Employee: <strong>{editing.employee_id}</strong> &mdash; {editing.full_name}
        </div>
      )}
      <div className={styles.sectionLabel}>Employment Details</div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Employee ID</label>
          <input value={editing ? editing.employee_id : '(Auto-generated on save)'} disabled />
        </div>
        <div className={styles.field}>
          <label>Gender</label>
          <select value={form.gender} onChange={(e) => setField('gender', e.target.value)}required>
            {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Department</label>
          <select value={form.department_id} onChange={handleDepartmentChange} required>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Position</label>
          <select value={form.position_id} onChange={(e) => setField('position_id', e.target.value)} required>
            <option value="">—</option>
            {filteredPositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Grade</label>
          <select value={form.grade_id} onChange={(e) => setField('grade_id', e.target.value)}required>
            <option value="">—</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Supervisor (optional)</label>
          <EmployeePicker options={employeeOptions} value={form.supervisor} onChange={(id) => setField('supervisor', id)} />
        </div>
      </div>
      {branches.length > 0 && (
        <div className={styles.field}>
          <label>Branch</label>
          <select value={form.branch} onChange={(e) => setField('branch', e.target.value)}required>
            <option value="">—</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Join Date</label>
          <input type="date" value={form.join_date} onChange={(e) => setField('join_date', e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label>Date of Birth</label>
          <input type="date" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)}required />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Employment Status</label>
          <select value={form.employment_status} onChange={(e) => setField('employment_status', e.target.value)}required>
            {EMPLOYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Contract Type</label>
          <select value={form.contract_type} onChange={(e) => setField('contract_type', e.target.value)}required>
            {CONTRACT_TYPE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label>Basic Salary</label>
        <input type="number" step="0.01" value={form.basic_salary} onChange={(e) => setField('basic_salary', e.target.value)} />
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Confirmation Date</label>
          <input type="date" value={form.confirmation_date} onChange={(e) => setField('confirmation_date', e.target.value)}required />
        </div>
        <div className={styles.field}>
          <label>Termination Date</label>
          <input type="date" value={form.termination_date} onChange={(e) => setField('termination_date', e.target.value)} />
        </div>
      </div>

      <div className={styles.sectionLabel}>Personal Details</div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>National ID</label>
          <input value={form.national_id} onChange={(e) => setField('national_id', e.target.value)}required />
        </div>
        <div className={styles.field}>
          <label>Nationality</label>
          <input value={form.nationality} onChange={(e) => setField('nationality', e.target.value)}required />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>TIN Number</label>
          <input value={form.tin_number} onChange={(e) => setField('tin_number', e.target.value)}required />
        </div>
        <div className={styles.field}>
          <label>NSSF Number</label>
          <input value={form.nssf_number} onChange={(e) => setField('nssf_number', e.target.value)}required />
        </div>
      </div>
      <div className={styles.field}>
        <label>Address</label>
        <textarea rows={2} value={form.address} onChange={(e) => setField('address', e.target.value)}required />
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Next of Kin</label>
          <input value={form.next_of_kin} onChange={(e) => setField('next_of_kin', e.target.value)}required />
        </div>
        <div className={styles.field}>
          <label>Next of Kin Contact</label>
          <input value={form.next_of_kin_contact} onChange={(e) => setField('next_of_kin_contact', e.target.value)}required />
        </div>
      </div>
    </FormModal>
  );
}

function EmployeesTab({ canWrite }) {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApiResource(employeesService);
  const filtered = useSearch(data, ['employee_id', 'full_name', 'department_name', 'position_title', 'employment_status', 'contract_type']);
  const departmentsRes = useApiResource(departmentsService);
  const gradesRes = useApiResource(gradesService);
  const positionsRes = useApiResource(positionsService);
  const branchesRes = useApiResource(branchesService);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // List rows use the lightweight EmployeeListSerializer (full_name, department_name, position_title —
  // no ids), so the picker needs employee_id + full_name, not the detail-shaped nested objects.
  const employeeOptions = data.map((e) => ({
    id: e.id,
    label: `${e.employee_id} — ${e.full_name}`,
  }));

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  async function openEdit(row) {
    setLoadingEdit(true);
    try {
      const detail = await employeesService.get(row.id);
      setEditing(detail);
      setModalOpen(true);
    } finally {
      setLoadingEdit(false);
    }
  }
  function handleSaved() {
    setModalOpen(false);
    refetch();
  }
  async function handleDelete(row) {
    if (!window.confirm(`Delete employee "${row.employee_id}"?`)) return;
    await employeesService.remove(row.id);
    refetch();
  }

  const columns = [
    { key: 'employee_id', label: 'ID' },
    { key: 'full_name', label: 'Name', render: (r) => (
      <span className={styles.employeeName}>{r.full_name}</span>
    ) },
    { key: 'department_name', label: 'Department' },
    { key: 'position_title', label: 'Position' },
    { key: 'employment_status', label: 'Status', render: (r) => <StatusBadge status={r.employment_status} /> },
    { key: 'contract_type', label: 'Contract' },
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> Add Employee</button>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        onRowClick={(row) => navigate(`/workforce/${row.id}`)}
        actions={canWrite ? (row) => (
          <>
            <button className={styles.iconBtn} onClick={() => openEdit(row)} disabled={loadingEdit}><FiEdit2 /></button>
            <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)}><FiTrash2 /></button>
          </>
        ) : undefined}
      />
      {modalOpen && (
        <EmployeeFormModal
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          departments={departmentsRes.data}
          grades={gradesRes.data}
          positions={positionsRes.data}
          branches={branchesRes.data}
          employeeOptions={employeeOptions}
        />
      )}
    </div>
  );
}

/* ---------- Page shell with tabs ---------- */

// Read-access requirements mirror each endpoint's backend permission class:
// EmployeeListCreateView -> IsDepartmentHeadOrAbove, Grade/PositionListCreateView -> IsHROrAdmin,
// DepartmentListCreateView -> IsAuthenticated (anyone logged in can read departments).
const ALL_TABS = [
  { key: 'employees', label: 'Employees', canRead: (role) => IS_DEPARTMENT_HEAD_OR_ABOVE.includes(role) },
  { key: 'departments', label: 'Departments', canRead: () => true },
  { key: 'grades', label: 'Grades', canRead: (role) => IS_HR_OR_ADMIN.includes(role) },
  { key: 'positions', label: 'Positions', canRead: (role) => IS_HR_OR_ADMIN.includes(role) },
  { key: 'branches', label: 'Branches', canRead: (role) => IS_HR_OR_ADMIN.includes(role) },
];

function DepartmentsTab({ canWrite }) {
  const { data, loading, error, refetch } = useApiResource(departmentsService);
  const filtered = useSearch(data, ['name', 'code', 'region']);
  const [modalMode, setModalMode] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deptHeadUsers, setDeptHeadUsers] = useState([]);

  const editing = modalMode && modalMode !== 'create' ? modalMode : null;
  const isOpen = modalMode !== null;
  const [form, setForm] = useState({ name: '', code: '', region: '', description: '', head: '' });

  React.useEffect(() => {
    try {
      // Fetch users for department head selection — just admins and HR
      const { userService } = require('../../services/userService');
      userService.list().then((users) => {
        setDeptHeadUsers(users.filter((u) => u.role === 'department_head'));
      }).catch(() => {});
    } catch (_) {}
  }, []);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  function openCreate() {
    setFormError(null);
    setForm({ name: '', code: '', region: '', description: '', head: '' });
    setModalMode('create');
  }
  function openEdit(row) {
    setFormError(null);
    setForm({
      name: row.name || '',
      code: row.code || '',
      region: row.region || '',
      description: row.description || '',
      head: row.head ?? '',
    });
    setModalMode(row);
  }
  function close() { setModalMode(null); }

  async function handleDelete(row) {
    if (!window.confirm('Delete this department?')) return;
    await departmentsService.remove(row.id);
    refetch();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        region: form.region,
        description: form.description,
        head: form.head || null,
      };
      if (editing) await departmentsService.update(editing.id, payload);
      else await departmentsService.create(payload);
      close();
      refetch();
    } catch (err) {
      setFormError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'region', label: 'Region' },
    { key: 'head', label: 'Head', render: (r) => {
      if (!r.head) return <span style={{ color: 'var(--color-text-muted)' }}>Not assigned</span>;
      const u = deptHeadUsers.find((u) => u.id === r.head);
      return u ? `${u.first_name} ${u.last_name}`.trim() || u.username : `User #${r.head}`;
    }},
  ];

  return (
    <div className={styles.card}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> Add</button>
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
      {isOpen && (
        <FormModal
          title={editing ? 'Edit Department' : 'Add Department'}
          onClose={close}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          error={formError}
        >
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label>Code</label>
              <input value={form.code} onChange={(e) => setField('code', e.target.value)} required />
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Region</label>
              <input value={form.region} onChange={(e) => setField('region', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Department Head</label>
              <select value={form.head} onChange={(e) => setField('head', e.target.value)}>
                <option value="">— Not assigned —</option>
                {deptHeadUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.first_name} ${u.last_name}`.trim() || u.username} ({u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label>Description</label>
            <input value={form.description} onChange={(e) => setField('description', e.target.value)} />
          </div>
        </FormModal>
      )}
    </div>
  );
}

function PositionsTab({ canWrite }) {
  const { data: departmentsData, loading: departmentsLoading, error: departmentsError } = useApiResource(departmentsService);
  const departments = departmentsData || [];


  const { data, loading, error, refetch } = useApiResource(positionsService);
  const filtered = useSearch(data, ['title', 'department.name', 'grade.title']);
  const [modalMode, setModalMode] = useState(null);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const editing = modalMode && modalMode !== 'create' ? modalMode : null;
  const isOpen = modalMode !== null;
  const [form, setForm] = useState({ title: '', description: '', department: '' });

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setFormError(null);
    setForm({ title: '', description: '', department: '' });
    setModalMode('create');
  }
  function openEdit(row) {
    setFormError(null);
    setForm({
      title: row.title || '',
      description: row.description || '',
      department: row.department?.id ?? row.department ?? '',
    });
    setModalMode(row);
  }
  function close() {
    setModalMode(null);
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this record?')) return;
    await positionsService.remove(row.id);
    refetch();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || '',
        department: form.department,
      };
      if (editing) {
        await positionsService.update(editing.id, payload);
      } else {
        await positionsService.create(payload);
      }
      close();
      refetch();
    } catch (err) {
      setFormError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'department', label: 'Department', render: (r) => r.department?.name || r.department },
    { key: 'grade', label: 'Grade', render: (r) => r.grade?.title || r.grade },
    { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
  ];

  return (
    <div className={styles.card}>
      {(error || departmentsError) && <div className={styles.errorBanner}>{JSON.stringify(error?.detail || departmentsError?.detail || error || departmentsError)}</div>}
      {canWrite && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /> Add</button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading || departmentsLoading}
        actions={canWrite ? (row) => (
          <>
            <button className={styles.iconBtn} onClick={() => openEdit(row)}><FiEdit2 /></button>
            <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)}><FiTrash2 /></button>
          </>
        ) : undefined}
      />

      {isOpen && (
        <FormModal
          title={editing ? 'Edit Record' : 'Add Record'}
          onClose={close}
          onSubmit={handleFormSubmit}
          submitting={submitting}
          error={formError}
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
              <label>Description</label>
              <input value={form.description} onChange={(e) => setField('description', e.target.value)} />
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}

export default function EmployeeList() {
  const { user } = useAuth();
  const visibleTabs = ALL_TABS.filter((t) => t.canRead(user?.role));
  const [tab, setTab] = useState(() => visibleTabs[0]?.key || 'departments');
  const canWriteEmployees = IS_DEPARTMENT_HEAD_OR_ABOVE.includes(user?.role);
  const canWriteLookups = IS_HR_OR_ADMIN.includes(user?.role);

  return (
    <DashboardLayout portalLabel="Workforce" searchPlaceholder="Search employees…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workforce</h1>
          <p className={styles.sub}>Employee records, departments, grades and positions.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'employees' && <EmployeesTab canWrite={canWriteEmployees} />}
      {tab === 'departments' && (
        <DepartmentsTab canWrite={canWriteLookups} />
      )}
      {tab === 'grades' && (
        <SimpleResourceTab
          service={gradesService}
          canWrite={canWriteLookups}
          searchKeys={['title', 'level']}
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'level', label: 'Level' },
            { key: 'min_salary', label: 'Min Salary' },
            { key: 'max_salary', label: 'Max Salary' },
          ]}
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'level', label: 'Level', required: true },
            { key: 'min_salary', label: 'Min Salary', type: 'number' },
            { key: 'max_salary', label: 'Max Salary', type: 'number' },
            { key: 'description', label: 'Description' },
          ]}
        />
      )}
      {tab === 'positions' && (
        <PositionsTab canWrite={canWriteLookups} />
      )}
      {tab === 'branches' && (
        <SimpleResourceTab
          service={branchesService}
          canWrite={canWriteLookups}
          searchKeys={['name', 'code', 'location']}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'code', label: 'Code' },
            { key: 'location', label: 'Location' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'code', label: 'Code', required: true },
            { key: 'location', label: 'Location' },
          ]}
        />
      )}
    </DashboardLayout>
  );
}