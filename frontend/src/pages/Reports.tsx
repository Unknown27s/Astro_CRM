import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Calendar, Brain, Sparkles, Download, Loader2 } from 'lucide-react';
import { reports, aiService } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

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
        if (!startDate || !endDate) {
            toast.error('Please select both start and end dates');
            return;
        }

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

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${reportType}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Report downloaded');
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
            toast.error('AI report failed. Check your API key.');
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
            link.setAttribute('download', `monthly-business-report-${aiYear}-${monthText}.${monthlyFormat === 'pdf' ? 'pdf' : 'xlsx'}`);
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
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-neutral-900">Report Generation</h1>
                <p className="text-neutral-500 mt-1">Generate comprehensive reports in PDF or Excel format</p>
            </div>

            {/* Basic Report Generator */}
            <Card>
                <CardHeader>
                    <CardTitle>Generate Report</CardTitle>
                    <CardDescription>Select report type and format</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="reportType">Report Type</Label>
                            <select
                                id="reportType"
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full mt-2 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            >
                                <option value="sales">Sales Report</option>
                                <option value="customers">Customer Report</option>
                                <option value="segments">Segment Analysis</option>
                            </select>
                        </div>

                        <div>
                            <Label>Format</Label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="excel"
                                        checked={format === 'excel'}
                                        onChange={(e) => setFormat(e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Excel</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="pdf"
                                        checked={format === 'pdf'}
                                        onChange={(e) => setFormat(e.target.value)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">PDF</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {reportType === 'sales' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="startDate">Start Date</Label>
                                <div className="relative mt-2">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="endDate">End Date</Label>
                                <div className="relative mt-2">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleGenerate}
                        disabled={generating}
                        size="lg"
                        className="gap-2 w-full sm:w-auto"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileDown size={20} />
                                Generate Report
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* AI Reports */}
            <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Brain className="text-primary-600" size={24} />
                        <div>
                            <CardTitle>AI Monthly Report</CardTitle>
                            <CardDescription>AI-powered executive summary</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div>
                            <Label htmlFor="aiMonth">Month</Label>
                            <Input
                                id="aiMonth"
                                type="number"
                                min={1}
                                max={12}
                                value={aiMonth}
                                onChange={(e) => setAiMonth(Number(e.target.value) || 1)}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="aiYear">Year</Label>
                            <Input
                                id="aiYear"
                                type="number"
                                min={2000}
                                max={2100}
                                value={aiYear}
                                onChange={(e) =>
                                    setAiYear(Number(e.target.value) || new Date().getFullYear())
                                }
                                className="mt-2"
                            />
                        </div>
                        <Button
                            onClick={handleGenerateAiReport}
                            disabled={aiGenerating}
                            variant="default"
                            className="gap-2"
                        >
                            {aiGenerating ? (
                                <>
                                    <Sparkles size={18} className="animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Brain size={18} />
                                    Generate
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="flex gap-4">
                            <label className="flex items-center text-sm">
                                <input
                                    type="radio"
                                    name="monthly-format"
                                    checked={monthlyFormat === 'pdf'}
                                    onChange={() => setMonthlyFormat('pdf')}
                                    className="mr-2"
                                />
                                PDF
                            </label>
                            <label className="flex items-center text-sm">
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
                        <Button
                            onClick={handleDownloadMonthlyBusinessReport}
                            disabled={monthlyDownloading}
                            variant="secondary"
                            size="sm"
                            className="gap-2 sm:ml-auto"
                        >
                            {monthlyDownloading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Download
                                </>
                            )}
                        </Button>
                    </div>

                    {aiSummary && (
                        <div className="bg-white rounded-lg p-4 border border-primary-300 mt-4">
                            <p className="text-sm text-neutral-700 leading-relaxed">{aiSummary}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Templates Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        title: 'Sales Report',
                        description: 'Comprehensive sales data with revenue breakdown, trends, and regional analysis',
                    },
                    {
                        title: 'Customer Report',
                        description: 'Customer database export with contact details, segments, and purchase history',
                    },
                    {
                        title: 'Segment Analysis',
                        description: 'ML-powered customer segmentation insights with RFM metrics and characteristics',
                    },
                ].map((template, idx) => (
                    <Card key={idx}>
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-neutral-900 mb-2">{template.title}</h3>
                            <p className="text-sm text-neutral-600">{template.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
