import React, {
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import NotificationItem from "../notifications/shared/NotificationItem";

import {
  getNotificationPath
} from "../notifications/shared/notificationHelpers";

import {
  useNotifications
} from "../context/NotificationContext";

export default function NotificationCenterPage() {
  const navigate =
    useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    removeNotification
  } = useNotifications();

  const [
    activeTab,
    setActiveTab
  ] = useState("all");

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredNotifications =
    useMemo(() => {
      if (activeTab === "unread") {
        return notifications.filter(
          (notification) =>
            !notification.isRead
        );
      }

      return notifications;
    }, [
      notifications,
      activeTab
    ]);

  /*
  |--------------------------------------------------------------------------
  | CLICK NOTIFICATION
  |--------------------------------------------------------------------------
  */

  const handleNotificationClick =
    async (notification) => {
      if (!notification) {
        return;
      }

      /*
       * Mark notification as read.
       */

      if (!notification.isRead) {
        try {
          await markRead(
            notification.id
          );
        } catch (error) {
          console.error(
            "Unable to mark notification as read:",
            error
          );
        }
      }

      /*
       * Calculate the destination
       * based on the notification role.
       */

      const destination =
        getNotificationPath(
          notification
        );

      console.log(
        "NOTIFICATION CLICK:",
        {
          notification,
          role:
            notification.role,
          metadata:
            notification.metadata,
          destination
        }
      );

      /*
       * Navigate.
       */

      navigate(
        destination
      );
    };

  /*
  |--------------------------------------------------------------------------
  | MARK ONE AS READ
  |--------------------------------------------------------------------------
  */

  const handleRead =
    async (notification) => {
      if (!notification) {
        return;
      }

      if (
        notification.isRead
      ) {
        return;
      }

      try {
        await markRead(
          notification.id
        );
      } catch (error) {
        console.error(
          "Unable to mark notification as read:",
          error
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const handleDelete =
    async (notification) => {
      if (!notification) {
        return;
      }

      try {
        await removeNotification(
          notification.id
        );
      } catch (error) {
        console.error(
          "Unable to delete notification:",
          error
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | MARK ALL READ
  |--------------------------------------------------------------------------
  */

  const handleMarkAllRead =
    async () => {
      try {
        await markAllRead();
      } catch (error) {
        console.error(
          "Unable to mark all notifications as read:",
          error
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">

          <div>
            <h1 className="text-2xl font-black text-slate-950">
              Notifications
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Stay updated with your RuralFresh activity.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleMarkAllRead
            }
            disabled={
              unreadCount === 0
            }
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark all as read
          </button>

        </div>

        {/* TABS */}

        <div className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">

          <button
            type="button"
            onClick={() =>
              setActiveTab("all")
            }
            className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === "all"
                ? "bg-emerald-600 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            All{" "}
            {notifications.length}
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab("unread")
            }
            className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === "unread"
                ? "bg-emerald-600 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Unread{" "}
            {unreadCount}
          </button>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* NOTIFICATIONS */}

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {loading ? (
            <div className="flex min-h-[180px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Loading notifications...
                </p>
              </div>
            </div>
          ) : filteredNotifications.length ===
            0 ? (
            <div className="px-6 py-16 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                🔔
              </div>

              <p className="mt-4 text-sm font-black text-slate-800">
                No notifications
              </p>

              <p className="mt-1 text-xs text-slate-400">
                You are all caught up.
              </p>

            </div>
          ) : (
            filteredNotifications.map(
              (notification) => (
                <NotificationItem
                  key={
                    notification.id
                  }
                  notification={
                    notification
                  }
                  onRead={
                    handleRead
                  }
                  onDelete={
                    handleDelete
                  }
                  onClick={
                    handleNotificationClick
                  }
                />
              )
            )
          )}

        </div>

      </main>
    </div>
  );
}