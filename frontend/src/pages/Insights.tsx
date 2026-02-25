import { useState, useEffect } from 'react';
import { insights } from '../services/api';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign, Calendar } from 'lucide-react';

export default function Insights() {
    const [period, setPeriod] = useState('30days');
    const [revenueTrends, setRevenueTrends] = useState<any>(null);
    const [customerStats, setCustomerStats] = useState<any>(null);
    const [purchasePatterns, setPurchasePatterns] = useState<any>(null);
    const [locationRevenue, setLocationRevenue] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAllInsights();
    }, [period]);

    const fetchAllInsights = async () => {
        setLoading(true);
        try {
            const [revenue, customer, patterns, location] = await Promise.all([
                insights.getRevenueTrends(period),
                insights.getCustomerStats(period),
                insights.getPurchasePatterns(period),
                insights.getRevenueByLocation(period)
            ]);

            setRevenueTrends(revenue.data);
            setCustomerStats(customer.data);
            setPurchasePatterns(patterns.data);
            setLocationRevenue(location.data);
        } catch (error) {
            console.error('Error fetching insights:', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

    const formatCurrency = (value: number) => `₹${value.toFixed(0)}`;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Business Insights</h1>
                    <p className="text-gray-600 mt-1">Visual analytics and trends</p>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="text-gray-400" size={20} />
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 3 Months</option>
                        <option value="180days">Last 6 Months</option>
                        <option value="365days">Last Year</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading insights...</div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    {revenueTrends?.summary && customerStats?.overview && (
                        <div className="grid grid-cols-4 gap-6">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <DollarSign size={32} />
                                    <span className={`text-sm px-2 py-1 rounded-full ${
                                        revenueTrends.summary.growth_percentage >= 0 
                                            ? 'bg-white bg-opacity-20' 
                                            : 'bg-red-500 bg-opacity-30'
                                    }`}>
                                        {revenueTrends.summary.growth_percentage >= 0 ? '+' : ''}
                                        {revenueTrends.summary.growth_percentage}%
                                    </span>
                                </div>
                                <p className="text-sm opacity-90">Total Revenue</p>
                                <p className="text-3xl font-bold">
                                    ₹{revenueTrends.summary.total_revenue?.toFixed(0) || 0}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                                <Users size={32} className="mb-2" />
                                <p className="text-sm opacity-90">Total Customers</p>
                                <p className="text-3xl font-bold">
                                    {customerStats.overview.total_customers || 0}
                                </p>
                                <p className="text-sm mt-1">
                                    {customerStats.overview.active_customers || 0} Active
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                                <ShoppingCart size={32} className="mb-2" />
                                <p className="text-sm opacity-90">Total Purchases</p>
                                <p className="text-3xl font-bold">
                                    {revenueTrends.summary.total_purchases || 0}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                                <TrendingUp size={32} className="mb-2" />
                                <p className="text-sm opacity-90">Avg Transaction</p>
                                <p className="text-3xl font-bold">
                                    ₹{revenueTrends.summary.avg_transaction?.toFixed(0) || 0}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Revenue Trends Chart */}
                    {revenueTrends?.trends && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue Trends</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={revenueTrends.trends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis tickFormatter={formatCurrency} />
                                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        stroke="#10B981" 
                                        strokeWidth={3}
                                        dot={{ fill: '#10B981', r: 4 }}
                                        name="Revenue"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="purchase_count" 
                                        stroke="#4F46E5" 
                                        strokeWidth={2}
                                        dot={{ fill: '#4F46E5', r: 3 }}
                                        name="Purchases"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        {/* Customer Distribution */}
                        {customerStats?.overview && (
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Customer Distribution</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Active', value: customerStats.overview.active_customers },
                                                { name: 'VIP', value: customerStats.overview.vip_customers },
                                                { name: 'Inactive', value: customerStats.overview.inactive_customers }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {[0, 1, 2].map((index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Purchase by Day of Week */}
                        {purchasePatterns?.by_day_of_week && (
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Purchases by Day</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={purchasePatterns.by_day_of_week}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day_name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="purchase_count" fill="#4F46E5" name="Purchases" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Top Items */}
                        {purchasePatterns?.top_items && purchasePatterns.top_items.length > 0 && (
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Top Selling Items</h2>
                                <div className="space-y-3">
                                    {purchasePatterns.top_items.slice(0, 8).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-800">{item.count} sold</p>
                                                <p className="text-sm text-gray-500">₹{item.revenue.toFixed(0)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Revenue by Location */}
                        {locationRevenue?.by_location && locationRevenue.by_location.length > 0 && (
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue by Location</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={locationRevenue.by_location.slice(0, 10)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={formatCurrency} />
                                        <YAxis type="category" dataKey="location" width={100} />
                                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                                        <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Top Customers */}
                    {customerStats?.top_customers && customerStats.top_customers.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Top Customers</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchases</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {customerStats.top_customers.map((customer: any, idx: number) => (
                                            <tr key={customer.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                        {idx + 1}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-800">{customer.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{customer.phone || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">{customer.location || '-'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-green-600">
                                                    ₹{customer.total_spent?.toFixed(2) || '0'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600">{customer.total_purchases || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Payment Methods */}
                    {purchasePatterns?.by_payment_method && purchasePatterns.by_payment_method.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Method Distribution</h2>
                            <div className="grid grid-cols-4 gap-4">
                                {purchasePatterns.by_payment_method.map((method: any) => (
                                    <div key={method.payment_method} className="bg-gray-50 rounded-lg p-4 text-center">
                                        <p className="text-2xl font-bold text-indigo-600">{method.count}</p>
                                        <p className="text-sm text-gray-600 mt-1">{method.payment_method}</p>
                                        <p className="text-xs text-gray-500 mt-1">₹{method.revenue.toFixed(0)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
