import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import AdminShell from "./components/AdminShell.jsx";
import StaffShell from "./components/StaffShell.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import Inventory from "./pages/admin/Inventory.jsx";
import Billing from "./pages/admin/Billing.jsx";
import Invoices from "./pages/admin/Invoices.jsx";
import CustomerFolder from "./pages/admin/CustomerFolder.jsx";
import InvoicePrint from "./pages/admin/InvoicePrint.jsx";
import Creditors from "./pages/admin/Creditors.jsx";
import Receipts from "./pages/staff/Receipts.jsx";
import ReceiptDetail from "./pages/staff/ReceiptDetail.jsx";
import StaffFolder from "./pages/staff/StaffFolder.jsx";

function Gate({ role, children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center text-stone-500">
        Opening ledger…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/" : "/staff"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Gate role="admin">
            <AdminShell />
          </Gate>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="billing" element={<Billing />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/customer/:key" element={<CustomerFolder />} />
        <Route path="creditors" element={<Creditors />} />
        <Route path="creditors/customer/:key" element={<CustomerFolder />} />
      </Route>
      <Route
        path="/print/:id"
        element={
          <Gate>
            <InvoicePrint />
          </Gate>
        }
      />
      <Route
        path="/staff"
        element={
          <Gate role="staff">
            <StaffShell />
          </Gate>
        }
      >
        <Route index element={<Receipts />} />
        <Route path="customer/:key" element={<StaffFolder />} />
        <Route path="receipt/:id" element={<ReceiptDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
