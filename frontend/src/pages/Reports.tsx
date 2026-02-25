import React, { useState } from 'react';
import { reports } from '../services/api';
import { FileDown, Calendar } from 'lucide-react';

export default function Reports() {
    const [reportType, setReportType] = useState('sales');
    const [format, setFormat] = useState('excel');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [generating, setGenerating] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            let response;
            const data = { format, start_date: startDate, end_date: endDate };

            if (reportType === 'sales') {
                response = await reports.generateSales(data);
            } else if (reportType === 'customers') {
                response = await reports.generateCustomers(data);
            } else {
                response = await reports.generateSegments(data);
            }

            // Download file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
                'download',
                `${reportType}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error generating report:', error);
            alert('Error generating report');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Report Generation</h1>
                <p className="text-gray-600 mt-1">
                    Generate comprehensive reports in PDF or Excel format
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
                <div className="space-y-4">
                    {/* Report Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Report Type
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="sales">Sales Report</option>
                            <option value="customers">Customer Report</option>
                            <option value="segments">Segment Analysis</option>
                        </select>
                    </div>

                    {/* Format */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Format
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="excel"
                                    checked={format === 'excel'}
                                    onChange={(e) => setFormat(e.target.value)}
                                    className="mr-2"
                                />
                                Excel (.xlsx)
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    value="pdf"
                                    checked={format === 'pdf'}
                                    onChange={(e) => setFormat(e.target.value)}
                                    className="mr-2"
                                />
                                PDF
                            </label>
                        </div>
                    </div>

                    {/* Date Range */}
                    {reportType === 'sales' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <div className="relative">
                                    <Calendar
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <div className="relative">
                                    <Calendar
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                    >
                        <FileDown size={20} />
                        {generating ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {/* Report Templates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Sales Report</h3>
                    <p className="text-sm text-gray-600">
                        Comprehensive sales data with revenue breakdown, trends, and regional
                        analysis
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Customer Report</h3>
                    <p className="text-sm text-gray-600">
                        Customer database export with contact details, segments, and purchase
                        history
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="font-bold text-gray-800 mb-2">Segment Analysis</h3>
                    <p className="text-sm text-gray-600">
                        ML-powered customer segmentation insights with RFM metrics and cluster
                        characteristics
                    </p>
                </div>
            </div>
        </div>
    );
}
