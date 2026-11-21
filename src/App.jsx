import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { BarcodeProvider } from "./context/BarcodeContext";
import { AlertProvider } from "./context/AlertContext";
import { MaterialProvider } from "./context/MaterialContext";
import AlertNotifier from "./components/AlertNotifier";

import ProtectedRoute from "./components/ProtectedRoute";
import { ATELIER_ROLES } from "./data/ateliers";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BarcodeScanner from "./pages/BarcodeScanner";
import Insights from "./pages/Insights";
import Predictions from "./pages/Predictions";
import Orders from "./pages/Orders";
import MyShifts from "./pages/MyShifts";
import { WORKER_ROLE } from "./data/shifts";
import { OrderProvider } from "./context/OrderContext";
import { ORDER_ROLES } from "./data/orders";
import { PREDICTION_ROLES } from "./data/predictions";
import { INSIGHT_ROLES } from "./data/analytics";
import { seedDemoDataOnce } from "./data/demoData";

// Fill the demo history before any provider reads localStorage (first launch only)
seedDemoDataOnce();

function App() {
  return (
    <AuthProvider>
      <AlertProvider>
      <AlertNotifier />
      <MaterialProvider>
      <OrderProvider>
      <BarcodeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/barcode"
              element={
                <ProtectedRoute allowedRoles={["Production Manager", ...ATELIER_ROLES]}>
                  <BarcodeScanner />
                </ProtectedRoute>
              }
            />

            {/* The Commercial page was retired: its order check now lives on /orders */}
            <Route path="/commercial" element={<Navigate to="/orders" replace />} />

            <Route
              path="/insights"
              element={
                <ProtectedRoute allowedRoles={INSIGHT_ROLES}>
                  <Insights />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-shifts"
              element={
                <ProtectedRoute allowedRoles={[WORKER_ROLE]}>
                  <MyShifts />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute allowedRoles={ORDER_ROLES}>
                  <Orders />
                </ProtectedRoute>
              }
            />

            <Route
              path="/predictions"
              element={
                <ProtectedRoute allowedRoles={PREDICTION_ROLES}>
                  <Predictions />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </BarcodeProvider>
      </OrderProvider>
      </MaterialProvider>
      </AlertProvider>
    </AuthProvider>
  );
}

export default App;
