import React from "react";

import {
  useNavigate
} from "react-router-dom";

import NotificationBell from "../notifications/NotificationBell";
const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav>
      {/* Your existing navbar */}

      <div className="flex items-center gap-3">

        <NotificationBell
          onViewAll={() =>
            navigate("/notifications")
          }
        />

        {/* Existing cart button */}

        {/* Existing profile button */}

      </div>
    </nav>
  );
};

export default Navbar;