import React from "react";

const NotificationItem = ({
  notification,
  onRead,
  onDelete
}) => {
  const handleClick = async () => {
    if (!notification.isRead) {
      await onRead(
        notification._id
      );
    }
  };

  return (
    <div
      className={`border-b border-gray-200 p-4 transition ${
        notification.isRead
          ? "bg-white"
          : "bg-green-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={handleClick}
          className="flex-1 text-left"
        >
          <div className="flex items-start gap-3">
            {!notification.isRead && (
              <span className="mt-2 h-2.5 w-2.5 rounded-full bg-green-600" />
            )}

            <div>
              <h3 className="font-semibold text-gray-900">
                {notification.title}
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                {notification.message}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                {new Date(
                  notification.createdAt
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onDelete(
              notification._id
            )
          }
          className="text-xs text-gray-400 hover:text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;