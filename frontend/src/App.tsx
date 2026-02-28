import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Campaigns from './pages/Campaigns';
import Insights from './pages/Insights';
import Import from './pages/Import';
import Login from './pages/Login';
import OnlineStore from './pages/OnlineStore';
import Shop from './pages/Shop';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(
    () => !!localStorage.getItem('token')
  );

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        duration: 3000,
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
        success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
      }} />
      <Routes>
        <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
        {/* Public storefront — no auth required */}
        <Route path="/shop" element={<Shop />} />

        {isAuthenticated ? (
          <Route path="/" element={<Layout setAuth={setIsAuthenticated} />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="insights" element={<Insights />} />
            <Route path="import" element={<Import />} />
            <Route path="online-store" element={<OnlineStore />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
