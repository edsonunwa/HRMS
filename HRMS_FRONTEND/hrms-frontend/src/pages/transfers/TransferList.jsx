import React, { useEffect, useState } from 'react';
import { FiPlus, FiCheck, FiX, FiSlash } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatusBadge from '../../components/common/StatusBadge';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { transfersService } from '../../services/transfersService';
import { employeesService, departmentsService, positionsService, branchesService } from '../../services/employeesService';
import { IS_DEPARTMENT_HEAD_OR_ABOVE, IS_HR_OR_ADMIN, ROLES } from '../../utils/constants';
import styles from './TransferList.module.css';

const TRANSFER_TYPES = ['transfer', 'rotation', 'secondment', 'promotion'];

function formatPlacement(branch, department, position) {
  const parts = [branch, department, position].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

// Handles both shapes: value may already be a nested object ({id, name/title})
// or a plain ID that needs to be matched against a lookup list.
function resolveName(value, list, key = 'name') {
  if (!value) return '';
  if (typeof value === 'object') return value[key] || '';
  const match = list.find((item) => String(item.id) === String(value));
  return match ? match[key] : '';
}

function TransferFormModal({ branches, departments, positions, profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    transfer_type: 'transfer',
    to_branch: '',
    to_department: '',
    to_position: '',
    effective_date: '',
    end_date: '',
    reason: '',
  });

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const fromBranchName = resolveName(profile?.branch, branches, 'name');
  const fromDeptName = resolveName(profile?.department, departments, 'name');
  const fromPositionTitle = resolveName(profile?.position, positions, 'title');
  const toBranchName = branches.find((b) => String(b.id) === String(form.to_branch))?.name;
  const toDeptName = departments.find((d) => String(d.id) === String(form.to_department))?.name;
  const toPositionTitle = positions.find((p) => String(p.id) === String(form.to_position))?.title;

  const showEndDate = form.transfer_type === 'rotation' || form.transfer_type === 'secondment';

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = { ...form };

      if (!payload.to_position) delete payload.to_position;
      if (!showEndDate || !payload.end_date) delete payload.end_date;

      await transfersService.create(payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      title="New Transfer / Rotation"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      <div className={styles.summaryBox}>
        <div className={styles.field}>
          <label>Employee Name</label>
          <div className={styles.summaryValue}>{profile?.full_name || '—'}</div>
        </div>

        <div className={styles.field}>
          <label>From</label>
          <div className={styles.summaryValue}>
            {formatPlacement(
              fromBranchName,
              fromDeptName,
              fromPositionTitle,
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label>To</label>
          <div className={styles.summaryValue}>
            {formatPlacement(toBranchName, toDeptName, toPositionTitle)}
          </div>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Type</label>
          <select value={form.transfer_type} onChange={(e) => setField('transfer_type', e.target.value)}>
            {TRANSFER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>Effective Date</label>
          <input
            type="date"
            value={form.effective_date}
            onChange={(e) => setField('effective_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>To Branch</label>
          <select
            value={form.to_branch}
            onChange={(e) => setField('to_branch', e.target.value)}
            required
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>To Department</label>
          <select
            value={form.to_department}
            onChange={(e) => setField('to_department', e.target.value)}
            required
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>To Position (optional)</label>
          <select value={form.to_position} onChange={(e) => setField('to_position', e.target.value)}>
            <option value="">Select position</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {showEndDate && (
        <div className={styles.field}>
          <label>End Date (for rotations/secondments)</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setField('end_date', e.target.value)}
          />
        </div>
      )}

      <div className={styles.field}>
        <label>Reason</label>
        <textarea
          rows={3}
          value={form.reason}
          onChange={(e) => setField('reason', e.target.value)}
          required
        />
      </div>
    </FormModal>
  );
}

function TransferRecordFormModal({ branches, departments, positions, onClose, onSaved }) {
  const [form, setForm] = useState({
    transfer_type: 'transfer',
    to_branch: '',
    to_department: '',
    to_position: '',
    effective_date: '',
    end_date: '',
    reason: '',
  });

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeResults, setEmployeeResults] = useState([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!employeeQuery || employeeQuery.length < 2) {
      setEmployeeResults([]);
      return undefined;
    }

    let active = true;
    setSearchingEmployees(true);

    const timeout = setTimeout(() => {
      employeesService.list({ search: employeeQuery })
        .then((res) => {
          if (!active) return;
          const results = Array.isArray(res) ? res : res.results || [];
          setEmployeeResults(results);
        })
        .catch(() => {
          if (active) setEmployeeResults([]);
        })
        .finally(() => {
          if (active) setSearchingEmployees(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [employeeQuery]);

  async function handleSelectEmployee(basicEmp) {
    setEmployeeQuery('');
    setEmployeeResults([]);
    try {
      const full = await employeesService.get(basicEmp.id);
      setSelectedEmployee(full);
    } catch {
      setSelectedEmployee(basicEmp);
    }
  }

  const fromBranchName = resolveName(selectedEmployee?.branch, branches, 'name');
  const fromDeptName = resolveName(selectedEmployee?.department, departments, 'name');
  const fromPositionTitle = resolveName(selectedEmployee?.position, positions, 'title');
  const toBranchName = branches.find((b) => String(b.id) === String(form.to_branch))?.name;
  const toDeptName = departments.find((d) => String(d.id) === String(form.to_department))?.name;
  const toPositionTitle = positions.find((p) => String(p.id) === String(form.to_position))?.title;

  const showEndDate = form.transfer_type === 'rotation' || form.transfer_type === 'secondment';

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedEmployee) {
      setError('Please select an employee.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = { ...form, employee: selectedEmployee.id, is_hr_record: true };

      if (!payload.to_position) delete payload.to_position;
      if (!showEndDate || !payload.end_date) delete payload.end_date;

      await transfersService.create(payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      title="New Transfer Record"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      <div className={styles.summaryBox}>
        <div className={styles.field}>
          <label>Employee Name</label>
          {selectedEmployee ? (
            <div className={styles.summaryValue}>
              {selectedEmployee.full_name || selectedEmployee.employee_id}{' '}
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setSelectedEmployee(null)}
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search employee by name or ID…"
                value={employeeQuery}
                onChange={(e) => setEmployeeQuery(e.target.value)}
              />
              {searchingEmployees && (
                <div className={styles.summaryValue}>Searching…</div>
              )}
              {employeeResults.length > 0 && (
                <div className={styles.summaryBox}>
                  {employeeResults.map((emp) => (
                    <div
                      key={emp.id}
                      className={styles.summaryValue}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectEmployee(emp)}
                    >
                      {emp.employee_id} — {emp.full_name}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.field}>
          <label>From</label>
          <div className={styles.summaryValue}>
            {formatPlacement(
              fromBranchName,
              fromDeptName,
              fromPositionTitle,
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label>To</label>
          <div className={styles.summaryValue}>
            {formatPlacement(toBranchName, toDeptName, toPositionTitle)}
          </div>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Type</label>
          <select value={form.transfer_type} onChange={(e) => setField('transfer_type', e.target.value)}>
            {TRANSFER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>Effective Date</label>
          <input
            type="date"
            value={form.effective_date}
            onChange={(e) => setField('effective_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>To Branch</label>
          <select
            value={form.to_branch}
            onChange={(e) => setField('to_branch', e.target.value)}
            required
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>To Department</label>
          <select
            value={form.to_department}
            onChange={(e) => setField('to_department', e.target.value)}
            required
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>To Position (optional)</label>
          <select value={form.to_position} onChange={(e) => setField('to_position', e.target.value)}>
            <option value="">Select position</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {showEndDate && (
        <div className={styles.field}>
          <label>End Date (for rotations/secondments)</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setField('end_date', e.target.value)}
          />
        </div>
      )}

      <div className={styles.field}>
        <label>Reason</label>
        <textarea
          rows={3}
          value={form.reason}
          onChange={(e) => setField('reason', e.target.value)}
          required
        />
      </div>
    </FormModal>
  );
}

export default function TransferList() {
  const { user } = useAuth();

  const canReadWrite =
    IS_DEPARTMENT_HEAD_OR_ABOVE.includes(user?.role) ||
    user?.role === 'employee';

  const canApprove = IS_HR_OR_ADMIN.includes(user?.role);
  const isEmployee = user?.role === ROLES.EMPLOYEE;

  const { data, loading, error, refetch } = useApiResource(transfersService);
  const filtered = useSearch(data, [
    'employee_id',
    'employee_name',
    'transfer_type',
    'from_dept_name',
    'to_dept_name',
    'status',
  ]);

  const departmentsRes = useApiResource(departmentsService);
  const positionsRes = useApiResource(positionsService);
  const branchesRes = useApiResource(branchesService);

  const [modalOpen, setModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    if (!modalOpen) return;
    employeesService.me()
      .then(setMyProfile)
      .catch(() => setMyProfile(null));
  }, [modalOpen]);

  function handleSaved() {
    setModalOpen(false);
    refetch();
  }

  function handleRecordSaved() {
    setRecordModalOpen(false);
    refetch();
  }

  async function handleDecision(row, decision) {
    await transfersService.approve(row.id, { decision });
    refetch();
  }

  async function handleCancel(row) {
    if (!window.confirm('Cancel this transfer request?')) return;
    try {
      await transfersService.cancel(row.id);
      refetch();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Unable to cancel this request.';
      window.alert(detail);
    }
  }

  if (!canReadWrite) {
    return (
      <DashboardLayout portalLabel="Transfers & Rotation" searchPlaceholder="Search transfers…">
        <h1 className={styles.title}>Transfers &amp; Rotation</h1>
        <div className={styles.card}>
          You don&apos;t have access to view transfer records.
        </div>
      </DashboardLayout>
    );
  }

  const columns = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'employee_name', label: 'Employee' },
    { key: 'transfer_type', label: 'Type' },
    {
      key: 'from',
      label: 'From',
      render: (r) => formatPlacement(r.from_branch_name, r.from_dept_name, r.from_position_title),
    },
    {
      key: 'to',
      label: 'To',
      render: (r) => formatPlacement(r.to_branch_name, r.to_dept_name, r.to_position_title),
    },
    { key: 'effective_date', label: 'Effective' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const isHrCreated = r.is_hr_record && r.status === 'approved';
        return (
          <div className={styles.statusCell}>
            <StatusBadge status={r.status} label={isHrCreated ? 'Created' : undefined} />
            {(r.status === 'approved' || r.status === 'rejected') && r.approved_by_name && (
              <span className={styles.statusNote}>
                {isHrCreated ? 'Created' : (r.status === 'approved' ? 'Approved' : 'Rejected')} by{' '}
                {r.approved_by_role ? `${r.approved_by_role} ` : ''}
                {r.approved_by_name}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  function renderActions(row) {
    const isOwner = myProfile
      ? row.employee === myProfile.id
      : isEmployee && row.employee_name === (user?.full_name || user?.username);

    const canCancel = row.status === 'pending' && isEmployee && isOwner;

    return (
      <>
        {canApprove && row.status === 'pending' && (
          <>
            <button
              className={`${styles.iconBtn} ${styles.successBtn}`}
              onClick={() => handleDecision(row, 'approved')}
              title="Approve"
            >
              <FiCheck />
            </button>

            <button
              className={`${styles.iconBtn} ${styles.dangerBtn}`}
              onClick={() => handleDecision(row, 'rejected')}
              title="Reject"
            >
              <FiX />
            </button>
          </>
        )}

        {canCancel && (
          <button
            className={styles.iconBtn}
            onClick={() => handleCancel(row)}
            title="Cancel request"
          >
            <FiSlash />
          </button>
        )}
      </>
    );
  }

  const requestsRows = canApprove ? filtered.filter((r) => !r.is_hr_record) : filtered;
  const recordsRows = canApprove ? filtered.filter((r) => r.is_hr_record) : [];

  return (
    <DashboardLayout portalLabel="Transfers & Rotation" searchPlaceholder="Search transfers…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transfers &amp; Rotation</h1>
          <p className={styles.sub}>
            Employee transfers, rotations, secondments and promotions.
          </p>
        </div>

        {!canApprove && (
          <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}>
            <FiPlus /> New Transfer
          </button>
        )}
      </div>

      <div className={styles.card}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <DataTable
          columns={columns}
          rows={requestsRows}
          loading={loading}
          actions={renderActions}
        />
      </div>

      {canApprove && (
        <div className={styles.card} style={{ marginTop: 'var(--space-lg)' }}>
          <div className={styles.header} style={{ marginBottom: 'var(--space-sm)' }}>
            <h2 className={styles.title} style={{ fontSize: '1.1rem' }}>
              Transfer Records
            </h2>

            <button className={styles.btnPrimary} onClick={() => setRecordModalOpen(true)}>
              <FiPlus /> New Record
            </button>
          </div>
          <DataTable
            columns={columns}
            rows={recordsRows}
            loading={loading}
            actions={renderActions}
          />
        </div>
      )}

      {modalOpen && (
        <TransferFormModal
          departments={departmentsRes.data}
          positions={positionsRes.data}
          branches={branchesRes.data}
          profile={myProfile}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {recordModalOpen && (
        <TransferRecordFormModal
          departments={departmentsRes.data}
          positions={positionsRes.data}
          branches={branchesRes.data}
          onClose={() => setRecordModalOpen(false)}
          onSaved={handleRecordSaved}
        />
      )}
    </DashboardLayout>
  );
}