import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { reportsService } from '../../services/reportsService';
import { IS_HR_OR_ADMIN, IS_MANAGEMENT } from '../../utils/constants';
import styles from './ReportsOverview.module.css';

/* ── Mini chart for summary cards ────────────────────────────────────── */
function BarChart({ data, labelKey, countKey }) {
  const max = Math.max(1, ...data.map((d) => d[countKey] || 0));
  return (
    <div className={styles.barChart}>
      {data.map((d, i) => (
        <div className={styles.barItem} key={i}>
          <div className={styles.barCount}>{d[countKey] || 0}</div>
          <div className={styles.barFill} style={{ height: `${((d[countKey] || 0) / max) * 90 + 10}px` }} />
          <div className={styles.barLabel}>{d[labelKey] || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function KpiGroup({ items }) {
  return (
    <div className={styles.kpiRow}>
      {items.map((item, i) => (
        <div className={styles.kpiCard} key={i}>
          <div className={styles.kpiLabel}>{item.label}</div>
          <div className={styles.kpiVal}>{item.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Existing summary cards (mostly unchanged) ──────────────────────── */
function HeadcountCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    reportsService.getHeadcount().then(setData).catch(() => setError('Failed to load headcount summary.'));
  }, []);
  if (error) return <div className={styles.card}><div className={styles.errorBanner}>{error}</div></div>;
  if (!data) return <div className={styles.card}>Loading…</div>;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Headcount Summary</div>
      <KpiGroup items={[{ label: 'Total Active Staff', value: data.total }]} />
      <div className={styles.sectionTitle}>By Department</div>
      <BarChart data={data.by_dept} labelKey="name" countKey="active" />
      <div className={styles.sectionTitle}>By Gender</div>
      <div className={styles.pillRow}>
        {data.by_gender.map((g, i) => <span key={i} className={styles.pill}>{g.gender}: {g.count}</span>)}
      </div>
      <div className={styles.sectionTitle}>By Contract Type</div>
      <div className={styles.pillRow}>
        {data.by_contract.map((c, i) => <span key={i} className={styles.pill}>{c.contract_type}: {c.count}</span>)}
      </div>
    </div>
  );
}

function LeaveSummaryCard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    reportsService.getLeave(year).then(setData).catch(() => setError('Failed to load leave summary.'));
  }, [year]);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        Leave Summary
        <select className={styles.select} value={year} onChange={(e) => setYear(e.target.value)}>
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {data && (
        <>
          <KpiGroup items={[{ label: 'Total Requests', value: data.total }]} />
          <div className={styles.sectionTitle}>By Status</div>
          <BarChart data={data.by_status} labelKey="status" countKey="count" />
          <div className={styles.sectionTitle}>By Type</div>
          <div className={styles.pillRow}>
            {data.by_type.map((t, i) => <span key={i} className={styles.pill}>{t.leave_type__name || '—'}: {t.count}</span>)}
          </div>
        </>
      )}
    </div>
  );
}

function RecruitmentSummaryCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    reportsService.getRecruitment().then(setData).catch(() => setError('Failed to load recruitment summary.'));
  }, []);
  if (error) return <div className={styles.card}><div className={styles.errorBanner}>{error}</div></div>;
  if (!data) return <div className={styles.card}>Loading…</div>;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Recruitment Summary</div>
      <KpiGroup items={[
        { label: 'Total Jobs', value: data.total_jobs },
        { label: 'Open Jobs', value: data.open_jobs },
        { label: 'Applications', value: data.total_applications },
        { label: 'Hired', value: data.hired },
      ]} />
      <div className={styles.sectionTitle}>By Job Type</div>
      <BarChart data={data.by_job_type} labelKey="job_type" countKey="count" />
    </div>
  );
}

function PerformanceSummaryCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    reportsService.getPerformance().then(setData).catch(() => setError('Failed to load performance summary.'));
  }, []);
  if (error) return <div className={styles.card}><div className={styles.errorBanner}>{error}</div></div>;
  if (!data) return <div className={styles.card}>Loading…</div>;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Performance Summary</div>
      <KpiGroup items={[
        { label: 'Total Reviews', value: data.total_reviews },
        { label: 'Avg Score', value: data.avg_score ? Number(data.avg_score).toFixed(2) : '—' },
      ]} />
      <div className={styles.sectionTitle}>By Status</div>
      <BarChart data={data.by_status} labelKey="status" countKey="count" />
      <div className={styles.sectionTitle}>By Grade</div>
      <div className={styles.pillRow}>
        {data.by_grade?.map((g, i) => <span key={i} className={styles.pill}>{g.grade || '—'}: {g.count}</span>)}
      </div>
    </div>
  );
}

function TransfersSummaryCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    reportsService.getTransfers().then(setData).catch(() => setError('Failed to load transfers summary.'));
  }, []);
  if (error) return <div className={styles.card}><div className={styles.errorBanner}>{error}</div></div>;
  if (!data) return <div className={styles.card}>Loading…</div>;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Transfers & Promotions</div>
      <KpiGroup items={[
        { label: 'Total', value: data.total },
        { label: 'Pending', value: data.pending },
        { label: 'Approved', value: data.approved },
        { label: 'Cancelled', value: data.cancelled },
      ]} />
      <div className={styles.sectionTitle}>By Type</div>
      <BarChart data={data.by_type} labelKey="transfer_type" countKey="count" />
    </div>
  );
}

function ManpowerSummaryCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    reportsService.getManpower().then(setData).catch(() => setError('Failed to load manpower summary.'));
  }, []);
  if (error) return <div className={styles.card}><div className={styles.errorBanner}>{error}</div></div>;
  if (!data) return <div className={styles.card}>Loading…</div>;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Manpower Planning</div>
      <KpiGroup items={[
        { label: 'Total Plans', value: data.total_plans },
        { label: 'Total Budget', value: data.total_budget ? `${Number(data.total_budget).toLocaleString()}` : '—' },
        { label: 'Total Gap', value: data.total_gap ?? '—' },
      ]} />
      <div className={styles.sectionTitle}>By Status</div>
      <BarChart data={data.by_status} labelKey="status" countKey="count" />
    </div>
  );
}

function TraineesSummaryCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    reportsService.getTrainees().then(setData).catch(() => setError('Failed to load trainees summary.'));
  }, []);
  if (error) return <div className={styles.card}><div className={styles.errorBanner}>{error}</div></div>;
  if (!data) return <div className={styles.card}>Loading…</div>;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Trainees & Interns</div>
      <KpiGroup items={[
        { label: 'Total Trainees', value: data.total_trainees },
        { label: 'Active', value: data.active },
        { label: 'Completed', value: data.completed },
        { label: 'Programs', value: data.total_programs },
      ]} />
      <div className={styles.sectionTitle}>By Type</div>
      <BarChart data={data.by_type} labelKey="trainee_type" countKey="count" />
    </div>
  );
}

