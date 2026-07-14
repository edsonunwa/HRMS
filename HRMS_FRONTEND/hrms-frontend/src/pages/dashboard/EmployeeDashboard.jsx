import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPrinter, FiEdit, FiMoreVertical, FiMessageSquare } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { employeesService } from '../../services/employeesService';
import { leaveBalancesService } from '../../services/leaveService';
import styles from './EmployeeDashboard.module.css';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    async function loadData() {
      try {
        const [prof, balances] = await Promise.all([
          employeesService.me(),
          leaveBalancesService.list(),
        ]);
        setProfile(prof);
        setLeaveBalances(Array.isArray(balances) ? balances : balances.results || []);
      } catch (err) {
        setError('Unable to load profile data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const initials = profile
    ? ((profile.user?.first_name?.[0] || '') + (profile.user?.last_name?.[0] || '')).toUpperCase() || 'U'
    : 'U';

  const fullName = profile?.user?.full_name || user?.full_name || user?.username || 'User';
  const department = profile?.department?.name || '—';
  const employeeId = profile?.employee_id || '—';
  const joinDate = profile?.join_date
    ? new Date(profile.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  const supervisorName = profile?.supervisor?.full_name || profile?.supervisor?.user?.full_name || '—';
  const performanceScore = profile?.performance_score || '—';
  const attendancePct = profile?.attendance_pct || '—';

  return (
    <DashboardLayout portalLabel="" searchPlaceholder="Search HR portal…">
      <div className={styles.topRow}>
        <div>
          <h1 className={styles.greeting}>{greeting}, {user?.first_name || 'User'}</h1>
          <p className={styles.greetingSub}>Here is an overview of your professional profile and upcoming tasks.</p>
        </div>
        <div className={styles.topBtns}>
              <button className={styles.btnOutline} onClick={() => window.print()}><FiPrinter /> Print Profile</button>
          <button className={styles.btnPrimary} onClick={() => navigate('/settings')}><FiEdit /> Update Info</button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>Loading profile…</div>
      ) : error ? (
        <div className={styles.errorState}>{error}</div>
      ) : (
        <div className={styles.mainGrid}>
          {/* Profile Card */}
          <div className={styles.profileCard}>
            <div className={styles.profileImgWrap}>
              <div className={styles.profileImg}>{initials}</div>
            </div>
            <div className={styles.profileInfo}>
              <h2 className={styles.empName}>{fullName}</h2>
              <p className={styles.empTitle}>{department}</p>
              <div className={styles.empMeta}>
                <div className={styles.metaRow}><span>Employee ID</span><strong>{employeeId}</strong></div>
                <div className={styles.metaRow}><span>Join Date</span><strong>{joinDate}</strong></div>
                <div className={styles.metaRow}><span>Reporting To</span><strong>{supervisorName}</strong></div>
              </div>
              <div className={styles.stats}>
                <div className={styles.stat}><div className={styles.statVal}>{performanceScore}</div><div className={styles.statLbl}>PERFORMANCE</div></div>
                <div className={styles.stat}><div className={styles.statVal}>{attendancePct}%</div><div className={styles.statLbl}>ATTENDANCE</div></div>
              </div>
            </div>

            {/* Leave Balances */}
            <div className={styles.leaveRow}>
              {leaveBalances.length > 0 ? leaveBalances.slice(0, 3).map((lb) => {
                const remaining = lb.total_days - lb.used_days;
                const maxVal = lb.total_days || 30;
                return (
                  <div key={lb.id || lb.leave_type} className={styles.leaveCard}>
                    <div className={styles.leaveTag}>{lb.leave_type_name || 'Leave'}</div>
                    <div className={styles.leaveVal} style={{ color: remaining < 3 ? '#dc3545' : '#005a9c' }}>
                      {remaining}
                    </div>
                    <div className={styles.leaveSub}>Days remaining</div>
                    <div className={styles.leaveBar}>
                      <div className={styles.leaveBarFill} style={{ width: `${(remaining / maxVal) * 100}%`, background: remaining < 3 ? '#dc3545' : '#005a9c' }} />
                    </div>
                  </div>
                );
              }) : (
                <div className={styles.noData}>No leave balances available</div>
              )}
            </div>

            <div className={styles.bottomCards}>
              <div className={styles.payslipCard}>
                <div className={styles.payslipIcon}>📄</div>
                <div>
                  <div className={styles.payslipTitle}>Latest Payslip</div>
                  <div className={styles.payslipStatus}>Status: Available</div>
                </div>
                <button className={styles.downloadBtn} onClick={() => window.print()} aria-label="Download payslip">⬇</button>
              </div>
              <div className={styles.holidayCard}>
                <div className={styles.holidayDate}><div className={styles.hdNum}>09</div><div className={styles.hdMon}>OCT</div></div>
                <div><div className={styles.holidayName}>Independence Day</div><div className={styles.holidaySub}>Next Public Holiday</div></div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className={styles.rightCol}>
            {/* Quick Stats */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span>Employment Summary</span>
              </div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Status</div>
                  <div className={styles.summaryValue}>{profile?.employment_status || 'Active'}</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Contract Type</div>
                  <div className={styles.summaryValue}>{profile?.contract_type || 'Permanent'}</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Department</div>
                  <div className={styles.summaryValue}>{department}</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryLabel}>Position</div>
                  <div className={styles.summaryValue}>{profile?.position?.title || '—'}</div>
                </div>
              </div>
            </div>

            {/* HR Support */}
            <div className={styles.supportCard}>
              <div className={styles.supportTitle}>Need HR Support?</div>
              <p className={styles.supportSub}>Our dedicated HR support team is available 8:00 AM - 5:00 PM EAT to assist you.</p>
              <button className={styles.chatBtn} onClick={() => window.location.href = 'mailto:hr@nwsc.co.ug'}><FiMessageSquare /> Chat with HR</button>
            </div>

            {/* Quick Resources */}
            <div className={styles.card}>
              <div className={styles.cardHeader}><span>Quick Resources</span></div>
              <div className={styles.resourceGrid}>
                {['HR Policy', 'Health Plan', 'Claims', 'KPAs'].map(r => (
                  <button key={r} className={styles.resourceBtn} onClick={() => navigate('/reports')}>📄 {r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        © 2024 National Water and Sewerage Corporation. All rights reserved. &nbsp;
        <a href="/privacy">Privacy Policy</a> &nbsp; <a href="/terms">Terms of Service</a> &nbsp; <a href="/system">System Status</a>
      </div>
    </DashboardLayout>
  );
}