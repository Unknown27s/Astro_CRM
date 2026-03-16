import { useEffect, useState } from 'react';
import { analytics, aiService } from '../services/api';
import toast from 'react-hot-toast';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, LineChart, Line, AreaChart, Area, Cell,
} from 'recharts';
import {
    Sparkles, Users, Brain, Loader2, AlertTriangle, TrendingUp,
    DollarSign, ShoppingBag, Target, BarChart3, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Avatar';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

type TabId = 'segmentation' | 'rfm' | 'churn' | 'ltv' | 'affinity' | 'forecast' | 'cohort';

const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'segmentation', label: 'Segmentation', icon: Users, color: 'from-violet-500 to-purple-600' },
    { id: 'rfm', label: 'RFM Analysis', icon: Target, color: 'from-blue-500 to-cyan-600' },
    { id: 'churn', label: 'Churn Risk', icon: AlertTriangle, color: 'from-red-500 to-rose-600' },
    { id: 'ltv', label: 'Customer LTV', icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
    { id: 'affinity', label: 'Product Affinity', icon: ShoppingBag, color: 'from-amber-500 to-orange-600' },
    { id: 'forecast', label: 'Revenue Forecast', icon: TrendingUp, color: 'from-indigo-500 to-blue-600' },
    { id: 'cohort', label: 'Cohort Analysis', icon: BarChart3, color: 'from-pink-500 to-fuchsia-600' },
];

