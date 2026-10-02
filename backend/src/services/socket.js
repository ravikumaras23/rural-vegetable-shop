import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

let socket = null;

export const connectSocket = (token) => {
  if (!token) {
    return null;
  }

  /*
   * Reuse existing connection.
   */
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token
    },

    withCredentials: true,

    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    console.log(
      "Socket connected:",
      socket.id
    );
  });

  socket.on("connect_error", (error) => {
    console.error(
      "Socket connection error:",
      error.message
    );
  });

  socket.on("disconnect", (reason) => {
    console.log(
      "Socket disconnected:",
      reason
    );
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};