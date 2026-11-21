import { createContext, useContext, useEffect, useState } from "react";
import { nextOrderId } from "../data/orders";

const OrderContext = createContext(null);
const KEY = "merion_orders";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(read);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(orders));
  }, [orders]);

  // Live sync between browser windows (same pattern as the alerts)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setOrders(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // { client, ref, kg, departureAt } -> the saved order
  const addOrder = (data, user) => {
    const order = {
      id: nextOrderId(orders),
      ...data,
      createdAt: Date.now(),
      createdBy: { name: user.name, role: user.role },
    };
    setOrders((prev) => [...prev, order]);
    return order;
  };

  const cancelOrder = (id) => setOrders((prev) => prev.filter((o) => o.id !== id));

  return (
    <OrderContext.Provider value={{ orders, addOrder, cancelOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  return useContext(OrderContext);
}
