import { useState, useEffect, useRef } from 'react';
import { insights, reports } from '../services/api';
import toast from 'react-hot-toast';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign, Calendar, Download, FileText, X } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Insights() {
    const [period, setPeriod] = useState('30days');
    const [revenueTrends, setRevenueTrends] = useState<any>(null);
    const [customerStats, setCustomerStats] = useState<any>(null);
    const [purchasePatterns, setPurchasePatterns] = useState<any>(null);
    const [locationRevenue, setLocationRevenue] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Monthly report state
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [monthlyData, setMonthlyData] = useState<any>(null);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [reportStep, setReportStep] = useState<'select' | 'preview' | 'generating'>('select');
    const reportRef = useRef<HTMLDivElement>(null);

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
    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatCurrency = (value: number) => `₹${value?.toFixed(0) ?? '0'}`;

    const handleFetchMonthlyData = async () => {
        setGeneratingReport(true);
        try {
            const response = await reports.getMonthlyData(reportMonth, reportYear);
            setMonthlyData(response.data);
            setReportStep('preview');
        } catch (error) {
            console.error('Error fetching monthly data:', error);
            toast.error('Failed to fetch monthly data. Please try again.');
        } finally {
            setGeneratingReport(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportRef.current || !monthlyData) return;
        setReportStep('generating');

        try {
            // Wait a tick for any final render
            await new Promise((r) => setTimeout(r, 300));

            const element = reportRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 900,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`Monthly-Report-${MONTH_NAMES[reportMonth - 1]}-${reportYear}.pdf`);
            setShowReportModal(false);
            setReportStep('select');
            setMonthlyData(null);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Error generating PDF. Please try again.');
            setReportStep('preview');
        }
    };

    const closeModal = () => {
        setShowReportModal(false);
        setReportStep('select');
        setMonthlyData(null);
    };

    const yearOptions = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 4; y--) {
        yearOptions.push(y);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Business Insights</h1>
                    <p className="text-gray-600 mt-1">Visual analytics and trends</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Monthly Report Button */}
                    <button
                        onClick={() => { setShowReportModal(true); setReportStep('select'); }}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
                    >
                        <Download size={18} />
                        Monthly Report
                    </button>
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

            {/* Monthly Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                                    <FileText size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Monthly Business Report</h2>
                                    <p className="text-sm text-gray-500">Select period to generate a comprehensive report</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Step 1: Select Month/Year */}
                        {reportStep === 'select' && (
                            <div className="p-8">
                                <div className="max-w-md mx-auto space-y-6">
                                    <div className="text-center mb-6">
                                        <p className="text-gray-600">Choose the month and year for your report</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                                            <select
                                                value={reportMonth}
                                                onChange={(e) => setReportMonth(Number(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                                            >
                                                {MONTH_NAMES.map((name, idx) => (
                                                    <option key={idx} value={idx + 1}>{name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                                            <select
                                                value={reportYear}
                                                onChange={(e) => setReportYear(Number(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                                            >
                                                {yearOptions.map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                        <h4 className="font-semibold text-indigo-800 mb-2">Report includes:</h4>
                                        <ul className="text-sm text-indigo-700 space-y-1">
                                            <li>• Revenue & purchase KPI summary</li>
                                            <li>• Daily revenue trend chart</li>
                                            <li>• Customer distribution breakdown</li>
                                            <li>• Purchases by day of week chart</li>
                                            <li>• Revenue by location chart</li>
                                            <li>• Top customers ranking table</li>
                                            <li>• Top selling items & payment methods</li>
                                        </ul>
                                    </div>

                                    <button
                                        onClick={handleFetchMonthlyData}
                                        disabled={generatingReport}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                                    >
                                        {generatingReport ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Loading data...
                                            </>
                                        ) : (
                                            <>
                                                <FileText size={18} />
                                                Preview Report
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Preview & Download */}
                        {(reportStep === 'preview' || reportStep === 'generating') && monthlyData && (
                            <div className="p-6">
                                {/* Download action bar */}
                                <div className="flex items-center justify-between mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <FileText size={16} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-green-800">Report ready for {MONTH_NAMES[reportMonth - 1]} {reportYear}</p>
                                            <p className="text-sm text-green-600">Review the preview below, then download as PDF</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setReportStep('select')}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                        >
                                            Change Period
                                        </button>
                                        <button
                                            onClick={handleDownloadPDF}
                                            disabled={reportStep === 'generating'}
                                            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                                        >
                                            {reportStep === 'generating' ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Generating PDF...
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={16} />
                                                    Download PDF
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Report Preview (this is what gets captured) */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <ReportPreview
                                        reportRef={reportRef}
                                        data={monthlyData}
                                        monthName={MONTH_NAMES[reportMonth - 1]}
                                        year={reportYear}
                                        COLORS={COLORS}
                                        formatCurrency={formatCurrency}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

// ─── Monthly Report Preview Component ───────────────────────────────────────
interface ReportPreviewProps {
    reportRef: React.RefObject<HTMLDivElement | null>;
    data: any;
    monthName: string;
    year: number;
    COLORS: string[];
    formatCurrency: (v: number) => string;
}

function ReportPreview({ reportRef, data, monthName, year, COLORS, formatCurrency }: ReportPreviewProps) {
    const s = data.summary || {};
    const customerDistData = [
        { name: 'Active', value: data.customer_stats?.active_customers || 0 },
        { name: 'VIP', value: data.customer_stats?.vip_customers || 0 },
        { name: 'Inactive', value: data.customer_stats?.inactive_customers || 0 },
    ];

    return (
        <div
            ref={reportRef}
            style={{ width: '900px', backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}
        >
            {/* Cover Header */}
            <div style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                padding: '40px 48px',
                color: 'white'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: '13px', opacity: 0.8, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Retail CRM — Business Intelligence
                        </p>
                        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 6px' }}>
                            Monthly Business Report
                        </h1>
                        <p style={{ fontSize: '18px', opacity: 0.9, margin: 0 }}>
                            {monthName} {year}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right', opacity: 0.8 }}>
                        <p style={{ fontSize: '12px', margin: '0 0 4px' }}>Generated on</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* KPI Row in header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '32px' }}>
                    {[
                        { label: 'Total Revenue', value: `₹${(s.total_revenue || 0).toFixed(0)}`, sub: `${s.growth_percentage >= 0 ? '+' : ''}${s.growth_percentage ?? 0}% vs prev month`, color: '#34D399' },
                        { label: 'Total Purchases', value: s.total_purchases || 0, sub: 'transactions', color: '#60A5FA' },
                        { label: 'Avg Transaction', value: `₹${(s.avg_transaction || 0).toFixed(0)}`, sub: 'per purchase', color: '#FBBF24' },
                        { label: 'New Customers', value: data.new_customers || 0, sub: 'joined this month', color: '#F87171' },
                    ].map((kpi, i) => (
                        <div key={i} style={{
                            background: 'rgba(255,255,255,0.12)',
                            borderRadius: '12px',
                            padding: '16px',
                            borderLeft: `4px solid ${kpi.color}`
                        }}>
                            <p style={{ fontSize: '11px', opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {kpi.label}
                            </p>
                            <p style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px', color: kpi.color }}>{kpi.value}</p>
                            <p style={{ fontSize: '11px', opacity: 0.7, margin: 0 }}>{kpi.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '32px 48px', background: '#F8FAFC' }}>

                {/* Section: Daily Revenue Trend */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '4px', height: '20px', background: '#4F46E5', borderRadius: '2px' }} />
                        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                            Daily Revenue Trend
                        </h2>
                    </div>
                    {data.daily_revenue && data.daily_revenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={data.daily_revenue} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} name="Revenue" />
                                <Line type="monotone" dataKey="purchase_count" stroke="#4F46E5" strokeWidth={2} dot={{ r: 2.5 }} name="Purchases" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                            No purchase data for this month
                        </div>
                    )}
                </div>

                {/* Section: 2-column charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Customer Distribution Pie */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#10B981', borderRadius: '2px' }} />
                            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Customer Distribution</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={customerDistData.filter(d => d.value > 0)}
                                    cx="50%" cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    dataKey="value"
                                >
                                    {customerDistData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                            {customerDistData.map((d, i) => (
                                <span key={i} style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i], display: 'inline-block' }} />
                                    {d.name}: {d.value}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Purchases by Day of Week */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#F59E0B', borderRadius: '2px' }} />
                            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Purchases by Day</h2>
                        </div>
                        {data.by_day_of_week && data.by_day_of_week.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={data.by_day_of_week} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="day_name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="purchase_count" fill="#4F46E5" name="Purchases" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Section: Revenue by Location */}
                {data.by_location && data.by_location.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#EF4444', borderRadius: '2px' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Revenue by Location</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={Math.max(180, data.by_location.length * 40)}>
                            <BarChart data={data.by_location} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="location" width={110} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                <Bar dataKey="revenue" fill="#10B981" name="Revenue" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Section: Payment Methods */}
                {data.by_payment_method && data.by_payment_method.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#8B5CF6', borderRadius: '2px' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Payment Method Breakdown</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.by_payment_method.length, 4)}, 1fr)`, gap: '12px' }}>
                            {data.by_payment_method.map((m: any, i: number) => (
                                <div key={i} style={{
                                    background: '#F8FAFC',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    textAlign: 'center',
                                    borderTop: `3px solid ${COLORS[i % COLORS.length]}`
                                }}>
                                    <p style={{ fontSize: '22px', fontWeight: 'bold', color: COLORS[i % COLORS.length], margin: '0 0 4px' }}>
                                        {m.count}
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#374151', fontWeight: '600', margin: '0 0 4px' }}>
                                        {m.payment_method}
                                    </p>
                                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                                        ₹{(m.revenue || 0).toFixed(0)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section: Top Customers Table */}
                {data.top_customers && data.top_customers.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#4F46E5', borderRadius: '2px' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Top Customers This Month</h2>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#F3F4F6' }}>
                                    {['#', 'Name', 'Phone', 'Location', 'Revenue', 'Purchases'].map((h) => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Revenue' || h === 'Purchases' ? 'right' : 'left', color: '#6B7280', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.top_customers.map((c: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                display: 'inline-flex', width: '24px', height: '24px',
                                                background: i < 3 ? '#EEF2FF' : '#F9FAFB',
                                                color: i < 3 ? '#4F46E5' : '#6B7280',
                                                borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11px', fontWeight: 'bold'
                                            }}>{i + 1}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1F2937' }}>{c.name || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>{c.phone || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>{c.location || '-'}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                                            ₹{(c.spent || 0).toFixed(0)}
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6B7280' }}>{c.purchases || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Section: Top Items Table */}
                {data.top_items && data.top_items.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#F59E0B', borderRadius: '2px' }} />
                            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Top Selling Items</h2>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#F3F4F6' }}>
                                    {['#', 'Item Name', 'Units Sold', 'Revenue'].map((h) => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Units Sold' || h === 'Revenue' ? 'right' : 'left', color: '#6B7280', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.top_items.map((item: any, i: number) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{
                                                display: 'inline-flex', width: '24px', height: '24px',
                                                background: i < 3 ? '#FEF3C7' : '#F9FAFB',
                                                color: i < 3 ? '#D97706' : '#6B7280',
                                                borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11px', fontWeight: 'bold'
                                            }}>{i + 1}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1F2937' }}>{item.name}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4F46E5', fontWeight: '600' }}>{item.count}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                                            ₹{(item.revenue || 0).toFixed(0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    borderTop: '1px solid #E5E7EB',
                    paddingTop: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#9CA3AF',
                    fontSize: '11px'
                }}>
                    <span>Retail CRM — Monthly Report for {monthName} {year}</span>
                    <span>Confidential — For Internal Use Only</span>
                </div>
            </div>
        </div>
    );
}
