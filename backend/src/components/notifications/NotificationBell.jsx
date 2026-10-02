import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNotifications
} from "../../context/NotificationContext";

import NotificationDropdown from "./NotificationDropdown";

const NotificationBell = ({
  onViewAll
}) => {
  const {
    unreadCount
  } = useNotifications();

  const [open, setOpen] =
    useState(false);

  const containerRef =
    useRef(null);

  /*
   * Close when clicking outside.
   */
  useEffect(() => {
    const handleOutsideClick =
      (event) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target
          )
        ) {
          setOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (previous) =>
              !previous
          )
        }
        aria-label="Notifications"
        className="relative rounded-full p-2 text-gray-700 hover:bg-gray-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-2.31 6.022 23.848 23.848 0 005.454 1.31m5.713 0a24.255 24.255 0 01-5.713 0m5.713 0a3 3 0 11-5.713 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          onClose={() =>
            setOpen(false)
          }
          onViewAll={onViewAll}
        />
      )}
    </div>
  );
};

export default NotificationBell;