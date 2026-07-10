import React, { useState } from 'react';
import { FiPlus, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import FormModal from '../../components/common/FormModal';
import StatusBadge from '../../components/common/StatusBadge';
import EmployeePicker from '../../components/common/EmployeePicker';
import { useApiResource } from '../../hooks/useApiResource';
import { useSearch } from '../../hooks/useSearch';
import { useAuth } from '../../context/AuthContext';
import { transfersService } from '../../services/transfersService';
import { employeesService, departmentsService, positionsService } from '../../services/employeesService';
import { IS_DEPARTMENT_HEAD_OR_ABOVE, IS_HR_OR_ADMIN } from '../../utils/constants';
import styles from './TransferList.module.css';

const TRANSFER_TYPES = ['transfer', 'rotation', 'secondment', 'promotion'];

function TransferFormModal({ employeeOptions, departments, positions, onClose, onSaved }) {
  const [form, setForm] = useState({
    employee: '', transfer_type: 'transfer', from_department: '', to_department: '',
    from_position: '', to_position: '', effective_date: '', end_date: '', reason: '',
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
      if (!payload.from_position) delete payload.from_position;
      if (!payload.to_position) delete payload.to_position;
      if (!payload.end_date) delete payload.end_date;
      await transfersService.create(payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal title="New Transfer / Rotation" onClose={onClose} onSubmit={handleSubmit} submitting={submitting} error={error}>
      <div className={styles.field}>
        <label>Employee</label>
        <EmployeePicker options={employeeOptions} value={form.employee} onChange={(id) => setField('employee', id)} />
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Type</label>
          <select value={form.transfer_type} onChange={(e) => setField('transfer_type', e.target.value)}>
            {TRANSFER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Effective Date</label>
          <input type="date" value={form.effective_date} onChange={(e) => setField('effective_date', e.target.value)} required />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>From Department</label>
          <select value={form.from_department} onChange={(e) => setField('from_department', e.target.value)} required>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>To Department</label>
          <select value={form.to_department} onChange={(e) => setField('to_department', e.target.value)} required>
            <option value="">—</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label>From Position (optional)</label>
          <select value={form.from_position} onChange={(e) => setField('from_position', e.target.value)}>
            <option value="">—</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>To Position (optional)</label>
          <select value={form.to_position} onChange={(e) => setField('to_position', e.target.value)}>
            <option value="">—</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label>End Date (for rotations/secondments)</label>
        <input type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
      </div>
      <div className={styles.field}>
        <label>Reason</label>
        <textarea rows={3} value={form.reason} onChange={(e) => setField('reason', e.target.value)} required />
      </div>
    </FormModal>
  );
}

export default function TransferList() {
  const { user } = useAuth();
  const canReadWrite = IS_DEPARTMENT_HEAD_OR_ABOVE.includes(user?.role);
  const canApprove = IS_HR_OR_ADMIN.includes(user?.role);

  const { data, loading, error, refetch } = useApiResource(transfersService);
  const filtered = useSearch(data, ['employee_id', 'employee_name', 'transfer_type', 'from_dept_name', 'to_dept_name', 'status']);
  const employeesRes = useApiResource(employeesService);
  const departmentsRes = useApiResource(departmentsService);
  const positionsRes = useApiResource(positionsService);
  const [modalOpen, setModalOpen] = useState(false);

  const employeeOptions = employeesRes.data.map((e) => ({ id: e.id, label: `${e.employee_id} — ${e.full_name}` }));

  function handleSaved() { setModalOpen(false); refetch(); }
  async function handleDecision(row, decision) {
    await transfersService.approve(row.id, { decision });
    refetch();
    employeesRes.refetch();
  }
  async function handleDelete(row) {
    if (!window.confirm('Cancel this transfer request?')) return;
    await transfersService.remove(row.id);
    refetch();
  }

  if (!canReadWrite) {
    return (
      <DashboardLayout portalLabel="Transfers & Rotation" searchPlaceholder="Search transfers…">
        <h1 className={styles.title}>Transfers &amp; Rotation</h1>
        <div className={styles.card}>You don&apos;t have access to view transfer records.</div>
      </DashboardLayout>
    );
  }

  const columns = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'employee_name', label: 'Employee' },
    { key: 'transfer_type', label: 'Type' },
    { key: 'from_dept_name', label: 'From' },
    { key: 'to_dept_name', label: 'To' },
    { key: 'effective_date', label: 'Effective' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <DashboardLayout portalLabel="Transfers & Rotation" searchPlaceholder="Search transfers…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Transfers &amp; Rotation</h1>
          <p className={styles.sub}>Employee transfers, rotations, secondments and promotions.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setModalOpen(true)}><FiPlus /> New Transfer</button>
      </div>

      <div className={styles.card}>
        {error && <div className={styles.errorBanner}>{error}</div>}
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          actions={(row) => (
            <>
              {canApprove && row.status === 'pending' && (
                <>
                  <button className={`${styles.iconBtn} ${styles.successBtn}`} onClick={() => handleDecision(row, 'approved')} title="Approve"><FiCheck /></button>
                  <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDecision(row, 'rejected')} title="Reject"><FiX /></button>
                </>
              )}
              {row.status === 'pending' && (
                <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(row)} title="Cancel"><FiTrash2 /></button>
              )}
            </>
          )}
        />
      </div>

      {modalOpen && (
        <TransferFormModal
          employeeOptions={employeeOptions}
          departments={departmentsRes.data}
          positions={positionsRes.data}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
}
