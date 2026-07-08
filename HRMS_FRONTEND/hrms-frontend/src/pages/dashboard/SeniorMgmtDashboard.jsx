import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiDownload, FiCalendar } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { reportsService } from '../../services/reportsService';
import { employeesService, departmentsService } from '../../services/employeesService';
import styles from './SeniorMgmtDashboard.module.css';

const STATUS_COLORS = { urgent: '#dc3545', pending: '#856404', review: '#005a9c' };
const STATUS_LABELS = { urgent: 'URGENT', pending: 'PENDING', review: 'REVIEW' };

export default function SeniorMgmtDashboard() {
  const navigate = useNavigate();
  const [headcount, setHeadcount] = useState(null);
  const [recruitment, setRecruitment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [hc, rec, depts] = await Promise.all([
          reportsService.getHeadcount(),
          reportsService.getRecruitment(),
          departmentsService.list(),
        ]);
        setHeadcount(hc);
        setRecruitment(rec);
        setDepartments(Array.isArray(depts) ? depts : depts.results || []);
      } catch (err) {
        setError('Failed to load executive data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const total = headcount?.total || 0;
  const openJobs = recruitment?.open_jobs || 0;
  const totalApps = recruitment?.total_applications || 0;
  const hired = recruitment?.hired || 0;

  if (loading) {
    return (
      <DashboardLayout portalLabel="Executive Portal" searchPlaceholder="Search reports, staff, departments…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading dashboard…</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout portalLabel="Executive Portal" searchPlaceholder="Search reports, staff, departments…">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="Executive Portal" searchPlaceholder="Search reports, staff, departments…">
      <div className={styles.header}>
        <div>
          <p className={styles.overline}>SENIOR MANAGEMENT</p>
          <h1 className={styles.title}>Executive Overview Dashboard</h1>
          <p className={styles.sub}>Organisational Performance Snapshot</p>
        </div>
        <div className={styles.headerBtns}>
          <button className={styles.btnOutline} onClick={() => navigate('/reports')}><FiDownload /> Export Report</button>
          <button className={styles.btnPrimary} onClick={() => navigate('/workforce')}><FiCalendar /> View Workforce</button>
        </div>
      </div>

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>👥</div>
          <div className={styles.kpiVal}>{total.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Total Workforce</div>
          <div className={styles.kpiSub}>Active employees across all regions</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>💼</div>
          <div className={styles.kpiVal}>{openJobs}</div>
          <div className={styles.kpiLabel}>Open Positions</div>
          <div className={styles.kpiSub}>Currently hiring</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>📄</div>
          <div className={styles.kpiVal}>{totalApps.toLocaleString()}</div>
          <div className={styles.kpiLabel}>Total Applications</div>
          <div className={styles.kpiSub}>All time</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>✅</div>
          <div className={styles.kpiVal}>{hired}</div>
          <div className={styles.kpiLabel}>Hired</div>
          <div className={styles.kpiSub}>Successful placements</div>
        </div>
      </div>

      <div className={styles.twoCol}>
        {/* Department Distribution */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span>Department Workforce Distribution</span>
          </div>
          {headcount?.by_dept && headcount.by_dept.length > 0 ? (
            headcount.by_dept.slice(0, 8).map((d) => (
              <div key={d.name} className={styles.initItem}>
                <div className={styles.initTop}>
                  <span className={styles.initLabel}>{d.name}</span>
                  <span className={styles.initStatus} style={{ color: '#005a9c' }}>{d.active} staff</span>
                </div>
                <div className={styles.initBar}>
                  <div className={styles.initFill} style={{
                    width: `${total > 0 ? (d.active / total) * 100 : 0}%`,
                    background: '#005a9c',
                  }} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No department data available.</div>
          )}
        </div>

        {/* Recruitment Summary */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><span>Recruitment Summary</span></div>
          {recruitment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className={styles.riskItem}>
                <div className={styles.riskLevel} style={{ background: '#e6f4ea', color: '#28a745' }}>OPEN</div>
                <div className={styles.riskBody}>
                  <div className={styles.riskLabel}>{recruitment.open_jobs || 0} active job postings</div>
                  <div className={styles.riskDept}>Out of {recruitment.total_jobs || 0} total</div>
                </div>
              </div>
              <div className={styles.riskItem}>
                <div className={styles.riskLevel} style={{ background: '#eaf0ff', color: '#005a9c' }}>SHORTLISTED</div>
                <div className={styles.riskBody}>
                  <div className={styles.riskLabel}>{recruitment.shortlisted || 0} candidates shortlisted</div>
                  <div className={styles.riskDept}>From {totalApps} applications</div>
                </div>
              </div>
              <div className={styles.riskItem}>
                <div className={styles.riskLevel} style={{ background: '#e6f4ea', color: '#28a745' }}>HIRED</div>
                <div className={styles.riskBody}>
                  <div className={styles.riskLabel}>{hired} candidates hired</div>
                  <div className={styles.riskDept}>Successful placements</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No recruitment data available.</div>
          )}
        </div>
      </div>

      {/* Gender Distribution */}
      <div className={styles.card} style={{ marginTop: 'var(--space-md)' }}>
        <div className={styles.cardHeader}>
          <span>Gender Distribution</span>
        </div>
        {headcount?.by_gender && headcount.by_gender.length > 0 ? (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {headcount.by_gender.map((g) => (
              <div key={g.gender} style={{
                flex: 1, minWidth: '120px', background: '#f8f9fa', borderRadius: 'var(--radius-sm)',
                padding: '1rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: g.gender === 'M' ? '#005a9c' : '#dc3545' }}>
                  {g.count}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {g.gender === 'M' ? 'Male' : g.gender === 'F' ? 'Female' : 'Other'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No gender data available.</div>
        )}
      </div>
    </DashboardLayout>
  );
}