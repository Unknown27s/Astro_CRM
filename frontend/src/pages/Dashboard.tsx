import { useEffect, useState, useCallback } from 'react';
import { customers, purchases, insights } from '../services/api';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Users, DollarSign, TrendingUp, ShoppingBag, RefreshCw } from 'lucide-react';

const REFRESH_INTERVAL = 60000; // 60 seconds

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [revenueTrends, setRevenueTrends] = useState <any[]>([]);
    const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const loadDashboard = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const [customerRes, revRes, recentRes] = await Promise.all([
                customers.getStats(),
                insights.getRevenueTrends('30days'),
                purchases.getRecent(5),
            ]);
            setStats(customerRes.data);
            setRevenueTrends(revRes.data.trends || []);
            setRecentPurchases(recentRes.data.purchases || []);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard(true);
        const interval = setInterval(() => loadDashboard(false), REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [loadDashboard]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading dashboard...</div>
            </div>
        );
    }

    const kpiCards = [
        {
            label: 'Total Customers',
            value: stats?.total_customers || 0,
            icon: Users,
            color: 'bg-blue-500',
        },
        {
            label: 'Active Customers',
            value: stats?.active_customers || 0,
            icon: TrendingUp,
            color: 'bg-green-500',
        },
        {
            label: 'Total Revenue',
            value: `₹${(stats?.total_revenue || 0).toLocaleString()}`,
            icon: DollarSign,
            color: 'bg-purple-500',
        },
        {
            label: 'VIP Customers',
            value: stats?.vip_customers || 0,
            icon: ShoppingBag,
            color: 'bg-orange-500',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome to your retail CRM overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                        Updated {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button onClick={() => loadDashboard(false)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Refresh now">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-800 mt-1">
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="text-white" size={24} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trends */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Revenue Trends (Last 30 Days)
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#10B981"
                                strokeWidth={3}
                                name="Revenue"
                            />
                            <Line
                                type="monotone"
                                dataKey="purchase_count"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                name="Purchases"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Purchases */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Recent Purchases
                    </h2>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {recentPurchases.map((purchase: any) => (
                            <div
                                key={purchase.id}
                                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{purchase.customer_name}</p>
                                    <p className="text-sm text-gray-600">{purchase.purchase_date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">₹{purchase.total_amount.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">{purchase.payment_method || 'Cash'}</p>
                                </div>
                            </div>
                        ))}
                        {recentPurchases.length === 0 && (
                            <p className="text-center text-gray-500 py-8">No recent purchases</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
