const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

async function notificationRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please login before continuing.");
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      cache: "no-store"
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| GET NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export async function getNotifications(
  page = 1,
  limit = 50,
  unreadOnly = false
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (unreadOnly) {
    params.set("unreadOnly", "true");
  }

  return notificationRequest(
    `/api/notifications?${params.toString()}`
  );
}

/*
|--------------------------------------------------------------------------
| GET UNREAD COUNT
|--------------------------------------------------------------------------
*/

export async function getUnreadCount() {
  return notificationRequest(
    "/api/notifications/unread-count"
  );
}

/*
|--------------------------------------------------------------------------
| MARK ONE AS READ
|--------------------------------------------------------------------------
*/

export async function markNotificationRead(id) {
  if (!id) {
    throw new Error("Notification ID is required.");
  }

  return notificationRequest(
    `/api/notifications/${id}/read`,
    {
      method: "PATCH"
    }
  );
}

/*
|--------------------------------------------------------------------------
| MARK ALL AS READ
|--------------------------------------------------------------------------
*/

export async function markAllNotificationsRead() {
  return notificationRequest(
    "/api/notifications/mark-all-read",
    {
      method: "PATCH"
    }
  );
}

/*
|--------------------------------------------------------------------------
| DELETE ONE
|--------------------------------------------------------------------------
*/

export async function deleteNotification(id) {
  if (!id) {
    throw new Error("Notification ID is required.");
  }

  return notificationRequest(
    `/api/notifications/${id}`,
    {
      method: "DELETE"
    }
  );
}

export default {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
};