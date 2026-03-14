import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Calendar, Brain, Sparkles } from 'lucide-react';
import { reports, aiService } from '../services/api';

export default function Reports() {
    const [reportType, setReportType] = useState('sales');
    const [format, setFormat] = useState('excel');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [generating, setGenerating] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [monthlyDownloading, setMonthlyDownloading] = useState(false);
    const [monthlyFormat, setMonthlyFormat] = useState<'pdf' | 'excel'>('pdf');
    const [aiSummary, setAiSummary] = useState<string>('');
    const [aiMonth, setAiMonth] = useState<number>(new Date().getMonth() + 1);
    const [aiYear, setAiYear] = useState<number>(new Date().getFullYear());

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
            toast.error('Error generating report');
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerateAiReport = async () => {
        setAiGenerating(true);
        try {
            const res = await aiService.reportSummary({ month: aiMonth, year: aiYear });
            const summary = res?.data?.summary;
            if (summary) {
                setAiSummary(summary);
                toast.success('AI report generated!');
            } else {
                setAiSummary('');
                toast.error('No data found for this period.');
            }
        } catch (error) {
            console.error('Error generating AI report:', error);
            toast.error('AI report failed. Check your ASI_ONE_API_KEY.');
        } finally {
            setAiGenerating(false);
        }
    };

    const handleDownloadMonthlyBusinessReport = async () => {
        setMonthlyDownloading(true);
        try {
            const response = await reports.downloadMonthlyBusinessReport(aiMonth, aiYear, monthlyFormat);
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const monthText = String(aiMonth).padStart(2, '0');

            link.href = url;
            link.setAttribute(
                'download',
                `monthly-business-report-${aiYear}-${monthText}.${monthlyFormat === 'pdf' ? 'pdf' : 'xlsx'}`
            );

            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Monthly Business Report downloaded');
        } catch (error) {
            console.error('Error downloading Monthly Business Report:', error);
            toast.error('Failed to download Monthly Business Report');
        } finally {
            setMonthlyDownloading(false);
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

            <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">AI Monthly Report</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        One AI call generates an executive summary from monthly CRM data.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                        <input
                            type="number"
                            min={1}
                            max={12}
                            value={aiMonth}
                            onChange={(e) => setAiMonth(Number(e.target.value) || 1)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                        <input
                            type="number"
                            min={2000}
                            max={2100}
                            value={aiYear}
                            onChange={(e) => setAiYear(Number(e.target.value) || new Date().getFullYear())}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={handleGenerateAiReport}
                        disabled={aiGenerating}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                    >
                        {aiGenerating ? (
                            <><Sparkles size={16} className="animate-spin" /> Analyzing with ASI:One...</>
                        ) : (
                            <><Brain size={16} /> Generate AI Business Summary</>
                        )}
                    </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center text-sm text-gray-700">
                            <input
                                type="radio"
                                name="monthly-format"
                                checked={monthlyFormat === 'pdf'}
                                onChange={() => setMonthlyFormat('pdf')}
                                className="mr-2"
                            />
                            PDF
                        </label>
                        <label className="flex items-center text-sm text-gray-700">
                            <input
                                type="radio"
                                name="monthly-format"
                                checked={monthlyFormat === 'excel'}
                                onChange={() => setMonthlyFormat('excel')}
                                className="mr-2"
                            />
                            Excel
                        </label>
                    </div>
                    <button
                        onClick={handleDownloadMonthlyBusinessReport}
                        disabled={monthlyDownloading}
                        className="md:ml-auto px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                        {monthlyDownloading ? 'Downloading...' : 'Download Monthly Business Report'}
                    </button>
                </div>

                {aiSummary && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Brain size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">AI Business Summary</h3>
                                <p className="text-[10px] text-gray-500">Powered by ASI:One</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
                    </div>
                )}
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
