import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiActivity, FiDatabase, FiShield, FiUsers, FiAlertTriangle, FiRefreshCw, FiDownload } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { employeesService } from '../../services/employeesService';
import { reportsService } from '../../services/reportsService';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [headcount, setHeadcount] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [hc, empData] = await Promise.all([
          reportsService.getHeadcount(),
          employeesService.list({ limit: 10 }),
        ]);
        setHeadcount(hc);
        setEmployees(Array.isArray(empData) ? empData : empData.results || []);
      } catch (err) {
        setError('Failed to load system data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const total = headcount?.total || 0;
  const deptCount = headcount?.by_dept?.length || 0;
  const statusCounts = {
    active: employees.filter((e) => e.employment_status === 'active').length,
    on_leave: employees.filter((e) => e.employment_status === 'on_leave').length,
    probation: employees.filter((e) => e.employment_status === 'probation').length,
  };

  if (loading) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search system resources…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading system data…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search system resources…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="HR Operations Portal" searchPlaceholder="Search system resources…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Administration Dashboard</h1>
          <p className={styles.sub}>Real-time system health and workforce overview.</p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.btnOutline} onClick={() => window.location.reload()}><FiRefreshCw /> Refresh</button>
          <button className={styles.btnPrimary} onClick={() => navigate('/settings')}><FiDownload /> Settings</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><FiActivity /> TOTAL WORKFORCE</div>
          <div className={styles.kpiVal}>{total.toLocaleString()}</div>
          <div className={styles.kpiOk}>● All employee records active</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}><FiDatabase /> DEPARTMENTS</div>
          <div className={styles.kpiVal}>{deptCount}</div>
          <div className={styles.kpiOk}>▼ Active organisational units</div>
        </div>
        <div className={styles.threatsCard}>
          <div className={styles.threatsTop}><FiShield className={styles.shieldIcon} /> SYSTEM STATUS</div>
          <div className={styles.threatsNum}>OK</div>
          <div className={styles.threatsTxt}>All systems operational</div>
              <button className={styles.logsBtn} onClick={() => navigate('/settings')}>View Audit Logs</button>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Recent Employees */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span><FiUsers /> Recent Employee Records</span>
          </div>
          {employees.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No employee records found.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.ava}>
                          {((emp.user?.first_name?.[0] || '') + (emp.user?.last_name?.[0] || '')).toUpperCase() || 'E'}
                        </div>
                        <div>
                          <div className={styles.uName}>{emp.user?.full_name || emp.full_name || emp.employee_id}</div>
                          <div className={styles.uEmail}>{emp.email || emp.user?.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{emp.employee_id}</td>
                    <td>{emp.department_name || emp.department?.name || '—'}</td>
                    <td>
                      <span className={`${styles.statusPill} ${emp.employment_status === 'active' ? styles.active : styles.inactive}`}>
                        {emp.employment_status === 'active' ? 'Active' : emp.employment_status === 'on_leave' ? 'On Leave' : emp.employment_status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* System Info */}
        <div className={styles.rightStack}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span><FiAlertTriangle style={{ color: '#FFC107' }} /> System Health</span>
            </div>
            <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem' }}>Total Records</span>
              <strong>{total}</strong>
            </div>
            <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem' }}>Active</span>
              <strong style={{ color: '#28a745' }}>{statusCounts.active}</strong>
            </div>
            <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem' }}>On Leave</span>
              <strong style={{ color: '#ffc107' }}>{statusCounts.on_leave}</strong>
            </div>
            <div style={{ padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem' }}>Probation</span>
              <strong style={{ color: '#856404' }}>{statusCounts.probation}</strong>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}><span>Quick Actions</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className={styles.logsBtn} onClick={() => navigate('/workforce')}>View All Employees</button>
              <button className={styles.logsBtn} onClick={() => navigate('/settings')}>System Configuration</button>
              <button className={styles.logsBtn} onClick={() => navigate('/settings')}>Audit Trail</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}