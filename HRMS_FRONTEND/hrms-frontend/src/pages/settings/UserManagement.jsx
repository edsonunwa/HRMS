import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiShield, FiUserCheck, FiUserX, FiRefreshCw } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userService } from '../../services/userService';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { useSearchContext } from '../../context/SearchContext';
import styles from './UserManagement.module.css';

const ROLE_OPTIONS = Object.values(ROLES);

function initials(u) {
  return ((u.first_name?.[0] || '') + (u.last_name?.[0] || u.username?.[0] || '')).toUpperCase();
}

function AssignRoleModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ role: user.role });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const updated = await userService.update(user.id, { role: form.role });
      onSaved(updated);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Failed to update role.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>
          Assign Role — {user.full_name || user.username}
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.userInfoRow}>
            <div className={styles.avaLarge}>{initials(user)}</div>
            <div>
              <div className={styles.uName}>{user.full_name || user.username}</div>
              <div className={styles.uEmail}>{user.email} &middot; {user.employee_id || user.username}</div>
            </div>
          </div>
          <div className={styles.field}>
            <label>Role</label>
            <select value={form.role} onChange={(e) => setField('role', e.target.value)}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {errors.non_field && <div className={styles.errorBanner}>{errors.non_field}</div>}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnOutline} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Saving…' : 'Assign Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assigningUser, setAssigningUser] = useState(null);
  const { query } = useSearchContext();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.username, u.email, u.first_name, u.last_name, u.role_display]
        .some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [users, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.list();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(updated) {
    setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)));
    setAssigningUser(null);
  }

  async function toggleActive(user) {
    const updated = await userService.update(user.id, { is_active: !user.is_active });
    setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleResetPassword(user) {
    if (!window.confirm(`Reset password for ${user.full_name || user.username} to 123456?`)) return;
    try {
      await userService.resetPassword(user.id);
      // Refresh to update must_change_password flag
      const updated = await userService.list();
      setUsers(updated);
    } catch (err) {
      alert('Failed to reset password.');
    }
  }

  return (
    <DashboardLayout portalLabel="Settings" searchPlaceholder="Search users…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.sub}>Assign roles and manage system accounts. User accounts are auto-created when an employee is added.</p>
        </div>
      </div>

      <div className={styles.card}>
        {error && <div className={styles.errorBanner}>{error}</div>}
        {loading ? (
          <div className={styles.empty}>Loading users…</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>No users found.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Employee ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.ava}>{initials(u)}</div>
                      <div>
                        <div className={styles.uName}>{u.full_name || u.username}</div>
                        <div className={styles.uEmail}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.roleBadge}>{u.role_display}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.username}</td>
                  <td>
                    <span className={`${styles.statusPill} ${u.is_active ? styles.active : styles.inactive}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {u.must_change_password && (
                      <span className={styles.pendingPill}>Password reset</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button className={styles.iconBtn} onClick={() => setAssigningUser(u)} aria-label="Assign role" title="Assign role">
                        <FiShield />
                      </button>
                      <button className={styles.iconBtn} onClick={() => handleResetPassword(u)} aria-label="Reset password" title="Reset password to 123456">
                        <FiRefreshCw />
                      </button>
                      <button className={styles.iconBtn} onClick={() => toggleActive(u)} aria-label="Toggle active" title={u.is_active ? 'Deactivate' : 'Activate'}>
                        {u.is_active ? <FiUserX /> : <FiUserCheck />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {assigningUser && (
        <AssignRoleModal user={assigningUser} onClose={() => setAssigningUser(null)} onSaved={handleSaved} />
      )}
    </DashboardLayout>
  );
}
