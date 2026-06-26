import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Flows from './pages/Flows.jsx';
import ConnectInstagram from './pages/ConnectInstagram.jsx';
import Billing from './pages/Billing.jsx';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/flows" element={<PrivateRoute><Flows /></PrivateRoute>} />
      <Route path="/connect" element={<PrivateRoute><ConnectInstagram /></PrivateRoute>} />
      <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
