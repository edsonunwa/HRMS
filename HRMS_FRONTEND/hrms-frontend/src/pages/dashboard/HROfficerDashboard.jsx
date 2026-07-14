import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiZap, FiMoreVertical } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { employeesService } from '../../services/employeesService';
import { leaveRequestsService } from '../../services/leaveService';
import styles from './HROfficerDashboard.module.css';

const STATUS_MAP = { active:'ACTIVE', on_leave:'ON LEAVE', suspended:'SUSPENDED', probation:'PROBATION', terminated:'TERMINATED', retired:'RETIRED' };

export default function HROfficerDashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [empData, leaveData] = await Promise.all([
          employeesService.list({ limit: 5 }),
          leaveRequestsService.list({ limit: 5 }),
        ]);
        setEmployees(Array.isArray(empData) ? empData : empData.results || []);
        setLeaveRequests(Array.isArray(leaveData) ? leaveData : leaveData.results || []);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingLeaveCount = leaveRequests.filter((lr) => lr.status === 'pending').length;
  const activeEmployees = employees.filter((e) => e.employment_status === 'active').length;
  const totalEmployees = employees.length;

  if (loading) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search records, staff ID, or files…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard data…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search records, staff ID, or files…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search records, staff ID, or files…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Operations Overview</h1>
          <p className={styles.sub}>Real-time HR operations summary</p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.btnOutline} onClick={() => navigate('/reports')}><FiDownload /> Export Report</button>
          <button className={styles.btnPrimary} onClick={() => navigate('/workforce')}><FiZap /> Quick Action</button>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Pending Requests */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>📋 Pending Leave Requests</span>
            {pendingLeaveCount > 0 && <span className={styles.badge12}>{pendingLeaveCount} Pending</span>}
          </div>
          {leaveRequests.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No pending requests.</div>
          ) : (
            leaveRequests.slice(0, 5).map((lr) => (
              <div key={lr.id} className={styles.pipelineRow}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <strong>{lr.employee?.user?.full_name || lr.employee_name || 'Employee'}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {lr.leave_type_name || 'Leave'} — {lr.start_date} to {lr.end_date}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px',
                    background: lr.status === 'pending' ? '#fff3cd' : lr.status === 'approved' ? '#e6f4ea' : '#fdecea',
                    color: lr.status === 'pending' ? '#856404' : lr.status === 'approved' ? '#28a745' : '#dc3545',
                  }}>
                    {lr.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Stats */}
        <div className={styles.payrollCard}>
          <div className={styles.cardHeader}>📊 Workforce Summary</div>
          <div style={{ padding: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Employees</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{totalEmployees || '—'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: '#e6f4ea', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>ACTIVE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#28a745' }}>{activeEmployees}</div>
              </div>
              <div style={{ background: '#fff3cd', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>PENDING LEAVE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#856404' }}>{pendingLeaveCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Records */}
      <div className={styles.card} style={{ marginTop: 'var(--space-md)' }}>
        <div className={styles.cardHeader}>
          <span>🗃 Employee Records</span>
        </div>
        {employees.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No employee records found.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>ID</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 5).map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className={styles.empCell}>
                      <div className={styles.empAva}>
                        {((emp.user?.first_name?.[0] || '') + (emp.user?.last_name?.[0] || '')).toUpperCase() || 'E'}
                      </div>
                      {emp.user?.full_name || emp.full_name || emp.employee_id}
                    </div>
                  </td>
                  <td>{emp.employee_id}</td>
                  <td>{emp.department?.name || '—'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[emp.employment_status] || ''}`}>
                      {STATUS_MAP[emp.employment_status] || emp.employment_status?.toUpperCase() || '—'}
                    </span>
                  </td>
                  <td><FiMoreVertical className={styles.moreIcon} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}