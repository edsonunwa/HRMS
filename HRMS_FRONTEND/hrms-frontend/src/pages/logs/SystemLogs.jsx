import React, { useCallback, useEffect, useState } from 'react';
import { FiClock, FiFilter, FiRefreshCw, FiSearch, FiUser, FiCalendar } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { auditLogService } from '../../services/auditLogService';
import styles from './SystemLogs.module.css';

const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'OTHER'];

function actionBadgeClass(action) {
  const map = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN:  'login',
    LOGOUT: 'logout',
    OTHER:  'other',
  };
  return map[action] || 'other';
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-UG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function initials(uname) {
  return (uname || '?')[0].toUpperCase();
}

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      params.page = page;
      if (actionFilter)     params.action   = actionFilter;
      if (resourceFilter)   params.resource = resourceFilter;
      if (usernameFilter)   params.username = usernameFilter;
      if (createdAfter)     params.created_after = createdAfter;
      if (createdBefore)    params.created_before = createdBefore;
      const data = await auditLogService.list(params);
      const items = Array.isArray(data) ? data : data.results || [];
      setLogs(items);
      setCount(Array.isArray(data) ? items.length : data.count || items.length);
    } catch (err) {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceFilter, usernameFilter, createdAfter, createdBefore, page]);

  useEffect(() => { load(); }, [load]);

  function handleReset() {
    setActionFilter('');
    setResourceFilter('');
    setUsernameFilter('');
    setCreatedAfter('');
    setCreatedBefore('');
    setPage(1);
  }

  const hasActiveFilters = actionFilter || resourceFilter || usernameFilter || createdAfter || createdBefore;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  function goToPrevPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setPage((current) => Math.min(totalPages, current + 1));
  }

  return (
    <DashboardLayout portalLabel="System Administration" searchPlaceholder="Search logs…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Audit Logs</h1>
          <p className={styles.sub}>Complete record of administrative actions across the HRMS.</p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          <FiRefreshCw className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <FiFilter className={styles.filterIcon} />
          <select className={styles.filterSelect} value={actionFilter} onChange={(e) => { setPage(1); setActionFilter(e.target.value); }}>
            <option value="">All Actions</option>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <FiSearch className={styles.filterIcon} />
          <input
            className={styles.filterInput}
            placeholder="Resource (e.g. User, Employee)"
            value={resourceFilter}
            onChange={(e) => { setPage(1); setResourceFilter(e.target.value); }}
          />
        </div>
        <div className={styles.filterGroup}>
          <FiUser className={styles.filterIcon} />
          <input
            className={styles.filterInput}
            placeholder="Username"
            value={usernameFilter}
            onChange={(e) => { setPage(1); setUsernameFilter(e.target.value); }}
          />
        </div>
        <div className={styles.filterGroup}>
          <FiCalendar className={styles.filterIcon} />
          <input
            className={styles.filterInput}
            type="date"
            value={createdAfter}
            onChange={(e) => { setPage(1); setCreatedAfter(e.target.value); }}
            aria-label="Created after"
          />
        </div>
        <div className={styles.filterGroup}>
          <FiClock className={styles.filterIcon} />
          <input
            className={styles.filterInput}
            type="date"
            value={createdBefore}
            onChange={(e) => { setPage(1); setCreatedBefore(e.target.value); }}
            aria-label="Created before"
          />
        </div>
        {hasActiveFilters && (
          <button className={styles.clearBtn} onClick={handleReset}>Clear Filters</button>
        )}
      </div>

      {/* Log Table */}
      <div className={styles.card}>
        {error && <div className={styles.errorBanner}>{error}</div>}
        {loading ? (
          <div className={styles.empty}>Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            {hasActiveFilters
              ? 'No logs match the current filters.'
              : 'No audit log entries yet. As actions are performed on the system they will appear here.'}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Detail</th>
                  <th>IP Address</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.ava}>{initials(log.username)}</div>
                        <span className={styles.username}>{log.username || 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.actionBadge} ${styles[actionBadgeClass(log.action)]}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      {log.resource}
                      {log.resource_id != null && <span className={styles.resId}> #{log.resource_id}</span>}
                    </td>
                    <td className={styles.detailCell}>{log.detail || '—'}</td>
                    <td className={styles.ipCell}>{log.ip_address || '—'}</td>
                    <td className={styles.dateCell}>
                      <FiCalendar className={styles.calIcon} />
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={goToPrevPage} disabled={loading || page <= 1}>Previous</button>
          <span className={styles.pageInfo}>Page {page} of {totalPages} · {count} entries</span>
          <button className={styles.pageBtn} onClick={goToNextPage} disabled={loading || page >= totalPages}>Next</button>
        </div>
      </div>
    </DashboardLayout>
  );
}