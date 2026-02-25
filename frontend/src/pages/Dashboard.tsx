import React, { useEffect, useState } from 'react';
import { analytics } from '../services/api';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';

export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [salesTrends, setSalesTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [dashRes, trendsRes] = await Promise.all([
                analytics.getDashboard(),
                analytics.getSalesTrends({ period: 'month', limit: 12 }),
            ]);
            setDashboardData(dashRes.data);
            setSalesTrends(trendsRes.data.trends);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading dashboard...</div>
            </div>
        );
    }

    const stats = [
        {
            label: 'Total Contacts',
            value: dashboardData?.contacts?.count || 0,
            icon: Users,
            color: 'bg-blue-500',
        },
        {
            label: 'Total Deals',
            value: dashboardData?.deals?.total_deals || 0,
            icon: TrendingUp,
            color: 'bg-green-500',
        },
        {
            label: 'Total Revenue',
            value: `$${(dashboardData?.sales?.total_revenue || 0).toLocaleString()}`,
            icon: DollarSign,
            color: 'bg-purple-500',
        },
        {
            label: 'Total Sales',
            value: dashboardData?.sales?.total_sales || 0,
            icon: Activity,
            color: 'bg-orange-500',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome to your CRM overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
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
                {/* Sales Trends */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Sales Trends (Last 12 Months)
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                name="Revenue"
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Sales Count"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Activities */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Recent Activities
                    </h2>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {dashboardData?.recentActivities?.slice(0, 5).map((activity: any) => (
                            <div
                                key={activity.id}
                                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <Activity size={16} className="text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{activity.subject}</p>
                                    <p className="text-sm text-gray-600">
                                        {activity.first_name} {activity.last_name} • {activity.type}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
