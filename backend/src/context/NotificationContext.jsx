import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from "../services/api";

import {
  connectSocket,
  disconnectSocket
} from "../services/socket";

const NotificationContext =
  createContext(null);

export const NotificationProvider = ({
  children
}) => {
  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [socket, setSocket] =
    useState(null);

  /*
   * Load notifications.
   */
  const loadNotifications =
    useCallback(async () => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const data =
          await getNotifications({
            page: 1,
            limit: 20
          });

        setNotifications(
          data.notifications || []
        );

        setUnreadCount(
          data.unreadCount || 0
        );
      } catch (err) {
        console.error(
          "Failed to load notifications:",
          err
        );

        setError(
          err.message ||
            "Failed to load notifications"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /*
   * Connect Socket.IO.
   */
  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      return undefined;
    }

    const socketInstance =
      connectSocket(token);

    setSocket(socketInstance);

    return () => {
      disconnectSocket();
    };
  }, []);

  /*
   * Initial notification loading.
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
   * Listen for real-time notifications.
   */
  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleNewNotification =
      (notification) => {
        setNotifications(
          (previous) => {
            const exists =
              previous.some(
                (item) =>
                  item._id ===
                  notification._id
              );

            if (exists) {
              return previous;
            }

            return [
              notification,
              ...previous
            ];
          }
        );

        if (!notification.isRead) {
          setUnreadCount(
            (count) => count + 1
          );
        }
      };

    socket.on(
      "notification:new",
      handleNewNotification
    );

    return () => {
      socket.off(
        "notification:new",
        handleNewNotification
      );
    };
  }, [socket]);

  /*
   * Mark one notification as read.
   */
  const markAsRead =
    useCallback(
      async (notificationId) => {
        try {
          const data =
            await markNotificationRead(
              notificationId
            );

          setNotifications(
            (previous) =>
              previous.map(
                (notification) =>
                  notification._id ===
                  notificationId
                    ? {
                        ...notification,
                        isRead: true,
                        readAt:
                          data.notification
                            ?.readAt ||
                          new Date()
                            .toISOString()
                      }
                    : notification
              )
          );

          setUnreadCount(
            (count) =>
              Math.max(
                count - 1,
                0
              )
          );

          return data;
        } catch (err) {
          console.error(
            "Failed to mark notification as read:",
            err
          );

          throw err;
        }
      },
      []
    );

  /*
   * Mark everything as read.
   */
  const markAllAsRead =
    useCallback(async () => {
      try {
        await markAllNotificationsRead();

        setNotifications(
          (previous) =>
            previous.map(
              (notification) => ({
                ...notification,
                isRead: true,
                readAt:
                  notification.readAt ||
                  new Date()
                    .toISOString()
              })
            )
        );

        setUnreadCount(0);
      } catch (err) {
        console.error(
          "Failed to mark all notifications as read:",
          err
        );

        throw err;
      }
    }, []);

  /*
   * Delete notification.
   */
  const removeNotification =
    useCallback(
      async (notificationId) => {
        try {
          const notification =
            notifications.find(
              (item) =>
                item._id ===
                notificationId
            );

          await deleteNotification(
            notificationId
          );

          setNotifications(
            (previous) =>
              previous.filter(
                (item) =>
                  item._id !==
                  notificationId
              )
          );

          if (
            notification &&
            !notification.isRead
          ) {
            setUnreadCount(
              (count) =>
                Math.max(
                  count - 1,
                  0
                )
            );
          }
        } catch (err) {
          console.error(
            "Failed to delete notification:",
            err
          );

          throw err;
        }
      },
      [notifications]
    );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      socket,
      loadNotifications,
      markAsRead,
      markAllAsRead,
      removeNotification
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      socket,
      loadNotifications,
      markAsRead,
      markAllAsRead,
      removeNotification
    ]
  );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
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
};