import { useEffect, useState, useCallback } from 'react';
import { customers, purchases, insights, aiService } from '../services/api';
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
import { Users, DollarSign, TrendingUp, ShoppingBag, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner, EmptyState } from '../components/ui/Avatar';
import { StatCard } from '../components/StatCard';
import toast from 'react-hot-toast';

const REFRESH_INTERVAL = 60000; // 60 seconds

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
    const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [aiSummary, setAiSummary] = useState<string>('');
    const [aiLoading, setAiLoading] = useState(false);

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
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadAiSummary = useCallback(async () => {
        setAiLoading(true);
        try {
            const res = await aiService.dashboardSummary();
            setAiSummary(res.data?.summary || '');
        } catch {
            setAiSummary('AI summary unavailable. Check your API key.');
        } finally {
            setAiLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard(true);
        loadAiSummary();
        const interval = setInterval(() => loadDashboard(false), REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [loadDashboard, loadAiSummary]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Spinner size="lg" className="mx-auto mb-4" />
                    <p className="text-neutral-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
                    <p className="text-neutral-500 mt-1">Welcome to your retail CRM overview</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadDashboard(true)}
                        title="Refresh now"
                    >
                        <RefreshCw size={16} />
                    </Button>
                </div>
            </div>

            {/* AI Insights Card */}
            <Card className="bg-gradient-to-r from-primary-50 via-primary-50 to-accent-50 border-primary-200">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-neutral-900">AI Business Insights</h3>
                                    <p className="text-xs text-neutral-500">Powered by ASI:One AI</p>
                                </div>
                            </div>
                            {aiLoading ? (
                                <div className="space-y-2">
                                    <div className="h-3 bg-primary-200 rounded animate-pulse w-full" />
                                    <div className="h-3 bg-primary-200 rounded animate-pulse w-5/6" />
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-700 leading-relaxed">
                                    {aiSummary || 'Click Refresh to generate AI insights about your business.'}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={loadAiSummary}
                            disabled={aiLoading}
                        >
                            {aiLoading ? 'Analyzing...' : 'Generate'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    title="Total Customers"
                    value={stats?.total_customers || 0}
                    variant="primary"
                />
                <StatCard
                    icon={TrendingUp}
                    title="Active Customers"
                    value={stats?.active_customers || 0}
                    variant="success"
                />
                <StatCard
                    icon={DollarSign}
                    title="Total Revenue"
                    value={`₹${(stats?.total_revenue || 0).toLocaleString()}`}
                    variant="primary"
                />
                <StatCard
                    icon={ShoppingBag}
                    title="VIP Customers"
                    value={stats?.vip_customers || 0}
                    variant="warning"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trends - Takes 2 columns */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Revenue Trends (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {revenueTrends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={revenueTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        dot={{ fill: '#22c55e' }}
                                        name="Revenue"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="purchase_count"
                                        stroke="#0ea5e9"
                                        strokeWidth={2}
                                        dot={{ fill: '#0ea5e9' }}
                                        name="Purchase Count"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState
                                title="No data available"
                                description="Revenue data will appear once purchases are recorded."
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Recent Purchases - Takes 1 column */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Purchases</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-[320px] overflow-y-auto">
                            {recentPurchases.length > 0 ? (
                                recentPurchases.map((purchase: any) => (
                                    <div key={purchase.id} className="p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-neutral-900 truncate">
                                                    {purchase.customer_name}
                                                </p>
                                                <p className="text-xs text-neutral-500 mt-1">
                                                    {purchase.purchase_date}
                                                </p>
                                            </div>
                                            <div className="text-right whitespace-nowrap">
                                                <p className="font-bold text-success-600">
                                                    ₹{purchase.total_amount.toFixed(2)}
                                                </p>
                                                <Badge variant="success" className="text-xs mt-1">
                                                    {purchase.payment_method || 'Cash'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <EmptyState title="No purchases yet" />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
