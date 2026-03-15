import { useState } from 'react';
import { importData } from '../services/api';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';

export default function Import() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        await processFile(selectedFile);
    };

    const processFile = async (selectedFile: File) => {
        if (!selectedFile.name.match(/\.(csv|xlsx)$/i)) {
            toast.error('Please upload a CSV or Excel file');
            return;
        }

        setFile(selectedFile);
        setPreview(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('importType', 'customers');

        try {
            const response = await importData.upload(formData);
            setPreview(response.data);
            setFieldMapping(response.data.suggestedMapping || {});
            toast.success('File uploaded successfully');
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Error uploading file');
            setFile(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('importType', 'customers');
        formData.append('fieldMapping', JSON.stringify(fieldMapping));

        try {
            const response = await importData.execute(formData);
            setResult(response.data);
            toast.success('Import completed');
        } catch (error) {
            console.error('Error importing data:', error);
            toast.error('Error importing data');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-neutral-900">Import Customers</h1>
                <p className="text-neutral-500 mt-1">Upload CSV or Excel files to import customer data</p>
            </div>

            {/* Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload File</CardTitle>
                    <CardDescription>Supported formats: CSV, XLSX</CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-all cursor-pointer ${dragActive
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'
                            }`}
                    >
                        <input
                            type="file"
                            accept=".csv,.xlsx"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className={`mx-auto mb-4 ${dragActive ? 'text-primary-600' : 'text-neutral-400'}`} size={48} />
                            <p className={`mb-2 font-medium ${dragActive ? 'text-primary-900' : 'text-neutral-700'}`}>
                                {file ? file.name : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-sm text-neutral-500">CSV or XLSX files only</p>
                        </label>
                    </div>
                </CardContent>
            </Card>

            {/* Preview and Mapping */}
            {preview && !result && (
                <div className="space-y-6">
                    {/* Field Mapping */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Field Mapping</CardTitle>
                            <CardDescription>Map your file columns to customer fields</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.keys(fieldMapping).map((field) => (
                                    <div key={field}>
                                        <Label htmlFor={`map-${field}`} className="mb-2 block">
                                            {field.replace(/_/g, ' ').toUpperCase()}
                                        </Label>
                                        <select
                                            id={`map-${field}`}
                                            value={fieldMapping[field] || ''}
                                            onChange={(e) =>
                                                setFieldMapping({
                                                    ...fieldMapping,
                                                    [field]: e.target.value,
                                                })
                                            }
                                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                        >
                                            <option value="">-- Skip --</option>
                                            {preview.fields?.map((f: string) => (
                                                <option key={f} value={f}>
                                                    {f}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Preview</CardTitle>
                            <CardDescription>
                                Total rows: {preview.totalRows} | Showing first 10 rows
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-neutral-50 border-b border-neutral-200">
                                        <tr>
                                            {preview.fields?.map((field: string) => (
                                                <th
                                                    key={field}
                                                    className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider"
                                                >
                                                    {field}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200">
                                        {preview.preview?.map((row: any, index: number) => (
                                            <tr key={index} className="hover:bg-neutral-50 transition-colors">
                                                {preview.fields?.map((field: string) => (
                                                    <td key={field} className="px-4 py-3 text-neutral-600">
                                                        {row[field] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Import Button */}
                    <Button
                        onClick={handleImport}
                        disabled={importing}
                        variant="default"
                        size="lg"
                        fullWidth
                        className="gap-2"
                    >
                        {importing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={20} />
                                Import {preview.totalRows} Records
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Import Result */}
            {result && (
                <Card
                    className={`border-2 ${result.errors?.length > 0 ? 'border-warning-200 bg-warning-50' : 'border-success-200 bg-success-50'
                        }`}
                >
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <div>
                                {result.errors?.length > 0 ? (
                                    <AlertCircle className="text-warning-600" size={32} />
                                ) : (
                                    <CheckCircle className="text-success-600" size={32} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-neutral-900 mb-2">Import Complete</h2>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <Badge variant="success">
                                            {result.imported} Imported
                                        </Badge>
                                        <Badge variant="secondary">
                                            {result.total} Total
                                        </Badge>
                                        {result.skipped > 0 && (
                                            <Badge variant="warning">
                                                {result.skipped} Skipped
                                            </Badge>
                                        )}
                                    </div>

                                    {result.skipped > 0 && (
                                        <p className="text-sm text-neutral-600 mt-3">
                                            {result.skipped} duplicate(s) were skipped (phone or email already exists)
                                        </p>
                                    )}

                                    {result.errors?.length > 0 && (
                                        <div className="mt-4 p-4 bg-warning-100 border border-warning-300 rounded-lg">
                                            <p className="font-semibold text-warning-900 mb-2">
                                                {result.errors.length} errors occurred:
                                            </p>
                                            <ul className="text-sm text-warning-800 space-y-1">
                                                {result.errors.slice(0, 5).map((err: any, index: number) => (
                                                    <li key={index}>
                                                        • Row {err.row}: {err.error}
                                                    </li>
                                                ))}
                                            </ul>
                                            {result.errors.length > 5 && (
                                                <p className="text-xs text-warning-700 mt-2">
                                                    ... and {result.errors.length - 5} more errors
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={() => {
                                        setFile(null);
                                        setPreview(null);
                                        setResult(null);
                                    }}
                                    variant="outline"
                                    className="mt-4"
                                >
                                    Import Another File
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
