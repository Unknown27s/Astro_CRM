import { useEffect, useState } from 'react';
import { analytics, aiService } from '../services/api';
import toast from 'react-hot-toast';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Sparkles, Users, Brain, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Avatar';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function Analytics() {
    const [segments, setSegments] = useState<any[]>([]);
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
    const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clustering, setClustering] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string>('');
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        loadSegments();
    }, []);

    const loadSegments = async () => {
        try {
            const response = await analytics.getSegments();
            setSegments(response.data.segments);
        } catch (error) {
            console.error('Error loading segments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSegmentCustomers = async () => {
        setClustering(true);
        try {
            await analytics.segmentCustomers(4);
            await loadSegments();
            toast.success('Customer segmentation completed successfully!');
            // Auto-explain after segmentation
            await handleExplainSegments();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error performing segmentation');
        } finally {
            setClustering(false);
        }
    };

    const loadSegmentCustomers = async (segmentId: number) => {
        try {
            const response = await analytics.getSegmentCustomers(segmentId);
            setSegmentCustomers(response.data.customers);
            setSelectedSegment(segmentId);
        } catch (error) {
            console.error('Error loading segment customers:', error);
        }
    };

    const handleExplainSegments = async () => {
        setAiLoading(true);
        try {
            const res = await aiService.explainAnalytics();
            setAiExplanation(res.data?.explanation || 'No explanation generated.');
        } catch {
            setAiExplanation('❌ Unable to explain. Check your ASI_ONE_API_KEY.');
        } finally {
            setAiLoading(false);
        }
    };

    // Use actual aggregate points from backend (one point per segment)
    const scatterData = segments.map((segment, index) => ({
        segment: segment.segment_name,
        value: Number(segment.avg_value || 0),
        frequency: Number(segment.avg_frequency || 0),
        color: COLORS[index % COLORS.length],
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Spinner size="lg" className="mx-auto mb-4" />
                    <p className="text-neutral-500">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">ML Analytics & Segmentation</h1>
                    <p className="text-neutral-500 mt-1">Customer insights powered by K-means clustering</p>
                </div>
                <div className="flex items-center gap-2">
                    {segments.length > 0 && (
                        <Button
                            onClick={handleExplainSegments}
                            disabled={aiLoading}
                            size="md"
                        >
                            {aiLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Thinking...
                                </>
                            ) : (
                                <>
                                    <Brain size={16} className="mr-2" />
                                    AI Explain
                                </>
                            )}
                        </Button>
                    )}
                    <Button
                        onClick={handleSegmentCustomers}
                        disabled={clustering}
                        size="md"
                    >
                        {clustering ? (
                            <>
                                <Loader2 size={16} className="animate-spin mr-2" />
                                Clustering...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} className="mr-2" />
                                Run Segmentation
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {segments.length === 0 ? (
                <Card>
                    <CardContent className="p-12">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center mx-auto mb-4">
                                <Sparkles size={32} className="text-primary-600" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">No Segments Yet</h3>
                            <p className="text-neutral-500 mb-6">
                                Run customer segmentation to analyze your customer base using K-means clustering
                            </p>
                            <Button
                                onClick={handleSegmentCustomers}
                                disabled={clustering}
                                size="md"
                            >
                                {clustering ? 'Clustering...' : 'Run Segmentation Now'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Segment Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {segments.map((segment, index) => (
                            <Card
                                key={segment.segment_id}
                                className="cursor-pointer hover:shadow-md transition-all"
                                onClick={() => loadSegmentCustomers(segment.segment_id)}
                                style={{
                                    borderLeft: `4px solid ${COLORS[index % COLORS.length]}`,
                                }}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="font-semibold text-neutral-900">{segment.segment_name}</h3>
                                        <div
                                            className="p-2 rounded-lg"
                                            style={{ backgroundColor: `${COLORS[index % COLORS.length]}15` }}
                                        >
                                            <Users
                                                size={18}
                                                style={{ color: COLORS[index % COLORS.length] }}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-3xl font-bold text-neutral-900">
                                                {segment.customer_count}
                                            </p>
                                            <p className="text-xs text-neutral-500 mt-1">customers</p>
                                        </div>
                                        <div className="pt-3 border-t border-neutral-100 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-500">Avg Value:</span>
                                                <span className="font-semibold text-neutral-900">
                                                    ₹{Number(segment.avg_value || 0).toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-500">Avg Frequency:</span>
                                                <span className="font-semibold text-neutral-900">
                                                    {Number(segment.avg_frequency || 0).toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Scatter Plot */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Segmentation Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        type="number"
                                        dataKey="value"
                                        name="Customer Value"
                                        label={{ value: 'Customer Value ($)', position: 'bottom', offset: 10 }}
                                        stroke="#9ca3af"
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="frequency"
                                        name="Purchase Frequency"
                                        label={{
                                            value: 'Purchase Frequency',
                                            angle: -90,
                                            position: 'insideLeft',
                                            style: { textAnchor: 'middle' },
                                        }}
                                        stroke="#9ca3af"
                                    />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Legend />
                                    {segments.map((segment, index) => (
                                        <Scatter
                                            key={segment.segment_id}
                                            name={segment.segment_name}
                                            data={scatterData.filter(
                                                (d) => d.segment === segment.segment_name
                                            )}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </ScatterChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Selected Segment Customers */}
                    {selectedSegment !== null && segmentCustomers.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Customers in{' '}
                                    {segments.find((s) => s.segment_id === selectedSegment)?.segment_name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-200">
                                                <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                                                    Name
                                                </th>
                                                <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                                                    Location
                                                </th>
                                                <th className="px-4 py-3 text-left font-semibold text-neutral-600">
                                                    Phone
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {segmentCustomers.slice(0, 10).map((customer) => (
                                                <tr
                                                    key={customer.id}
                                                    className="border-b border-neutral-100 hover:bg-neutral-50"
                                                >
                                                    <td className="px-4 py-3 text-neutral-900">
                                                        {customer.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-neutral-600">
                                                        {customer.location || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-neutral-600">
                                                        {customer.phone || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* AI Explanation Panel */}
                    {aiExplanation && (
                        <Card className="border-primary-200 bg-gradient-to-r from-primary-50 to-primary-50">
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex-shrink-0">
                                        <Brain size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-neutral-900 mb-1">
                                            AI Segment Analysis
                                        </h3>
                                        <p className="text-xs text-neutral-500 mb-3">Powered by ASI:One</p>
                                        <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                                            {aiExplanation}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
