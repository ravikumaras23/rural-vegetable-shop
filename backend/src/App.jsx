import React from "react";
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import NotificationsPage from "./pages/notifications/NotificationsPage";




function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/notifications"
          element={<NotificationsPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;