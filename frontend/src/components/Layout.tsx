import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    DollarSign,
    BarChart3,
    FileText,
    Upload,
    LogOut,
} from 'lucide-react';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/contacts', icon: Users, label: 'Contacts' },
        { path: '/sales', icon: DollarSign, label: 'Sales' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/import', icon: Upload, label: 'Import Data' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-indigo-900 to-indigo-700 text-white shadow-xl">
                <div className="p-6">
                    <h1 className="text-2xl font-bold">CRM Pro</h1>
                    <p className="text-indigo-200 text-sm mt-1">Analytics & Insights</p>
                </div>

                <nav className="mt-6">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-6 py-3 transition-all ${isActive
                                        ? 'bg-white/20 border-l-4 border-white'
                                        : 'hover:bg-white/10'
                                    }`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="absolute bottom-6 left-6 right-6 flex items-center gap-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className="ml-64 p-8">
                <Outlet />
            </main>
        </div>
    );
}
