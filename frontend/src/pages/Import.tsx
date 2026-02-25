import React, { useState } from 'react';
import { importData } from '../services/api';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

export default function Import() {
    const [file, setFile] = useState<File | null>(null);
    const [importType, setImportType] = useState('contacts');
    const [preview, setPreview] = useState<any>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setPreview(null);
        setResult(null);

        // Upload and preview
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('importType', importType);

        try {
            const response = await importData.upload(formData);
            setPreview(response.data);
            setFieldMapping(response.data.suggestedMapping);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('importType', importType);
        formData.append('fieldMapping', JSON.stringify(fieldMapping));

        try {
            const response = await importData.execute(formData);
            setResult(response.data);
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Error importing data');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Import Data</h1>
                <p className="text-gray-600 mt-1">
                    Upload CSV or Excel files to import contacts and sales data
                </p>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="space-y-4">
                    {/* Import Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Import Type
                        </label>
                        <select
                            value={importType}
                            onChange={(e) => {
                                setImportType(e.target.value);
                                setFile(null);
                                setPreview(null);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="contacts">Contacts</option>
                            <option value="sales">Sales Data</option>
                        </select>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select File
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <Upload className="mx-auto text-gray-400 mb-3" size={48} />
                                <p className="text-gray-600 mb-1">
                                    {file ? file.name : 'Click to upload or drag and drop'}
                                </p>
                                <p className="text-sm text-gray-500">CSV or Excel files only</p>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview and Mapping */}
            {preview && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Preview & Field Mapping
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Total rows: {preview.totalRows} | Showing first 10 rows
                    </p>

                    {/* Field Mapping */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-800 mb-3">Field Mapping</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.keys(fieldMapping).map((field) => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {field.replace(/_/g, ' ').toUpperCase()}
                                    </label>
                                    <select
                                        value={fieldMapping[field] || ''}
                                        onChange={(e) =>
                                            setFieldMapping({ ...fieldMapping, [field]: e.target.value })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="">-- Skip --</option>
                                        {preview.fields.map((f: string) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview Table */}
                    <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    {preview.fields.map((field: string) => (
                                        <th
                                            key={field}
                                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                                        >
                                            {field}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {preview.preview.map((row: any, index: number) => (
                                    <tr key={index}>
                                        {preview.fields.map((field: string) => (
                                            <td key={field} className="px-4 py-2 text-gray-600">
                                                {row[field] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Import Button */}
                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                    >
                        <FileSpreadsheet size={20} />
                        {importing ? 'Importing...' : 'Import Data'}
                    </button>
                </div>
            )}

            {/* Import Result */}
            {result && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-4">
                        {result.errors?.length > 0 ? (
                            <AlertCircle className="text-yellow-500" size={32} />
                        ) : (
                            <CheckCircle className="text-green-500" size={32} />
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Import Complete</h2>
                            <p className="text-gray-600">
                                Successfully imported {result.imported} of {result.total} records
                            </p>
                        </div>
                    </div>

                    {result.errors?.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="font-semibold text-yellow-800 mb-2">
                                {result.errors.length} errors occurred:
                            </p>
                            <ul className="text-sm text-yellow-700 space-y-1">
                                {result.errors.slice(0, 5).map((err: any, index: number) => (
                                    <li key={index}>
                                        Row {err.row}: {err.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
