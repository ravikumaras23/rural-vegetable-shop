import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getSocket
} from "../services/socket";

const RealtimeContext =
  createContext(null);

export const RealtimeProvider = ({
  children
}) => {
  const [connected, setConnected] =
    useState(false);

  const [lastOrderEvent, setLastOrderEvent] =
    useState(null);

  const [lastProductEvent, setLastProductEvent] =
    useState(null);

  const [lastPaymentEvent, setLastPaymentEvent] =
    useState(null);

  const [lastInventoryEvent, setLastInventoryEvent] =
    useState(null);

  const [lastAdminEvent, setLastAdminEvent] =
    useState(null);

  const [orderRefreshKey, setOrderRefreshKey] =
    useState(0);

  const [productRefreshKey, setProductRefreshKey] =
    useState(0);

  const [dashboardRefreshKey, setDashboardRefreshKey] =
    useState(0);

  const refreshOrders = useCallback(() => {
    setOrderRefreshKey(
      (value) => value + 1
    );
  }, []);

  const refreshProducts = useCallback(() => {
    setProductRefreshKey(
      (value) => value + 1
    );
  }, []);

  const refreshDashboard = useCallback(() => {
    setDashboardRefreshKey(
      (value) => value + 1
    );
  }, []);

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return undefined;
    }

    const handleConnect = () => {
      setConnected(true);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    /*
     * Orders
     */
    const handleOrderCreated = (data) => {
      setLastOrderEvent({
        type: "created",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshOrders();
      refreshDashboard();
    };

    const handleOrderCancelled = (data) => {
      setLastOrderEvent({
        type: "cancelled",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshOrders();
      refreshDashboard();
    };

    const handleOrderStatusUpdated = (
      data
    ) => {
      setLastOrderEvent({
        type: "status-updated",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshOrders();
      refreshDashboard();
    };

    /*
     * Products
     */
    const handleProductCreated = (data) => {
      setLastProductEvent({
        type: "created",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshProducts();
      refreshDashboard();
    };

    const handleProductUpdated = (data) => {
      setLastProductEvent({
        type: "updated",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshProducts();
      refreshDashboard();
    };

    const handleProductStockUpdated = (
      data
    ) => {
      setLastProductEvent({
        type: "stock-updated",
        data,
        receivedAt:
          new Date().toISOString()
      });

      setLastInventoryEvent(data);

      refreshProducts();
      refreshDashboard();
    };

    const handleProductOutOfStock = (
      data
    ) => {
      setLastInventoryEvent(data);

      refreshProducts();
      refreshDashboard();
    };

    /*
     * Payments
     */
    const handlePaymentSuccessful = (
      data
    ) => {
      setLastPaymentEvent({
        type: "successful",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshOrders();
      refreshDashboard();
    };

    const handlePaymentFailed = (data) => {
      setLastPaymentEvent({
        type: "failed",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshOrders();
      refreshDashboard();
    };

    /*
     * Admin events.
     */
    const handleAdminOrderCreated = (
      data
    ) => {
      setLastAdminEvent({
        type: "order-created",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshOrders();
      refreshDashboard();
    };

    const handleAdminProductCreated = (
      data
    ) => {
      setLastAdminEvent({
        type: "product-created",
        data,
        receivedAt:
          new Date().toISOString()
      });

      refreshProducts();
      refreshDashboard();
    };

    const handleAdminInventoryAlert = (
      data
    ) => {
      setLastAdminEvent({
        type: "inventory-alert",
        data,
        receivedAt:
          new Date().toISOString()
      });

      setLastInventoryEvent(data);
      refreshDashboard();
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "order:created",
      handleOrderCreated
    );

    socket.on(
      "order:cancelled",
      handleOrderCancelled
    );

    socket.on(
      "order:status-updated",
      handleOrderStatusUpdated
    );

    socket.on(
      "product:created",
      handleProductCreated
    );

    socket.on(
      "product:updated",
      handleProductUpdated
    );

    socket.on(
      "product:stock-updated",
      handleProductStockUpdated
    );

    socket.on(
      "product:out-of-stock",
      handleProductOutOfStock
    );

    socket.on(
      "payment:successful",
      handlePaymentSuccessful
    );

    socket.on(
      "payment:failed",
      handlePaymentFailed
    );

    socket.on(
      "admin:order-created",
      handleAdminOrderCreated
    );

    socket.on(
      "admin:product-created",
      handleAdminProductCreated
    );

    socket.on(
      "admin:inventory-alert",
      handleAdminInventoryAlert
    );

    setConnected(socket.connected);

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "order:created",
        handleOrderCreated
      );

      socket.off(
        "order:cancelled",
        handleOrderCancelled
      );

      socket.off(
        "order:status-updated",
        handleOrderStatusUpdated
      );

      socket.off(
        "product:created",
        handleProductCreated
      );

      socket.off(
        "product:updated",
        handleProductUpdated
      );

      socket.off(
        "product:stock-updated",
        handleProductStockUpdated
      );

      socket.off(
        "product:out-of-stock",
        handleProductOutOfStock
      );

      socket.off(
        "payment:successful",
        handlePaymentSuccessful
      );

      socket.off(
        "payment:failed",
        handlePaymentFailed
      );

      socket.off(
        "admin:order-created",
        handleAdminOrderCreated
      );

      socket.off(
        "admin:product-created",
        handleAdminProductCreated
      );

      socket.off(
        "admin:inventory-alert",
        handleAdminInventoryAlert
      );
    };
  }, [
    refreshOrders,
    refreshProducts,
    refreshDashboard
  ]);

  const value = useMemo(
    () => ({
      connected,

      lastOrderEvent,
      lastProductEvent,
      lastPaymentEvent,
      lastInventoryEvent,
      lastAdminEvent,

      orderRefreshKey,
      productRefreshKey,
      dashboardRefreshKey,

      refreshOrders,
      refreshProducts,
      refreshDashboard
    }),
    [
      connected,
      lastOrderEvent,
      lastProductEvent,
      lastPaymentEvent,
      lastInventoryEvent,
      lastAdminEvent,
      orderRefreshKey,
      productRefreshKey,
      dashboardRefreshKey,
      refreshOrders,
      refreshProducts,
      refreshDashboard
    ]
  );

  return (
    <RealtimeContext.Provider
      value={value}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context =
    useContext(RealtimeContext);

  if (!context) {
    throw new Error(
      "useRealtime must be used inside RealtimeProvider"
    );
  }

  return context;
};