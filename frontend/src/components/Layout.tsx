import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Send,
    BarChart3,
    Upload,
    LogOut,
    ShoppingBag,
    Sparkles,
    FileDown,
} from 'lucide-react';

interface LayoutProps {
    setAuth: (value: boolean) => void;
}

export default function Layout({ setAuth }: LayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        setAuth(false);
        navigate('/login');
    };

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/customers', icon: Users, label: 'Customers' },
        { path: '/campaigns', icon: Send, label: 'Campaigns' },
        { path: '/insights', icon: BarChart3, label: 'Insights' },
        { path: '/online-store', icon: ShoppingBag, label: 'Online Store' },
        { path: '/analytics', icon: Sparkles, label: 'ML Analytics' },
        { path: '/reports', icon: FileDown, label: 'Reports' },
        { path: '/import', icon: Upload, label: 'Import Data' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-indigo-900 to-indigo-700 text-white shadow-xl flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold">Retail CRM</h1>
                    <p className="text-indigo-200 text-sm mt-1">Purchase & Campaign Tracking</p>
                </div>

                <nav className="mt-6 flex-1">
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

                <div className="p-4 border-t border-white/10">
                    <p className="text-xs text-indigo-200 text-center">
                        v3.0.0 - Retail Edition
                    </p>
                </div>

                <button
                    onClick={handleLogout}
                    className="m-4 flex items-center gap-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
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
