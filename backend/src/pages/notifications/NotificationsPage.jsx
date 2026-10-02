import React, {
  useEffect
} from "react";

import {
  useNotifications
} from "../../context/NotificationContext";

import NotificationItem from "../../components/notifications/NotificationItem";

const NotificationsPage = () => {
  const {
    notifications,
    loading,
    error,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification
  } = useNotifications();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Notifications
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Stay updated with your orders,
              payments and account activity.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Mark all as read
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              You have no notifications.
            </div>
          ) : (
            notifications.map(
              (notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={
                    notification
                  }
                  onRead={markAsRead}
                  onDelete={
                    removeNotification
                  }
                />
              )
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;