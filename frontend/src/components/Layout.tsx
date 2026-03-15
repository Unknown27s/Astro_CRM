import { useState, useEffect } from 'react';
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
    Cpu,
    Menu,
    X,
    ChevronDown,
} from 'lucide-react';

interface LayoutProps {
    setAuth: (value: boolean) => void;
}

export default function Layout({ setAuth }: LayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarOpen(false);
                setIsCollapsed(true);
            } else {
                setIsSidebarOpen(true);
                setIsCollapsed(window.innerWidth < 1024);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        { path: '/analytics', icon: Sparkles, label: 'ML Analytics' },
        { path: '/reports', icon: FileDown, label: 'Reports' },
        { path: '/import', icon: Upload, label: 'Import Data' },
        { path: '/online-store', icon: ShoppingBag, label: 'Online Store' },
        { path: '/ai', icon: Cpu, label: 'AI Studio' },
    ];

    const NavLink = ({ item }: { item: (typeof navItems)[0] }) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
            <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                        ? 'bg-primary-100 text-primary-700 font-medium shadow-sm'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                onClick={() => isMobile && setIsSidebarOpen(false)}
            >
                <Icon size={20} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
        );
    };

    return (
        <div className="flex h-screen bg-neutral-50">
            {/* Mobile overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`flex flex-col bg-white border-r border-neutral-200 shadow-sm transition-all duration-300 ${isMobile
                        ? 'fixed left-0 top-0 h-full z-40'
                        : ''
                    } ${isSidebarOpen ? 'w-64' : 'w-20'
                    } ${isMobile && !isSidebarOpen ? '-translate-x-full' : ''
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-neutral-200">
                    <div className="flex items-center justify-between">
                        {!isCollapsed && (
                            <div>
                                <h1 className="text-xl font-bold text-primary-600">CRM Pro</h1>
                                <p className="text-xs text-neutral-500">Retail Edition</p>
                            </div>
                        )}
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-1 hover:bg-neutral-100 rounded-lg"
                            >
                                <X size={20} className="text-neutral-600" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-2">
                    {navItems.map((item) => (
                        <NavLink key={item.path} item={item} />
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-neutral-200 space-y-2">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-600 hover:bg-danger-50 hover:text-danger-600 transition-all"
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <div className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 md:px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 hover:bg-neutral-100 rounded-lg"
                            >
                                <Menu size={24} className="text-neutral-600" />
                            </button>
                        )}
                        {!isMobile && !isCollapsed && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="p-2 hover:bg-neutral-100 rounded-lg hidden lg:block"
                            >
                                <ChevronDown size={20} className="text-neutral-600" />
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-neutral-900">
                            {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                        </h2>
                    </div>
                    <div className="text-sm text-neutral-500">v3.0.0</div>
                </div>

                {/* Page Content */}
                <div className="flex-1 overflow-auto">
                    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
