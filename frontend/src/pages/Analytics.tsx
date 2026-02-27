import { useEffect, useState } from 'react';
import { analytics } from '../services/api';
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
import { Sparkles, Users } from 'lucide-react';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function Analytics() {
    const [segments, setSegments] = useState<any[]>([]);
    const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
    const [segmentCustomers, setSegmentCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clustering, setClustering] = useState(false);

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

    // Use actual aggregate points from backend (one point per segment)
    const scatterData = segments.map((segment, index) => ({
        segment: segment.segment_name,
        value: Number(segment.avg_value || 0),
        frequency: Number(segment.avg_frequency || 0),
        color: COLORS[index % COLORS.length],
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        ML Analytics & Segmentation
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Customer insights powered by K-means clustering
                    </p>
                </div>
                <button
                    onClick={handleSegmentCustomers}
                    disabled={clustering}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                >
                    <Sparkles size={20} />
                    {clustering ? 'Clustering...' : 'Run Segmentation'}
                </button>
            </div>

            {segments.length === 0 && !loading ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Sparkles size={48} className="mx-auto text-purple-500 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                        No Segments Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Run customer segmentation to analyze your customer base using K-means
                        clustering
                    </p>
                    <button
                        onClick={handleSegmentCustomers}
                        disabled={clustering}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                    >
                        {clustering ? 'Clustering...' : 'Run Segmentation Now'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Segment Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {segments.map((segment, index) => (
                            <div
                                key={segment.segment_id}
                                className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => loadSegmentCustomers(segment.segment_id)}
                                style={{
                                    borderTop: `4px solid ${COLORS[index % COLORS.length]}`,
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-800">
                                        {segment.segment_name}
                                    </h3>
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                                    >
                                        <Users
                                            size={20}
                                            style={{ color: COLORS[index % COLORS.length] }}
                                        />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-gray-800">
                                    {segment.customer_count}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">customers</p>
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Avg Value:</span>
                                        <span className="font-semibold">
                                            ${(segment.avg_value || 0).toFixed(0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1">
                                        <span className="text-gray-600">Avg Frequency:</span>
                                        <span className="font-semibold">
                                            {(segment.avg_frequency || 0).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scatter Plot */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            Customer Segmentation Visualization
                        </h2>
                        <ResponsiveContainer width="100%" height={400}>
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    type="number"
                                    dataKey="value"
                                    name="Customer Value"
                                    label={{ value: 'Customer Value ($)', position: 'bottom' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="frequency"
                                    name="Purchase Frequency"
                                    label={{
                                        value: 'Purchase Frequency',
                                        angle: -90,
                                        position: 'left',
                                    }}
                                />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
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
                    </div>

                    {/* Selected Segment Customers */}
                    {selectedSegment !== null && segmentCustomers.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">
                                Customers in{' '}
                                {segments.find((s) => s.segment_id === selectedSegment)
                                    ?.segment_name}
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Name
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Company
                                            </th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                Email
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {segmentCustomers.slice(0, 10).map((customer) => (
                                            <tr key={customer.id}>
                                                <td className="px-4 py-2">
                                                    {customer.first_name} {customer.last_name}
                                                </td>
                                                <td className="px-4 py-2">{customer.company || '-'}</td>
                                                <td className="px-4 py-2">{customer.email || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
