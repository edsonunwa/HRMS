import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUserCheck, FiUserX } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { userService } from '../../services/userService';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { useSearchContext } from '../../context/SearchContext';
import styles from './UserManagement.module.css';

const ROLE_OPTIONS = Object.values(ROLES);

const EMPTY_FORM = {
  username: '', email: '', first_name: '', last_name: '',
  role: ROLES.EMPLOYEE, phone: '', password: '', password2: '',
};

function initials(u) {
  return ((u.first_name?.[0] || '') + (u.last_name?.[0] || u.username?.[0] || '')).toUpperCase();
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
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
      const created = await userService.create(form);
      onCreated(created);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Failed to create user.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Create User</div>
        <form onSubmit={handleSubmit}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Username</label>
              <input value={form.username} onChange={(e) => setField('username', e.target.value)} required />
              {errors.username && <div className={styles.fieldError}>{errors.username}</div>}
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
              {errors.email && <div className={styles.fieldError}>{errors.email}</div>}
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>First Name</label>
              <input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Last Name</label>
              <input value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Role</label>
              <select value={form.role} onChange={(e) => setField('role', e.target.value)}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Initial Password</label>
              <input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} required minLength={8} />
              {errors.password && <div className={styles.fieldError}>{errors.password}</div>}
            </div>
            <div className={styles.field}>
              <label>Confirm Password</label>
              <input type="password" value={form.password2} onChange={(e) => setField('password2', e.target.value)} required minLength={8} />
            </div>
          </div>
          {errors.non_field && <div className={styles.errorBanner}>{errors.non_field}</div>}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnOutline} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: user.first_name || '', last_name: user.last_name || '',
    phone: user.phone || '', role: user.role,
  });
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
      const updated = await userService.update(user.id, form);
      onSaved(updated);
    } catch (err) {
      setErrors(err.response?.data || { non_field: 'Failed to update user.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Edit {user.username}</div>
        <form onSubmit={handleSubmit}>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>First Name</label>
              <input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Last Name</label>
              <input value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
            </div>
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label>Role</label>
              <select value={form.role} onChange={(e) => setField('role', e.target.value)}>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
          </div>
          {errors.non_field && <div className={styles.errorBanner}>{errors.non_field}</div>}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnOutline} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
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
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { query } = useSearchContext();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.username, u.email, u.first_name, u.last_name, u.role_display, u.phone]
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

  function handleCreated(created) {
    setUsers((u) => [created, ...u]);
    setShowCreate(false);
  }

  function handleSaved(updated) {
    setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)));
    setEditingUser(null);
  }

  async function toggleActive(user) {
    const updated = await userService.update(user.id, { is_active: !user.is_active });
    setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleDelete(user) {
    if (!window.confirm(`Permanently delete user "${user.username}"? This cannot be undone.`)) return;
    await userService.remove(user.id);
    setUsers((u) => u.filter((x) => x.id !== user.id));
  }

  return (
    <DashboardLayout portalLabel="Settings" searchPlaceholder="Search users…">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.sub}>Create and manage system accounts and roles.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
          <FiPlus /> Create User
        </button>
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
                <th>Phone</th>
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
                  <td>{u.role_display}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`${styles.statusPill} ${u.is_active ? styles.active : styles.inactive}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {u.must_change_password && (
                      <span className={styles.pendingPill}>Password reset pending</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button className={styles.iconBtn} onClick={() => setEditingUser(u)} aria-label="Edit">
                        <FiEdit2 />
                      </button>
                      <button className={styles.iconBtn} onClick={() => toggleActive(u)} aria-label="Toggle active">
                        {u.is_active ? <FiUserX /> : <FiUserCheck />}
                      </button>
                      <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={() => handleDelete(u)} aria-label="Delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={handleSaved} />
      )}
    </DashboardLayout>
  );
}
