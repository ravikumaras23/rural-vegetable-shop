import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  useNotifications
} from "../../context/NotificationContext.jsx";

import {
  formatNotificationDate,
  getNotificationPath,
  notificationClasses,
  notificationIcon
} from "./notificationHelpers.js";

export default function NotificationBell() {
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

  const [open, setOpen] =
    useState(false);

  const wrapperRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | CLOSE WHEN CLICKING OUTSIDE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    function handleClickOutside(
      event
    ) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | OPEN NOTIFICATION
  |--------------------------------------------------------------------------
  */
const handleNotificationClick =
  async (notification) => {
    try {
      if (
        !notification.isRead
      ) {
        await markRead(
          notification.id
        );
      }

      setOpen(false);

      navigate(
        getNotificationPath(
          notification
        )
      );
    } catch (error) {
      console.error(
        "Notification click error:",
        error
      );
    }
  };
  /*
  |--------------------------------------------------------------------------
  | MARK ALL
  |--------------------------------------------------------------------------
  */

  async function handleMarkAllRead() {
    try {
      await markAllRead();
    } catch (requestError) {
      console.error(
        "Unable to mark all notifications as read:",
        requestError
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  async function handleDelete(
    event,
    id
  ) {
    event.stopPropagation();

    try {
      await removeNotification(id);
    } catch (requestError) {
      console.error(
        "Unable to delete notification:",
        requestError
      );
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      {/* BELL */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm transition hover:bg-slate-50"
        aria-label="Notifications"
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* PANEL */}

      {open && (
        <div className="absolute right-0 top-12 z-[100] w-[min(94vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

          {/* HEADER */}

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Notifications
              </h3>

              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                {unreadCount} unread
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
              className="text-[11px] font-black text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>

          {/* ERROR */}

          {error && (
            <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* BODY */}

          <div className="max-h-[460px] overflow-y-auto">

            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  🔔
                </div>

                <p className="mt-4 text-sm font-black text-slate-800">
                  No notifications yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  New marketplace updates will appear here.
                </p>
              </div>
            ) : (
              notifications
                .slice(0, 20)
                .map(
                  (
                    notification
                  ) => (
                    <div
                      key={
                        notification.id
                      }
                      onClick={() =>
                        handleNotificationClick(
                          notification
                        )
                      }
                      className={`group flex cursor-pointer gap-3 border-b border-slate-100 px-4 py-4 transition hover:bg-slate-50 ${
                        notification.isRead
                          ? "bg-white"
                          : "bg-emerald-50/50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-sm ${notificationClasses(
                          notification.type
                        )}`}
                      >
                        {notificationIcon(
                          notification.type
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-black text-slate-900">
                            {
                              notification.title
                            }
                          </p>

                          {!notification.isRead && (
                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                          )}
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          {
                            notification.message
                          }
                        </p>

                        <p className="mt-2 text-[9px] font-bold text-slate-400">
                          {formatNotificationDate(
                            notification.createdAt
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(
                          event
                        ) =>
                          handleDelete(
                            event,
                            notification.id
                          )
                        }
                        className="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 group-hover:flex"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  )
                )
            )}
          </div>

          {/* FOOTER */}

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(
                  "/notifications"
                );
              }}
              className="w-full rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}