import { useState } from 'react';
import { reports } from '../services/api';
import toast from 'react-hot-toast';
import { FileDown, Calendar } from 'lucide-react';

type AiReportItem = {
    section: string;
    title: string;
    details: string;
};

export default function Reports() {
    const [reportType, setReportType] = useState('sales');
    const [format, setFormat] = useState('excel');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [generating, setGenerating] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [monthlyDownloading, setMonthlyDownloading] = useState(false);
    const [monthlyFormat, setMonthlyFormat] = useState<'pdf' | 'excel'>('pdf');
    const [aiReport, setAiReport] = useState<AiReportItem[]>([]);
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
            const response = await reports.getMonthlyAiReport(aiMonth, aiYear);
            const data = response?.data?.ai_report;
            const errorMessage = response?.data?.ai_report_error;

            if (Array.isArray(data) && data.length > 0) {
                setAiReport(data);
                toast.success('AI monthly report generated');
            } else {
                setAiReport([]);
                toast.error(errorMessage || 'AI report is unavailable. Check GROQ_API_KEY and data.');
            }
        } catch (error) {
            console.error('Error generating AI monthly report:', error);
            toast.error('Error generating AI monthly report');
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
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                        {aiGenerating ? 'Generating AI Report...' : 'Generate AI Monthly Report'}
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

                {aiReport.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {aiReport.map((item, index) => (
                            <div key={`${item.section}-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold mb-1">{item.section}</p>
                                <h3 className="text-base font-semibold text-gray-800 mb-1">{item.title}</h3>
                                <p className="text-sm text-gray-600">{item.details}</p>
                            </div>
                        ))}
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
