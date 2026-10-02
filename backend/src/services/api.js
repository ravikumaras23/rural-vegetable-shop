const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const getToken = () => {
  return localStorage.getItem("token");
};

const request = async (
  endpoint,
  options = {}
) => {
  const token = getToken();

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {}),

        ...(options.headers || {})
      }
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Request failed"
    );
  }

  return data;
};

export const getNotifications = async ({
  page = 1,
  limit = 20,
  unread = false
} = {}) => {
  const query = new URLSearchParams({
    page,
    limit
  });

  if (unread) {
    query.set("unread", "true");
  }

  return request(
    `/api/notifications?${query.toString()}`
  );
};

export const markNotificationRead =
  async (notificationId) => {
    return request(
      `/api/notifications/${notificationId}/read`,
      {
        method: "PATCH"
      }
    );
  };

export const markAllNotificationsRead =
  async () => {
    return request(
      "/api/notifications/read-all",
      {
        method: "PATCH"
      }
    );
  };

export const deleteNotification =
  async (notificationId) => {
    return request(
      `/api/notifications/${notificationId}`,
      {
        method: "DELETE"
      }
    );
  };