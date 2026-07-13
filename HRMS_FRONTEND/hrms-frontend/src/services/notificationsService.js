import api from './api';

export const notificationsService = {
  /**
   * Fetch notifications for the current user
   * @param {boolean} unreadOnly - If true, fetch only unread notifications
   * @returns {Promise<Array>}
   */
  async getAll(unreadOnly = false) {
    const params = unreadOnly ? { unread: 'true' } : {};
    const response = await api.get('/notifications/', { params });
    return response.data;
  },

  /**
   * Get unread notification count
   * @returns {Promise<{unread_count: number}>}
   */
  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count/');
    return response.data;
  },

  /**
   * Mark a single notification as read
   * @param {number} id - Notification ID
   * @returns {Promise<{detail: string}>}
   */
  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read/`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<{detail: string}>}
   */
  async markAllAsRead() {
    const response = await api.patch('/notifications/mark-all-read/');
    return response.data;
  },
};