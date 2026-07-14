import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEye } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { employeesService } from '../../services/employeesService';
import { leaveRequestsService } from '../../services/leaveService';
import styles from './DeptHeadDashboard.module.css';

export default function DeptHeadDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [empData, leaveData] = await Promise.all([
          employeesService.list({ limit: 100 }),
          leaveRequestsService.list({ limit: 20 }),
        ]);
        setEmployees(Array.isArray(empData) ? empData : empData.results || []);
        setLeaveRequests(Array.isArray(leaveData) ? leaveData : leaveData.results || []);
      } catch (err) {
        setError('Failed to load department data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingRequests = leaveRequests.filter((lr) => lr.status === 'pending');
  const totalStaff = employees.length;
  const presentToday = employees.filter((e) => e.employment_status === 'active').length;
  const absentCount = totalStaff - presentToday;

  if (loading) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search team members or requests…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading department data…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search team members or requests…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search team members or requests…">
      <div className={styles.header}>
        <div>
          <p className={styles.overline}>OPERATIONAL OVERSIGHT</p>
          <h1 className={styles.title}>Department Manager Dashboard</h1>
        </div>
      </div>

      {/* Top KPIs */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiAttend}>
          <div className={styles.kpiAttendPct}>{totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0}% Attendance</div>
          <div className={styles.kpiAttendSub}>Present Today</div>
          <div className={styles.kpiAttendVal}>{presentToday} <span>/{totalStaff} Staff</span></div>
          {absentCount > 0 && <div className={styles.kpiAttendWarn}>⚠ {absentCount} Absentees</div>}
        </div>
        <div className={`${styles.kpiCard} ${styles.urgent}`}>
          <div className={styles.urgentTag}>Pending</div>
          <div className={styles.kpiLabel}>Pending Approvals</div>
          <div className={styles.kpiVal}>{pendingRequests.length}</div>
          <div className={styles.kpiSub}>Leave requests</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.perfLabel}>Department Staff</div>
          <div className={styles.perfSub}>Total team members</div>
          <div className={styles.perfVal}>{totalStaff}</div>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Approval Queue */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>Approval Queue</div>
                <div className={styles.cardSub}>Review leave submissions</div>
              </div>
            </div>
            {pendingRequests.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No pending requests.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Leave Type</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.slice(0, 5).map((lr) => (
                    <tr key={lr.id}>
                      <td>
                        <div className={styles.empCell}>
                          <div className={styles.ava}>
                            {((lr.employee?.user?.first_name?.[0] || '') + (lr.employee?.user?.last_name?.[0] || '')).toUpperCase() || 'E'}
                          </div>
                          <div>
                            <div className={styles.empName}>{lr.employee?.user?.full_name || lr.employee_name || 'Employee'}</div>
                            <div className={styles.empDept}>{lr.employee?.department?.name || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{lr.leave_type_name || 'Leave'}</td>
                      <td>{lr.start_date} — {lr.end_date}</td>
                      <td>
                        <span className={`${styles.sBadge} ${styles.awaiting}`}>AWAITING</span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.approveBtn}><FiCheck size={12} /></button>
                          <button className={styles.rejectBtn}><FiX size={12} /></button>
                          <button className={styles.viewBtn}><FiEye size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Team Overview */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Team Overview</div>
            </div>
            {employees.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No team data available.</div>
            ) : (
              employees.slice(0, 8).map((emp) => (
                <div key={emp.id} className={styles.shiftItem}>
                  <div className={styles.shiftHeader}>
                    <span className={styles.shiftLabel}>
                      {emp.user?.full_name || emp.full_name || emp.employee_id}
                    </span>
                    <span className={styles.shiftTag} style={{
                      background: emp.employment_status === 'active' ? '#28a745' : emp.employment_status === 'on_leave' ? '#ffc107' : '#dc3545'
                    }}>
                      {emp.employment_status === 'active' ? 'ACTIVE' : emp.employment_status === 'on_leave' ? 'ON LEAVE' : emp.employment_status?.toUpperCase() || '—'}
                    </span>
                  </div>
                  <div className={styles.shiftSub}>{emp.position_title || emp.department_name || '—'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}