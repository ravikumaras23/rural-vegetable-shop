import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { io } from "socket.io-client";

const NotificationContext =
  createContext(null);

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL.replace(
    /\/api\/?$/,
    ""
  );

/*
|--------------------------------------------------------------------------
| API REQUEST
|--------------------------------------------------------------------------
*/

async function apiRequest(
  endpoint,
  options = {}
) {
  const token =
    localStorage.getItem(
      "token"
    );

  if (!token) {
    throw new Error(
      "Authentication required"
    );
  }

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {})
        },

        cache: "no-store"
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

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
| NORMALIZE NOTIFICATION
|--------------------------------------------------------------------------
*/

function normalizeNotification(
  notification
) {
  return {
    id: String(
      notification?._id ||
        notification?.id ||
        ""
    ),

    recipient:
      notification?.recipient
        ? String(
            notification.recipient
          )
        : "",

    role:
      String(
        notification?.role || ""
      )
        .trim()
        .toLowerCase(),

    title:
      notification?.title ||
      "Notification",

    message:
      notification?.message ||
      "",

    type:
      notification?.type ||
      "ORDER_STATUS_UPDATED",

    metadata:
      notification?.metadata ||
      {},

    isRead:
      Boolean(
        notification?.isRead
      ),

    createdAt:
      notification?.createdAt ||
      new Date().toISOString()
  };
}

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export function NotificationProvider({
  children
}) {
  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [userRole, setUserRole] =
    useState("");

  /*
   * ---------------------------------------------------------------
   * LOAD CURRENT USER ROLE
   * ---------------------------------------------------------------
   *
   * Adjust this part if your authentication context already exposes
   * the authenticated user. Prefer consuming that existing context
   * rather than maintaining a second user store.
   */

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem(
          "user"
        );

      if (storedUser) {
        const parsed =
          JSON.parse(
            storedUser
          );

        setUserRole(
          String(
            parsed?.role || ""
          )
            .trim()
            .toLowerCase()
        );
      }
    } catch (err) {
      console.error(
        "Unable to read stored user:",
        err
      );
    }
  }, []);

  /*
   * ---------------------------------------------------------------
   * LOAD NOTIFICATIONS
   * ---------------------------------------------------------------
   */

  const loadNotifications =
    useCallback(
      async () => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setNotifications([]);
          setLoading(false);
          return;
        }

        try {
          setError("");

          const response =
            await apiRequest(
              "/api/notifications?page=1&limit=50"
            );

          const items =
            Array.isArray(
              response?.data
            )
              ? response.data
              : [];

          setNotifications(
            items.map(
              normalizeNotification
            )
          );
        } catch (err) {
          console.error(
            "Notification loading error:",
            err
          );

          setError(
            err.message ||
              "Unable to load notifications."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /*
   * ---------------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------------
   */

  useEffect(() => {
    loadNotifications();
  }, [
    loadNotifications
  ]);

  /*
   * ---------------------------------------------------------------
   * SOCKET.IO
   * ---------------------------------------------------------------
   */

  useEffect(() => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      return undefined;
    }

    const socket =
      io(SOCKET_URL, {
        auth: {
          token
        },

        transports: [
          "websocket",
          "polling"
        ],

        reconnection: true,

        reconnectionAttempts:
          Infinity,

        reconnectionDelay: 1000,

        reconnectionDelayMax:
          5000,

        timeout: 10000
      });

    const handleNewNotification =
      (payload) => {
        /*
         * sendRoleNotification() emits:
         *
         * {
         *   notifications: [...]
         * }
         *
         * Individual notifications emit
         * the notification object directly.
         */

        const incoming =
          Array.isArray(
            payload?.notifications
          )
            ? payload.notifications
            : [payload];

        const normalized =
          incoming
            .map(
              normalizeNotification
            )
            .filter(
              (item) =>
                item.id
            );

        if (
          normalized.length ===
          0
        ) {
          return;
        }

        setNotifications(
          (current) => {
            const existing =
              new Set(
                current.map(
                  (item) =>
                    item.id
                )
              );

            const fresh =
              normalized.filter(
                (item) =>
                  !existing.has(
                    item.id
                  )
              );

            if (
              fresh.length ===
              0
            ) {
              return current;
            }

            return [
              ...fresh,
              ...current
            ].slice(0, 100);
          }
        );
      };

    socket.on(
      "notification:new",
      handleNewNotification
    );

    socket.on(
      "connect_error",
      (err) => {
        console.error(
          "Notification socket error:",
          err.message
        );
      }
    );

    return () => {
      socket.off(
        "notification:new",
        handleNewNotification
      );

      socket.disconnect();
    };
  }, []);

  /*
   * ---------------------------------------------------------------
   * MARK ONE READ
   * ---------------------------------------------------------------
   */

  const markAsRead =
    useCallback(
      async (id) => {
        if (!id) {
          return;
        }

        /*
         * Optimistic UI update.
         */

        setNotifications(
          (current) =>
            current.map(
              (notification) =>
                notification.id === id
                  ? {
                      ...notification,
                      isRead: true
                    }
                  : notification
            )
        );

        try {
          await apiRequest(
            `/api/notifications/${id}/read`,
            {
              method: "PATCH"
            }
          );
        } catch (err) {
          console.error(
            "Mark notification read error:",
            err
          );

          /*
           * Reload authoritative state.
           */

          await loadNotifications();
        }
      },
      [
        loadNotifications
      ]
    );

  /*
   * ---------------------------------------------------------------
   * MARK ALL READ
   * ---------------------------------------------------------------
   */

  const markAllAsRead =
    useCallback(
      async () => {
        setNotifications(
          (current) =>
            current.map(
              (notification) => ({
                ...notification,
                isRead: true
              })
            )
        );

        try {
          await apiRequest(
            "/api/notifications/mark-all-read",
            {
              method: "PATCH"
            }
          );
        } catch (err) {
          console.error(
            "Mark all notifications read error:",
            err
          );

          await loadNotifications();
        }
      },
      [
        loadNotifications
      ]
    );

  /*
   * ---------------------------------------------------------------
   * DELETE
   * ---------------------------------------------------------------
   */

  const deleteNotification =
    useCallback(
      async (id) => {
        if (!id) {
          return;
        }

        try {
          await apiRequest(
            `/api/notifications/${id}`,
            {
              method: "DELETE"
            }
          );

          setNotifications(
            (current) =>
              current.filter(
                (item) =>
                  item.id !== id
              )
          );
        } catch (err) {
          console.error(
            "Delete notification error:",
            err
          );

          throw err;
        }
      },
      []
    );

  /*
   * ---------------------------------------------------------------
   * UNREAD COUNT
   * ---------------------------------------------------------------
   */

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (item) =>
            !item.isRead
        ).length,
      [notifications]
    );

  const value =
    useMemo(
      () => ({
        notifications,
        unreadCount,
        loading,
        error,
        userRole,
        reload:
          loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }),
      [
        notifications,
        unreadCount,
        loading,
        error,
        userRole,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification
      ]
    );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export function useNotifications() {
  const context =
    useContext(
      NotificationContext
    );

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider"
    );
  }

  return context;
}