/* ── Report Builder (Generate & Download) ──────────────────────────── */
function ReportBuilder({ reportTypes, referenceData }) {
  const [reportType, setReportType] = useState(reportTypes?.[0]?.value || 'headcount');
  const [format, setFormat] = useState('excel');
  const [filters, setFilters] = useState({});
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const currentType = reportTypes?.find((t) => t.value === reportType);
  const paramDefs = currentType?.parameters || [];

  // Build lookup maps for dynamic selects
  const deptMap = {};
  const leaveTypeMap = {};
  const cycleMap = {};
  const programMap = {};
  if (referenceData) {
    referenceData.departments?.forEach((d) => { deptMap[d.id] = d.name; });
    referenceData.leave_types?.forEach((l) => { leaveTypeMap[l.id] = l.name; });
    referenceData.cycles?.forEach((c) => { cycleMap[c.id] = c.name; });
    referenceData.programs?.forEach((p) => { programMap[p.id] = p.title; });
  }

  const getOptions = useCallback((param) => {
    if (param.options) return param.options;
    if (param.source === 'departments') return Object.entries(deptMap).map(([k, v]) => [k, v]);
    if (param.source === 'leave_types') return Object.entries(leaveTypeMap).map(([k, v]) => [k, v]);
    if (param.source === 'cycles') return Object.entries(cycleMap).map(([k, v]) => [k, v]);
    if (param.source === 'programs') return Object.entries(programMap).map(([k, v]) => [k, v]);
    return [];
  }, [deptMap, leaveTypeMap, cycleMap, programMap]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setSuccess(null);
    setError(null);
    try {
      const result = await reportsService.generateReport({
        report_type: reportType,
        format,
        parameters: filters,
      });
      setSuccess(`Report downloaded as "${result.filename}"`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  if (!reportTypes || reportTypes.length === 0) {
    return <div className={styles.card}>No report types available.</div>;
  }

  return (
    <div className={styles.builder}>
      <div className={styles.builderHeader}>Custom Report Builder</div>

      <div className={styles.builderRow}>
        {/* Report type */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Report Type</label>
          <select
            className={styles.select}
            value={reportType}
            onChange={(e) => { setReportType(e.target.value); setFilters({}); }}
          >
            {reportTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Format</label>
          <div className={styles.formatGroup}>
            {['csv', 'excel', 'pdf'].map((fmt) => (
              <button
                key={fmt}
                className={`${styles.formatBtn} ${format === fmt ? styles.formatBtnActive : ''}`}
                onClick={() => setFormat(fmt)}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic filters */}
      {paramDefs.length > 0 && (
        <div className={styles.filtersSection}>
          <div className={styles.sectionTitle}>Filters</div>
          <div className={styles.filtersGrid}>
            {paramDefs.map((param) => (
              <div className={styles.fieldGroup} key={param.key}>
                <label className={styles.fieldLabel}>{param.label}</label>
                {param.type === 'number' && (
                  <input
                    type="number"
                    className={styles.input}
                    value={filters[param.key] || ''}
                    onChange={(e) => handleFilterChange(param.key, e.target.value)}
                  />
                )}
                {param.type === 'text' && (
                  <input
                    type="text"
                    className={styles.input}
                    value={filters[param.key] || ''}
                    onChange={(e) => handleFilterChange(param.key, e.target.value)}
                  />
                )}
                {(param.type === 'select') && (
                  <select
                    className={styles.select}
                    value={filters[param.key] || ''}
                    onChange={(e) => handleFilterChange(param.key, e.target.value || undefined)}
                  >
                    <option value="">All</option>
                    {getOptions(param).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.builderActions}>
        <button
          className={styles.btnGenerate}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Generating…' : `Generate & Download ${format.toUpperCase()}`}
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}
    </div>
  );
}

/* ── Report History ──────────────────────────────────────────────────── */
function ReportHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService.listReports({ limit: 50 })
      .then((res) => setReports(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.card}>Loading history…</div>;
  if (reports.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Recently Generated Reports</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Format</th>
              <th>Generated By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td><span className={styles.badge}>{r.report_type}</span></td>
                <td><span className={styles.badge}>{r.format}</span></td>
                <td>{r.generated_by_name || '—'}</td>
                <td>{new Date(r.generated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function ReportsOverview() {
  const { user } = useAuth();
  const canViewHeadcount = IS_MANAGEMENT.includes(user?.role);
  const canViewOther = IS_HR_OR_ADMIN.includes(user?.role);
  const canGenerate = IS_HR_OR_ADMIN.includes(user?.role);

  const [reportTypes, setReportTypes] = useState(null);
  const [referenceData, setReferenceData] = useState(null);

  useEffect(() => {
    if (!canGenerate) return;
    Promise.all([
      reportsService.getReportTypes(),
      reportsService.getReferenceData(),
    ])
      .then(([types, ref]) => {
        setReportTypes(types);
        setReferenceData(ref);
      })
      .catch(() => {});
  }, [canGenerate]);

  if (!canViewHeadcount && !canViewOther) {
    return (
      <DashboardLayout portalLabel="Reports" searchPlaceholder="Search reports…">
        <h1 className={styles.title}>Reports</h1>
        <div className={styles.card}>You don't have access to view HR reports.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout portalLabel="Reports" searchPlaceholder="Search reports…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.sub}>Generate custom reports or browse analytics across all modules.</p>
        </div>
      </div>

      {/* Report Builder */}
      {canGenerate && (
        <ReportBuilder reportTypes={reportTypes} referenceData={referenceData} />
      )}

      {/* Analytics Grid */}
      <div className={styles.analyticsGrid}>
        {canViewHeadcount && <HeadcountCard />}
        {canViewOther && <LeaveSummaryCard />}
        {canViewOther && <RecruitmentSummaryCard />}
        {canViewOther && <PerformanceSummaryCard />}
        {canViewOther && <TransfersSummaryCard />}
        {canViewOther && <ManpowerSummaryCard />}
        {canViewOther && <TraineesSummaryCard />}
      </div>

      {/* Report History */}
      {canGenerate && <ReportHistory />}
    </DashboardLayout>
  );
}