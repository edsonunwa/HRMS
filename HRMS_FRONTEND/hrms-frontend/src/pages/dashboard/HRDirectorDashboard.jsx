import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiCalendar, FiMaximize2 } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { employeesService, departmentsService } from '../../services/employeesService';
import { reportsService } from '../../services/reportsService';
import styles from './HRDirectorDashboard.module.css';

export default function HRDirectorDashboard() {
  const navigate = useNavigate();
  const [headcount, setHeadcount] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [hc, depts, emps] = await Promise.all([
          reportsService.getHeadcount(),
          departmentsService.list(),
          employeesService.list({ limit: 1000 }),
        ]);
        setHeadcount(hc);
        setDepartments(Array.isArray(depts) ? depts : depts.results || []);
        setEmployees(Array.isArray(emps) ? emps : emps.results || []);
      } catch (err) {
        setError('Failed to load strategic data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalEmployees = headcount?.total || employees.length;
  const activeEmployees = headcount?.by_dept?.reduce((sum, d) => sum + (d.active || 0), 0) || 0;
  const deptCount = departments.length;

  if (loading) {
    return (
      <DashboardLayout portalLabel="" searchPlaceholder="Search HR Operations Portal…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="" searchPlaceholder="Search HR Operations Portal…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="" searchPlaceholder="Search HR Operations Portal…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Strategic Management Dashboard</h1>
          <p className={styles.sub}>Real-time Workforce Analytics</p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.btnOutline} onClick={() => navigate('/reports')}><FiDownload /> Export Report</button>
          <button className={styles.btnPrimary} onClick={() => navigate('/workforce')}><FiCalendar /> View Workforce</button>
        </div>
      </div>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Headcount</div>
          <div className={styles.kpiVal}>{totalEmployees.toLocaleString()}</div>
          <div className={styles.kpiSub}>Active employees across all regions</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Departments</div>
          <div className={styles.kpiVal}>{deptCount}</div>
          <div className={styles.kpiSub}>Active departments</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Active Staff</div>
          <div className={styles.kpiVal}>{activeEmployees.toLocaleString()}</div>
          <div className={styles.kpiSub}>Currently employed</div>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Department Distribution */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Department Distribution</span>
            <FiMaximize2 size={14} style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }} />
          </div>
          {departments.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No departments found.</div>
          ) : (
            departments.slice(0, 8).map((dept) => {
              const pct = totalEmployees > 0 ? Math.round(((dept.employee_count || 0) / totalEmployees) * 100) : 0;
              return (
                <div key={dept.id} className={styles.regionRow}>
                  <span className={styles.dot} style={{background: '#00244d'}} />
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{dept.name}</span>
                  <strong>{pct}%</strong>
                </div>
              );
            })
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Showing {Math.min(departments.length, 8)} of {departments.length} departments
          </div>
        </div>

        {/* Contract Type Distribution */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><span>Contract Type Distribution</span></div>
          {headcount?.by_contract ? (
            headcount.by_contract.map((item) => (
              <div key={item.contract_type} className={styles.regionRow}>
                <span className={styles.dot} style={{background: '#005a9c'}} />
                <span style={{ flex: 1, fontSize: '0.85rem' }}>{item.contract_type || 'Unknown'}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No data available.</div>
          )}
        </div>
      </div>

      {/* Employee Summary */}
      <div className={styles.card} style={{marginTop: 'var(--space-md)'}}>
        <div className={styles.cardHeader}>
          <span>Employee Summary by Department</span>
        </div>
        {headcount?.by_dept && headcount.by_dept.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Active Staff</th>
                <th>% of Workforce</th>
              </tr>
            </thead>
            <tbody>
              {headcount.by_dept.slice(0, 10).map((d) => (
                <tr key={d.name}>
                  <td className={styles.deptName}>{d.name}</td>
                  <td>{d.active}</td>
                  <td>{totalEmployees > 0 ? Math.round((d.active / totalEmployees) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No department data available.</div>
        )}
      </div>
    </DashboardLayout>
  );
}