import { useState, useEffect, useRef } from 'react';
import { insights, reports } from '../services/api';
import toast from 'react-hot-toast';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign, Download, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Label, Select } from '../components/ui/Label';
import { Spinner } from '../components/ui/Avatar';

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
            toast.error('Failed to load insights');
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatCurrency = (value: number | string | undefined) => `₹${Number(value || 0).toFixed(0)}`;

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
            toast.success('PDF downloaded successfully');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Spinner size="lg" className="mx-auto mb-4" />
                    <p className="text-neutral-500">Loading insights...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Business Insights</h1>
                    <p className="text-neutral-500 mt-1">Visual analytics and trends</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            setShowReportModal(true);
                            setReportStep('select');
                        }}
                        size="md"
                    >
                        <Download size={16} className="mr-2" />
                        Monthly Report
                    </Button>
                    <Select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="h-10"
                    >
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="90days">Last 3 Months</option>
                        <option value="180days">Last 6 Months</option>
                        <option value="365days">Last Year</option>
                    </Select>
                </div>
            </div>

            {/* Monthly Report Modal */}
            <Modal
                isOpen={showReportModal}
                onClose={closeModal}
                size="xl"
            >
                <div className="space-y-6">
                    {/* Modal Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-neutral-200">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">Monthly Business Report</h2>
                            <p className="text-sm text-neutral-500">Select period to generate a comprehensive report</p>
                        </div>
                    </div>

                    {/* Step 1: Select Month/Year */}
                    {reportStep === 'select' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="text-center mb-6">
                                <p className="text-neutral-600">Choose the month and year for your report</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-2 block">Month</Label>
                                    <Select
                                        value={reportMonth}
                                        onChange={(e) => setReportMonth(Number(e.target.value))}
                                    >
                                        {MONTH_NAMES.map((name, idx) => (
                                            <option key={idx} value={idx + 1}>{name}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Year</Label>
                                    <Select
                                        value={reportYear}
                                        onChange={(e) => setReportYear(Number(e.target.value))}
                                    >
                                        {yearOptions.map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                            <Card className="border-primary-200 bg-primary-50">
                                <CardContent className="p-4">
                                    <h4 className="font-semibold text-primary-900 mb-2">Report includes:</h4>
                                    <ul className="text-sm text-primary-800 space-y-1">
                                        <li>• Revenue & purchase KPI summary</li>
                                        <li>• Daily revenue trend chart</li>
                                        <li>• Customer distribution breakdown</li>
                                        <li>• Purchases by day of week chart</li>
                                        <li>• Revenue by location chart</li>
                                        <li>• Top customers ranking table</li>
                                        <li>• Top selling items & payment methods</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Button
                                onClick={handleFetchMonthlyData}
                                disabled={generatingReport}
                                fullWidth
                                size="md"
                            >
                                {generatingReport ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin mr-2" />
                                        Loading data...
                                    </>
                                ) : (
                                    <>
                                        <FileText size={16} className="mr-2" />
                                        Preview Report
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Preview & Download */}
                    {(reportStep === 'preview' || reportStep === 'generating') && monthlyData && (
                        <div className="space-y-6">
                            {/* Download action bar */}
                            <Card className="border-success-200 bg-success-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
                                                <FileText size={16} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-success-900">
                                                    Report ready for {MONTH_NAMES[reportMonth - 1]} {reportYear}
                                                </p>
                                                <p className="text-sm text-success-700">
                                                    Review the preview below, then download as PDF
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={() => setReportStep('select')}
                                                variant="secondary"
                                                size="sm"
                                            >
                                                Change Period
                                            </Button>
                                            <Button
                                                onClick={handleDownloadPDF}
                                                disabled={reportStep === 'generating'}
                                                size="sm"
                                            >
                                                {reportStep === 'generating' ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin mr-2" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={14} className="mr-2" />
                                                        Download PDF
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Report Preview (this is what gets captured) */}
                            <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
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
            </Modal>

            {/* Summary Cards */}
            {revenueTrends?.summary && customerStats?.overview && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-neutral-500 font-medium mb-2">Total Revenue</p>
                                    <p className="text-3xl font-bold text-neutral-900">
                                        ₹{Number(revenueTrends.summary.total_revenue || 0).toFixed(0)}
                                    </p>
                                    <div className={`text-sm font-semibold mt-2 ${revenueTrends.summary.growth_percentage >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                        {revenueTrends.summary.growth_percentage >= 0 ? '+' : ''}
                                        {revenueTrends.summary.growth_percentage}% vs prev
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-success-50">
                                    <DollarSign size={24} className="text-success-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-neutral-500 font-medium mb-2">Total Customers</p>
                                    <p className="text-3xl font-bold text-neutral-900">
                                        {customerStats.overview.total_customers || 0}
                                    </p>
                                    <p className="text-sm text-neutral-500 mt-2">
                                        {customerStats.overview.active_customers || 0} Active
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-primary-50">
                                    <Users size={24} className="text-primary-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-neutral-500 font-medium mb-2">Total Purchases</p>
                                    <p className="text-3xl font-bold text-neutral-900">
                                        {revenueTrends.summary.total_purchases || 0}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-accent-50">
                                    <ShoppingCart size={24} className="text-accent-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-neutral-500 font-medium mb-2">Avg Transaction</p>
                                    <p className="text-3xl font-bold text-neutral-900">
                                        ₹{Number(revenueTrends.summary.avg_transaction || 0).toFixed(0)}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-warning-50">
                                    <TrendingUp size={24} className="text-warning-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Revenue Trends Chart */}
            {revenueTrends?.trends && (
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={revenueTrends.trends} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                <YAxis tickFormatter={formatCurrency} stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    formatter={(value: any) => formatCurrency(value)}
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
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Distribution */}
                {customerStats?.overview && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                        label={({ name, percent }: any) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
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
                        </CardContent>
                    </Card>
                )}

                {/* Purchase by Day of Week */}
                {purchasePatterns?.by_day_of_week && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchases by Day</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={purchasePatterns.by_day_of_week} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="day_name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="purchase_count" fill="#4F46E5" name="Purchases" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Items */}
                {purchasePatterns?.top_items && purchasePatterns.top_items.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Selling Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {purchasePatterns.top_items.slice(0, 8).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <span className="font-medium text-neutral-900">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-neutral-900">{item.count} sold</p>
                                            <p className="text-sm text-neutral-500">₹{Number(item.revenue || 0).toFixed(0)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Revenue by Location */}
                {locationRevenue?.by_location && locationRevenue.by_location.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue by Location</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={locationRevenue.by_location.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" tickFormatter={formatCurrency} stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                    <YAxis type="category" dataKey="location" width={90} stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(value)}
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="revenue" fill="#10B981" name="Revenue" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Top Customers */}
            {customerStats?.top_customers && customerStats.top_customers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Top Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-200">
                                        <th className="px-4 py-3 text-left font-semibold text-neutral-600">Rank</th>
                                        <th className="px-4 py-3 text-left font-semibold text-neutral-600">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold text-neutral-600">Phone</th>
                                        <th className="px-4 py-3 text-left font-semibold text-neutral-600">Location</th>
                                        <th className="px-4 py-3 text-right font-semibold text-neutral-600">Total Spent</th>
                                        <th className="px-4 py-3 text-right font-semibold text-neutral-600">Purchases</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerStats.top_customers.map((customer: any, idx: number) => (
                                        <tr key={customer.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                            <td className="px-4 py-3">
                                                <Badge variant="default">{idx + 1}</Badge>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-neutral-900">{customer.name}</td>
                                            <td className="px-4 py-3 text-neutral-600">{customer.phone || '-'}</td>
                                            <td className="px-4 py-3 text-neutral-600">{customer.location || '-'}</td>
                                            <td className="px-4 py-3 text-right font-bold text-success-600">
                                                ₹{Number(customer.total_spent || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-neutral-600">{customer.total_purchases || 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Payment Methods */}
            {purchasePatterns?.by_payment_method && purchasePatterns.by_payment_method.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Method Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {purchasePatterns.by_payment_method.map((method: any) => (
                                <div key={method.payment_method} className="bg-neutral-50 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-primary-600">{method.count}</p>
                                    <p className="text-sm text-neutral-600 mt-1">{method.payment_method}</p>
                                    <p className="text-xs text-neutral-500 mt-1">₹{Number(method.revenue || 0).toFixed(0)}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
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
                background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
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
                        { label: 'Total Revenue', value: `₹${Number(s.total_revenue || 0).toFixed(0)}`, sub: `${s.growth_percentage >= 0 ? '+' : ''}${s.growth_percentage ?? 0}% vs prev month`, color: '#10B981' },
                        { label: 'Total Purchases', value: s.total_purchases || 0, sub: 'transactions', color: '#3b82f6' },
                        { label: 'Avg Transaction', value: `₹${Number(s.avg_transaction || 0).toFixed(0)}`, sub: 'per purchase', color: '#f59e0b' },
                        { label: 'New Customers', value: data.new_customers || 0, sub: 'joined this month', color: '#ef4444' },
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
                        <div style={{ width: '4px', height: '20px', background: '#0ea5e9', borderRadius: '2px' }} />
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
                                <Line type="monotone" dataKey="purchase_count" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2.5 }} name="Purchases" />
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
                                    label={({ name, percent }: any) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
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
                            <div style={{ width: '4px', height: '20px', background: '#f59e0b', borderRadius: '2px' }} />
                            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1F2937', margin: 0 }}>Purchases by Day</h2>
                        </div>
                        {data.by_day_of_week && data.by_day_of_week.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={data.by_day_of_week} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="day_name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="purchase_count" fill="#0ea5e9" name="Purchases" radius={[4, 4, 0, 0]} />
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
                            <div style={{ width: '4px', height: '20px', background: '#ef4444', borderRadius: '2px' }} />
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
                                        ₹{Number(m.revenue || 0).toFixed(0)}
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
                            <div style={{ width: '4px', height: '20px', background: '#0ea5e9', borderRadius: '2px' }} />
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
                                                background: i < 3 ? '#DBEAFE' : '#F9FAFB',
                                                color: i < 3 ? '#0ea5e9' : '#6B7280',
                                                borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11px', fontWeight: 'bold'
                                            }}>{i + 1}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#1F2937' }}>{c.name || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>{c.phone || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: '#6B7280' }}>{c.location || '-'}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                                            ₹{Number(c.spent || 0).toFixed(0)}
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
                            <div style={{ width: '4px', height: '20px', background: '#f59e0b', borderRadius: '2px' }} />
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
                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0ea5e9', fontWeight: '600' }}>{item.count}</td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                                            ₹{Number(item.revenue || 0).toFixed(0)}
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
