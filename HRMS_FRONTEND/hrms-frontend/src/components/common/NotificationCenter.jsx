import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { notificationsService } from '../../services/notificationsService';
import styles from './NotificationCenter.module.css';

const TYPE_CONFIG = {
  info:    { icon: 'ℹ️', color: 'blue', label: 'Info' },
  success: { icon: '✅', color: 'green', label: 'Success' },
  warning: { icon: '⚠️', color: 'orange', label: 'Warning' },
  danger:  { icon: '🔴', color: 'red', label: 'Alert' },
};

const CATEGORY_LABELS = {
  leave: 'Leave',
  transfer: 'Transfer',
  recruitment: 'Recruitment',
  payroll: 'Payroll',
  evaluation: 'Evaluation',
  system: 'System',
  general: 'General',
};

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

export default function NotificationCenter({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await notificationsService.getAll();
      // Handle both paginated and non-paginated responses
      let notificationsList = [];
      if (Array.isArray(data)) {
        notificationsList = data;
      } else if (data && typeof data === 'object') {
        notificationsList = data.results || data.data || [];
      }
      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      // Set empty array on error to prevent crashes
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (e, notifId) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(notifId);
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notif) => {
    // Mark as read
    if (!notif.is_read) {
      notificationsService.markAsRead(notif.id).then(() => {
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }).catch(console.error);
    }

    // Navigate to link if exists
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  const recentNotifications = Array.isArray(notifications) ? notifications.slice(0, 20) : [];

  return (
    <div className={styles.notificationContainer} ref={dropdownRef}>
      <button
        className={styles.notificationButton}
        onClick={handleToggle}
        aria-label="Notifications"
        title="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className={styles.markAllButton}
                onClick={handleMarkAllAsRead}
                disabled={markingAllRead}
              >
                <FiCheck />
                {markingAllRead ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className={styles.list}>
            {recentNotifications.length === 0 ? (
              <div className={styles.empty}>
                <FiBell />
                <p>No notifications yet</p>
              </div>
            ) : (
              recentNotifications.map(notif => {
                const typeConfig = TYPE_CONFIG[notif.notif_type] || TYPE_CONFIG.info;
                return (
                  <div
                    key={notif.id}
                    className={`${styles.notificationItem} ${!notif.is_read ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationHeader}>
                        <span className={`${styles.typeIcon} ${styles[typeConfig.color]}`}>
                          {typeConfig.icon}
                        </span>
                        <span className={styles.category}>
                          {CATEGORY_LABELS[notif.category] || notif.category}
                        </span>
                        <span className={styles.time}>
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>
                      <div className={styles.notificationTitle}>
                        {notif.title}
                      </div>
                      <div className={styles.notificationMessage}>
                        {notif.message}
                      </div>
                    </div>
                    {!notif.is_read && (
                      <button
                        className={styles.markReadButton}
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        title="Mark as read"
                      >
                        <FiCheck />
                      </button>
                    )}
                    {notif.link && (
                      <FiExternalLink className={styles.linkIcon} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {recentNotifications.length > 0 && (
            <div className={styles.footer}>
              <button
                className={styles.viewAllButton}
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}