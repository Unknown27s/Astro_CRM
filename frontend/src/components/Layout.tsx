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
    CalendarCheck,
    Handshake,
    ShieldCheck,
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
            const smallMobile = window.innerWidth < 600; // Collapse to icons below 600px
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarOpen(false);
                setIsCollapsed(smallMobile); // Collapse on very small screens (<600px)
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
        // ── Core (high value, used daily) ──
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/customers', icon: Users, label: 'Customers' },
        { path: '/deals', icon: Handshake, label: 'Deals Pipeline' },
        { path: '/activities', icon: CalendarCheck, label: 'Tasks & Activities' },
        { path: '/analytics', icon: Sparkles, label: 'ML Analytics' },
        { path: '/ai', icon: Cpu, label: 'AI Studio' },
        // ── Marketing & Reports ──
        { path: '/campaigns', icon: Send, label: 'Campaigns' },
        { path: '/insights', icon: BarChart3, label: 'Insights' },
        { path: '/reports', icon: FileDown, label: 'Reports' },
        // ── Operations & Admin ──
        { path: '/stock', icon: ShoppingBag, label: 'Stock Management' },
        { path: '/online-store', icon: ShoppingBag, label: 'Online Store' },
        { path: '/import', icon: Upload, label: 'Import Data' },
        { path: '/users', icon: ShieldCheck, label: 'User Roles' },
    ];

    const NavLink = ({ item }: { item: (typeof navItems)[0] }) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
            <Link
                to={item.path}
                className={`flex items-center rounded-lg transition-all justify-center ${
                    isCollapsed ? 'p-2' : 'gap-3 px-4 py-3'
                } ${isActive
                        ? 'bg-primary-100 text-primary-700 font-medium shadow-sm'
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                title={isCollapsed ? item.label : ''}
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
                    } ${isSidebarOpen ? 'w-64' : isCollapsed ? 'w-16' : 'w-20'
                    } ${isMobile && !isSidebarOpen ? '-translate-x-full' : ''
                    }`}
            >
                {/* Header */}
                <div className={`border-b border-neutral-200 transition-all ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <div className="flex items-center justify-between">
                        {!isCollapsed && (
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">AstroCRM</h1>
                                <p className="text-xs text-neutral-500">Retail Edition v3.0</p>
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
                <nav className={`flex-1 overflow-y-auto transition-all ${isCollapsed ? 'p-1 space-y-1' : 'p-3 space-y-2'}`}>
                    {navItems.map((item) => (
                        <NavLink key={item.path} item={item} />
                    ))}
                </nav>

                {/* Footer */}
                <div className={`border-t border-neutral-200 transition-all ${isCollapsed ? 'p-1' : 'p-3'}`}>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center rounded-lg text-neutral-600 hover:bg-danger-50 hover:text-danger-600 transition-all ${
                            isCollapsed ? 'p-2 justify-center' : 'gap-3 px-4 py-3'
                        }`}
                        title={isCollapsed ? 'Logout' : ''}
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
                    <div className="text-sm text-neutral-500 flex items-center gap-2">
                        <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                        AstroCRM v3.0.0
                    </div>
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
