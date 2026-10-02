import React from "react";

import {
  useRealtime
} from "../../context/RealtimeContext";

const ConnectionStatus = () => {
  const {
    connected
  } = useRealtime();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${
          connected
            ? "bg-green-500"
            : "bg-gray-400"
        }`}
      />

      <span className="text-gray-500">
        {connected
          ? "Live"
          : "Offline"}
      </span>
    </div>
  );
};

export default ConnectionStatus;