export default function Analytics() {
    const [activeTab, setActiveTab] = useState<TabId>('segmentation');
    const [loading, setLoading] = useState(false);
    const [clustering, setClustering] = useState(false);
    const [aiExplanation, setAiExplanation] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Data states
    const [segments, setSegments] = useState<any[]>([]);
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
    const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
    const [rfmData, setRfmData] = useState<any[]>([]);
    const [churnData, setChurnData] = useState<any[]>([]);
    const [ltvData, setLtvData] = useState<any[]>([]);
    const [affinityData, setAffinityData] = useState<any[]>([]);
    const [forecastData, setForecastData] = useState<any>({ daily_revenue: [], summary: {} });
    const [cohortData, setCohortData] = useState<any[]>([]);

    useEffect(() => { loadTabData(activeTab); }, [activeTab]);

    const loadTabData = async (tab: TabId) => {
        setLoading(true);
        try {
            switch (tab) {
                case 'segmentation': {
                    const res = await analytics.getSegments();
                    setSegments(res.data.segments || []);
                    break;
                }
                case 'rfm': {
                    const res = await analytics.getRfmAnalysis();
                    setRfmData(res.data.rfm_analysis || []);
                    break;
                }
                case 'churn': {
                    const res = await analytics.getChurnRisk();
                    setChurnData(res.data.at_risk_customers || []);
                    break;
                }
                case 'ltv': {
                    const res = await analytics.getCustomerLtv();
                    setLtvData(res.data.customer_ltv || []);
                    break;
                }
                case 'affinity': {
                    const res = await analytics.getProductAffinity();
                    setAffinityData(res.data.product_affinity || []);
                    break;
                }
                case 'forecast': {
                    const res = await analytics.getRevenueForecasting();
                    setForecastData(res.data || { daily_revenue: [], summary: {} });
                    break;
                }
                case 'cohort': {
                    const res = await analytics.getCohortAnalysis();
                    setCohortData(res.data.cohorts || []);
                    break;
                }
            }
        } catch (err: any) {
            console.error(`Error loading ${tab}:`, err);
        } finally {
            setLoading(false);
        }
    };

    const handleSegmentCustomers = async () => {
        setClustering(true);
        try {
            await analytics.segmentCustomers(4);
            await loadTabData('segmentation');
            toast.success('Segmentation completed!');
            await handleExplainSegments();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Segmentation failed');
        } finally {
            setClustering(false);
        }
    };

    const loadSegmentCustomers = async (segmentId: number) => {
        try {
            const res = await analytics.getSegmentCustomers(segmentId);
            setSegmentCustomers(res.data.customers || []);
            setSelectedSegment(segmentId);
        } catch { /* ignore */ }
    };

    const handleExplainSegments = async () => {
        setAiLoading(true);
        try {
            const res = await aiService.explainAnalytics();
            setAiExplanation(res.data?.explanation || 'No explanation generated.');
        } catch {
            setAiExplanation('❌ Unable to explain. Check ASI_ONE_API_KEY.');
        } finally {
            setAiLoading(false);
        }
    };

    const scatterData = segments.map((s, i) => ({
        segment: s.segment_name, value: Number(s.avg_value || 0),
        frequency: Number(s.avg_frequency || 0), color: COLORS[i % COLORS.length],
    }));

    const riskColor = (level: string) => level === 'Critical' ? 'bg-red-100 text-red-700' : level === 'High' ? 'bg-orange-100 text-orange-700' : level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
    const tierColor = (tier: string) => tier === 'Premium' ? 'bg-violet-100 text-violet-700' : tier === 'High' ? 'bg-blue-100 text-blue-700' : tier === 'Medium' ? 'bg-cyan-100 text-cyan-700' : 'bg-neutral-100 text-neutral-600';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-neutral-900">ML Analytics & Intelligence</h1>
                <p className="text-neutral-500 mt-1">7 machine-learning powered analytics modules</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                active ? `bg-gradient-to-r ${tab.color} text-white shadow-md` : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                            }`}>
                            <Icon size={16} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                        <Spinner size="lg" className="mx-auto mb-3" />
                        <p className="text-neutral-500 text-sm">Loading analytics...</p>
                    </div>
                </div>
            )}

            {/* ═══════════ SEGMENTATION ═══════════ */}
            {!loading && activeTab === 'segmentation' && (
                <div className="space-y-6">
                    <div className="flex justify-end gap-2">
                        {segments.length > 0 && (
                            <Button onClick={handleExplainSegments} disabled={aiLoading} size="md">
                                {aiLoading ? <><Loader2 size={16} className="animate-spin mr-2" />Thinking...</> : <><Brain size={16} className="mr-2" />AI Explain</>}
                            </Button>
                        )}
                        <Button onClick={handleSegmentCustomers} disabled={clustering} size="md">
                            {clustering ? <><Loader2 size={16} className="animate-spin mr-2" />Clustering...</> : <><Sparkles size={16} className="mr-2" />Run Segmentation</>}
                        </Button>
                    </div>

                    {segments.length === 0 ? (
                        <Card><CardContent className="p-12 text-center">
                            <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center mx-auto mb-4"><Sparkles size={32} className="text-primary-600" /></div>
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">No Segments Yet</h3>
                            <p className="text-neutral-500 mb-6">Run K-means clustering to analyze your customer base</p>
                            <Button onClick={handleSegmentCustomers} disabled={clustering}>{clustering ? 'Clustering...' : 'Run Segmentation Now'}</Button>
                        </CardContent></Card>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {segments.map((seg, i) => (
                                    <Card key={seg.segment_id} className="cursor-pointer hover:shadow-md transition-all"
                                        onClick={() => loadSegmentCustomers(seg.segment_id)}
                                        style={{ borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}>
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-4">
                                                <h3 className="font-semibold text-neutral-900">{seg.segment_name}</h3>
                                                <div className="p-2 rounded-lg" style={{ backgroundColor: `${COLORS[i % COLORS.length]}15` }}>
                                                    <Users size={18} style={{ color: COLORS[i % COLORS.length] }} />
                                                </div>
                                            </div>
                                            <p className="text-3xl font-bold text-neutral-900">{seg.customer_count}</p>
                                            <p className="text-xs text-neutral-500 mt-1">customers</p>
                                            <div className="pt-3 mt-3 border-t border-neutral-100 space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-neutral-500">Avg Value:</span>
                                                    <span className="font-semibold">₹{Number(seg.avg_value || 0).toFixed(0)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-neutral-500">Avg Frequency:</span>
                                                    <span className="font-semibold">{Number(seg.avg_frequency || 0).toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Card>
                                <CardHeader><CardTitle>Segment Visualization</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" dataKey="value" name="Value" label={{ value: 'Customer Value (₹)', position: 'bottom', offset: 10 }} stroke="#9ca3af" />
                                            <YAxis type="number" dataKey="frequency" name="Frequency" label={{ value: 'Purchase Frequency', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} stroke="#9ca3af" />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                            <Legend />
                                            {segments.map((seg, i) => (
                                                <Scatter key={seg.segment_id} name={seg.segment_name} data={scatterData.filter(d => d.segment === seg.segment_name)} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {selectedSegment !== null && segmentCustomers.length > 0 && (
                                <Card>
                                    <CardHeader><CardTitle>Customers in {segments.find(s => s.segment_id === selectedSegment)?.segment_name}</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead><tr className="border-b border-neutral-200">
                                                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Name</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Location</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-neutral-600">Phone</th>
                                                </tr></thead>
                                                <tbody>
                                                    {segmentCustomers.slice(0, 10).map(c => (
                                                        <tr key={c.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                                            <td className="px-4 py-3 text-neutral-900">{c.name}</td>
                                                            <td className="px-4 py-3 text-neutral-600">{c.location || '-'}</td>
                                                            <td className="px-4 py-3 text-neutral-600">{c.phone || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {aiExplanation && (
                                <Card className="border-primary-200 bg-gradient-to-r from-primary-50 to-primary-50">
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex-shrink-0"><Brain size={20} className="text-white" /></div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-neutral-900 mb-1">AI Segment Analysis</h3>
                                                <p className="text-xs text-neutral-500 mb-3">Powered by ASI:One</p>
                                                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{aiExplanation}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ═══════════ RFM ANALYSIS ═══════════ */}
            {!loading && activeTab === 'rfm' && (
                <div className="space-y-6">
                    {/* RFM Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(['VIP', 'Active', 'Medium', 'Inactive'] as const).map(seg => {
                            const count = rfmData.filter(r => r.segment === seg).length;
                            const total = rfmData.filter(r => r.segment === seg).reduce((s: number, r: any) => s + r.monetary, 0);
                            const segColors: Record<string, string> = { VIP: 'from-violet-500 to-purple-600', Active: 'from-emerald-500 to-teal-600', Medium: 'from-blue-500 to-cyan-600', Inactive: 'from-red-500 to-rose-600' };
                            return (
                                <Card key={seg}>
                                    <CardContent className="p-4">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${segColors[seg]} flex items-center justify-center mb-3`}>
                                            <Target size={18} className="text-white" />
                                        </div>
                                        <p className="text-xs text-neutral-500">{seg}</p>
                                        <p className="text-2xl font-bold text-neutral-900">{count}</p>
                                        <p className="text-xs text-neutral-400">₹{total.toLocaleString('en-IN')} total</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* RFM Scatter */}
                    <Card>
                        <CardHeader><CardTitle>RFM Distribution (Recency vs Monetary)</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" dataKey="recency_days" name="Recency (days)" label={{ value: 'Days Since Last Purchase', position: 'bottom', offset: 10 }} stroke="#9ca3af" />
                                    <YAxis type="number" dataKey="monetary" name="Monetary (₹)" label={{ value: 'Total Spent (₹)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} stroke="#9ca3af" />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Legend />
                                    {['VIP', 'Active', 'Medium', 'Inactive'].map((seg, i) => (
                                        <Scatter key={seg} name={seg} data={rfmData.filter(r => r.segment === seg)} fill={COLORS[i]} />
                                    ))}
                                </ScatterChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* RFM Table */}
                    <Card>
                        <CardHeader><CardTitle>Customer RFM Scores</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-neutral-200">
                                        <th className="px-3 py-3 text-left font-semibold text-neutral-600">Customer</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Recency</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Frequency</th>
                                        <th className="px-3 py-3 text-right font-semibold text-neutral-600">Monetary</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">RFM Score</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Segment</th>
                                    </tr></thead>
                                    <tbody>
                                        {rfmData.slice(0, 20).map((r: any) => (
                                            <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                                <td className="px-3 py-2.5 font-medium text-neutral-900">{r.name}</td>
                                                <td className="px-3 py-2.5 text-center text-neutral-600">{r.recency_days}d</td>
                                                <td className="px-3 py-2.5 text-center text-neutral-600">{r.frequency}</td>
                                                <td className="px-3 py-2.5 text-right font-medium">₹{r.monetary.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-2.5 text-center"><Badge className="bg-indigo-100 text-indigo-700 text-xs">{r.rfm_score}</Badge></td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <Badge className={`text-xs ${r.segment === 'VIP' ? 'bg-violet-100 text-violet-700' : r.segment === 'Active' ? 'bg-emerald-100 text-emerald-700' : r.segment === 'Inactive' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{r.segment}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════ CHURN RISK ═══════════ */}
            {!loading && activeTab === 'churn' && (
                <div className="space-y-6">
                    {/* Risk Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(['Critical', 'High', 'Medium', 'Low'] as const).map(level => {
                            const count = churnData.filter(c => c.risk_level === level).length;
                            const rColors: Record<string, string> = { Critical: 'from-red-500 to-rose-600', High: 'from-orange-500 to-amber-600', Medium: 'from-amber-400 to-yellow-500', Low: 'from-green-500 to-emerald-600' };
                            return (
                                <Card key={level}>
                                    <CardContent className="p-4">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rColors[level]} flex items-center justify-center mb-3`}>
                                            <AlertTriangle size={18} className="text-white" />
                                        </div>
                                        <p className="text-xs text-neutral-500">{level} Risk</p>
                                        <p className="text-2xl font-bold text-neutral-900">{count}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Churn Bar Chart */}
                    <Card>
                        <CardHeader><CardTitle>Churn Risk Distribution</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={churnData.slice(0, 15)} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                                    <YAxis label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Bar dataKey="churn_risk_score" name="Risk Score" radius={[4, 4, 0, 0]}>
                                        {churnData.slice(0, 15).map((entry: any, i: number) => (
                                            <Cell key={i} fill={entry.risk_level === 'Critical' ? '#ef4444' : entry.risk_level === 'High' ? '#f97316' : entry.risk_level === 'Medium' ? '#eab308' : '#22c55e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Churn Table */}
                    <Card>
                        <CardHeader><CardTitle>At-Risk Customers</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-neutral-200">
                                        <th className="px-3 py-3 text-left font-semibold text-neutral-600">Customer</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Days Inactive</th>
                                        <th className="px-3 py-3 text-right font-semibold text-neutral-600">Total Spent</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Risk</th>
                                        <th className="px-3 py-3 text-left font-semibold text-neutral-600">Action</th>
                                    </tr></thead>
                                    <tbody>
                                        {churnData.map((c: any) => (
                                            <tr key={c.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                                <td className="px-3 py-2.5 font-medium text-neutral-900">{c.name}</td>
                                                <td className="px-3 py-2.5 text-center text-neutral-600">{c.days_inactive}d</td>
                                                <td className="px-3 py-2.5 text-right">₹{c.total_spent.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-2.5 text-center"><Badge className={`text-xs ${riskColor(c.risk_level)}`}>{c.risk_level}</Badge></td>
                                                <td className="px-3 py-2.5 text-xs text-neutral-500">{c.recommendation}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════ CUSTOMER LTV ═══════════ */}
            {!loading && activeTab === 'ltv' && (
                <div className="space-y-6">
                    {/* LTV Tier Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(['Premium', 'High', 'Medium', 'Low'] as const).map(tier => {
                            const customers = ltvData.filter(l => l.value_tier === tier);
                            const totalLtv = customers.reduce((s: number, l: any) => s + l.predicted_3yr_ltv, 0);
                            return (
                                <Card key={tier}>
                                    <CardContent className="p-4">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier === 'Premium' ? 'from-violet-500 to-purple-600' : tier === 'High' ? 'from-blue-500 to-cyan-600' : tier === 'Medium' ? 'from-cyan-500 to-teal-600' : 'from-neutral-400 to-neutral-500'} flex items-center justify-center mb-3`}>
                                            <DollarSign size={18} className="text-white" />
                                        </div>
                                        <p className="text-xs text-neutral-500">{tier} Tier</p>
                                        <p className="text-2xl font-bold text-neutral-900">{customers.length}</p>
                                        <p className="text-xs text-neutral-400">₹{totalLtv.toLocaleString('en-IN')} predicted</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* LTV Bar Chart */}
                    <Card>
                        <CardHeader><CardTitle>Top 15 Customer LTV (3-Year Prediction)</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={ltvData.slice(0, 15)} margin={{ top: 10, right: 20, bottom: 40, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" height={60} />
                                    <YAxis label={{ value: 'LTV (₹)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Bar dataKey="current_value" name="Current Value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="predicted_3yr_ltv" name="Predicted 3yr LTV" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* LTV Table */}
                    <Card>
                        <CardHeader><CardTitle>Customer Lifetime Value Details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-neutral-200">
                                        <th className="px-3 py-3 text-left font-semibold text-neutral-600">Customer</th>
                                        <th className="px-3 py-3 text-right font-semibold text-neutral-600">Current</th>
                                        <th className="px-3 py-3 text-right font-semibold text-neutral-600">Predicted 3yr</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Purchases</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Tier</th>
                                    </tr></thead>
                                    <tbody>
                                        {ltvData.slice(0, 20).map((l: any) => (
                                            <tr key={l.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                                                <td className="px-3 py-2.5 font-medium text-neutral-900">{l.name}</td>
                                                <td className="px-3 py-2.5 text-right">₹{l.current_value.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-2.5 text-right font-semibold text-violet-600">₹{l.predicted_3yr_ltv.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-2.5 text-center">{l.total_purchases}</td>
                                                <td className="px-3 py-2.5 text-center"><Badge className={`text-xs ${tierColor(l.value_tier)}`}>{l.value_tier}</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════ PRODUCT AFFINITY ═══════════ */}
            {!loading && activeTab === 'affinity' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Product Purchase Frequency</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={affinityData.slice(0, 12)} margin={{ top: 10, right: 20, bottom: 40, left: 20 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="product" type="category" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Bar dataKey="times_purchased" name="Times Purchased" radius={[0, 4, 4, 0]}>
                                        {affinityData.slice(0, 12).map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Product Affinity Map</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {affinityData.map((p: any, i: number) => (
                                    <div key={i} className="p-4 rounded-xl border border-neutral-200 hover:border-primary-300 transition-all">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[i % COLORS.length]}15` }}>
                                                <ShoppingBag size={16} style={{ color: COLORS[i % COLORS.length] }} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-neutral-900">{(p.product || '').replace(/"/g, '')}</p>
                                                <p className="text-xs text-neutral-500">{p.times_purchased} purchases</p>
                                            </div>
                                        </div>
                                        {p.frequently_bought_with && (
                                            <div className="mt-2">
                                                <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Frequently bought with</p>
                                                <p className="text-xs text-neutral-600">{p.frequently_bought_with}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════ REVENUE FORECAST ═══════════ */}
            {!loading && activeTab === 'forecast' && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card><CardContent className="p-4">
                            <p className="text-xs text-neutral-500">Avg Daily Revenue</p>
                            <p className="text-2xl font-bold text-neutral-900">₹{(forecastData.summary?.avg_daily_revenue || 0).toLocaleString('en-IN')}</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-4">
                            <p className="text-xs text-neutral-500">30-Day Projection</p>
                            <p className="text-2xl font-bold text-blue-600">₹{(forecastData.summary?.projected_30d || 0).toLocaleString('en-IN')}</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-4">
                            <p className="text-xs text-neutral-500">90-Day Projection</p>
                            <p className="text-2xl font-bold text-violet-600">₹{(forecastData.summary?.projected_90d || 0).toLocaleString('en-IN')}</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-4">
                            <p className="text-xs text-neutral-500">Trend</p>
                            <p className={`text-2xl font-bold ${(forecastData.summary?.trend_percentage || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {(forecastData.summary?.trend_percentage || 0) >= 0 ? '↑' : '↓'} {Math.abs(forecastData.summary?.trend_percentage || 0)}%
                            </p>
                            <p className="text-xs text-neutral-400">{forecastData.summary?.trend_direction}</p>
                        </CardContent></Card>
                    </div>

                    {/* Revenue Chart with MA */}
                    <Card>
                        <CardHeader><CardTitle>Revenue Trend (90 Days) with 7-Day Moving Average</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={forecastData.daily_revenue || []} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                    <YAxis />
                                    <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#3b82f6" fill="#3b82f620" strokeWidth={1} />
                                    <Line type="monotone" dataKey="moving_avg_7d" name="7-Day MA" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════ COHORT ANALYSIS ═══════════ */}
            {!loading && activeTab === 'cohort' && (
                <div className="space-y-6">
                    {/* Cohort Bar Chart */}
                    <Card>
                        <CardHeader><CardTitle>Cohort Size & Retention by Month</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={cohortData} margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="cohort_month" tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" unit="%" />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="cohort_size" name="Cohort Size" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="active_last_30d" name="Active (30d)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="retention_rate" name="Retention %" stroke="#8b5cf6" strokeWidth={2.5} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Cohort Table */}
                    <Card>
                        <CardHeader><CardTitle>Monthly Cohort Details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-neutral-200">
                                        <th className="px-3 py-3 text-left font-semibold text-neutral-600">Cohort</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Size</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Purchases</th>
                                        <th className="px-3 py-3 text-right font-semibold text-neutral-600">Revenue</th>
                                        <th className="px-3 py-3 text-right font-semibold text-neutral-600">Rev/Customer</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Active (30d)</th>
                                        <th className="px-3 py-3 text-center font-semibold text-neutral-600">Retention</th>
                                    </tr></thead>
                                    <tbody>
                                        {cohortData.map((c: any) => (
                                            <tr key={c.cohort_month} className="border-b border-neutral-100 hover:bg-neutral-50">
                                                <td className="px-3 py-2.5 font-medium text-neutral-900">{c.cohort_month}</td>
                                                <td className="px-3 py-2.5 text-center">{c.cohort_size}</td>
                                                <td className="px-3 py-2.5 text-center">{c.total_purchases}</td>
                                                <td className="px-3 py-2.5 text-right">₹{c.total_revenue.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-2.5 text-right">₹{c.revenue_per_customer.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-2.5 text-center">{c.active_last_30d}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <Badge className={`text-xs ${c.retention_rate >= 50 ? 'bg-emerald-100 text-emerald-700' : c.retention_rate >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                        {c.retention_rate}%
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
