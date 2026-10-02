import React from "react";

import {
  useNotifications
} from "../../context/NotificationContext";

import NotificationItem from "./NotificationItem";

const NotificationDropdown = ({
  onClose,
  onViewAll
}) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification
  } = useNotifications();

  const latest =
    notifications.slice(0, 8);

  return (
    <div className="absolute right-0 top-12 z-50 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="font-semibold text-gray-900">
            Notifications
          </h2>

          {unreadCount > 0 && (
            <p className="text-xs text-gray-500">
              {unreadCount} unread
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-xs font-medium text-green-700 hover:text-green-800"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[28rem] overflow-y-auto">
        {loading && (
          <div className="p-6 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        )}

        {!loading &&
          latest.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">
              No notifications
            </div>
          )}

        {!loading &&
          latest.map(
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
          )}
      </div>

      <div className="border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onViewAll?.();
          }}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;