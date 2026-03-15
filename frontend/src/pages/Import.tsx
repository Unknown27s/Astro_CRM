import { useState } from 'react';
import { importData } from '../services/api';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, LinkIcon, Plus, Package, Users, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function Import() {
    const [activeTab, setActiveTab] = useState<'file' | 'sheets' | 'format' | 'stock'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [stockFile, setStockFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any>(null);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragActive, setDragActive] = useState(false);
    const [stockDragActive, setStockDragActive] = useState(false);
    const [stockImporting, setStockImporting] = useState(false);
    const [stockResult, setStockResult] = useState<any>(null);

    // Google Sheets state
    const [sheetId, setSheetId] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [syncType, setSyncType] = useState<'customers' | 'products'>('customers');
    const [syncInterval, setSyncInterval] = useState(60);
    const [setupLoading, setSetupLoading] = useState(false);

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

    const handleImportProducts = async () => {
        if (!stockFile) return;

        setStockImporting(true);
        const formData = new FormData();
        formData.append('file', stockFile);
        formData.append('importType', 'products');

        // Default field mapping for products
        const productMapping = {
            name: 'name',
            sku: 'sku',
            barcode: 'barcode',
            category: 'category',
            description: 'description',
            selling_price: 'selling_price',
            cost_price: 'cost_price',
            current_stock: 'current_stock',
            min_stock_level: 'min_stock_level',
            max_stock_level: 'max_stock_level',
            supplier: 'supplier'
        };
        formData.append('fieldMapping', JSON.stringify(productMapping));

        try {
            const response = await importData.execute(formData);
            setStockResult(response.data);
            toast.success('Products imported successfully!');
            setStockFile(null);
        } catch (error: any) {
            console.error('Error importing products:', error);
            toast.error(error.response?.data?.error || 'Error importing products');
        } finally {
            setStockImporting(false);
        }
    };

    const handleSetupGoogleSheets = async () => {
        if (!sheetId.trim() || !sheetName.trim()) {
            toast.error('Please enter Sheet ID and Sheet Name');
            return;
        }

        setSetupLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/google-sheets/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    sheet_id: sheetId,
                    sheet_name: sheetName,
                    sync_type: syncType,
                    sync_interval: syncInterval,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to setup sync');
            }

            const data = await response.json();
            toast.success(data.message || 'Google Sheets sync configured successfully!');
            setSheetId('');
            setSheetName('');
        } catch (error: any) {
            toast.error(error.message || 'Error setting up Google Sheets');
        } finally {
            setSetupLoading(false);
        }
    };

    const processStockFile = async (selectedFile: File) => {
        if (!selectedFile.name.match(/\.(csv|xlsx)$/i)) {
            toast.error('Please upload a CSV or Excel file');
            return;
        }
        setStockFile(selectedFile);
        toast.success('Stock file ready to import');
    };

    const handleStockDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setStockDragActive(true);
        } else if (e.type === 'dragleave') {
            setStockDragActive(false);
        }
    };

    const handleStockDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setStockDragActive(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            processStockFile(droppedFile);
        }
    };

    const downloadSampleFile = (type: 'customers' | 'products' | 'stock') => {
        let csv = '';
        let filename = '';

        if (type === 'customers') {
            csv = 'name,phone,email,location\nRajesh Kumar,9876543210,rajesh@example.com,Mumbai\nPriya Singh,9876543211,priya@example.com,Delhi\nAhmed Khan,9876543212,ahmed@example.com,Bangalore';
            filename = 'customers_sample.csv';
        } else if (type === 'products') {
            csv = 'name,sku,barcode,category,selling_price,cost_price,current_stock,min_stock_level,max_stock_level,supplier\nFormal Shirt,SKU001,8901234000001,Clothing,599,350,50,10,100,Supplier A\nCasual Pants,SKU002,8901234000002,Clothing,799,450,30,5,80,Supplier B\nSneakers,SKU003,8901234000003,Footwear,2499,1200,20,5,50,Supplier C';
            filename = 'products_sample.csv';
        } else if (type === 'stock') {
            csv = 'barcode,product_name,quantity_change,reason\n1234567890,Formal Shirt,10,stock_in\n1234567891,Casual Pants,-2,sale\n1234567892,Sneakers,5,stock_in';
            filename = 'stock_sample.csv';
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-neutral-900">Import Data</h1>
                <p className="text-neutral-500 mt-1">Upload files or connect to Google Sheets for automatic syncing</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-neutral-200 overflow-x-auto">
                <button
                    onClick={() => {
                        setActiveTab('file');
                        setResult(null);
                    }}
                    className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'file'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                    <Upload size={18} className="inline mr-2" />
                    Upload File
                </button>
                <button
                    onClick={() => {
                        setActiveTab('stock');
                        setResult(null);
                    }}
                    className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'stock'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                    <Package size={18} className="inline mr-2" />
                    Product Import
                </button>
                <button
                    onClick={() => {
                        setActiveTab('sheets');
                        setResult(null);
                    }}
                    className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'sheets'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                    <LinkIcon size={18} className="inline mr-2" />
                    Google Sheets
                </button>
                <button
                    onClick={() => {
                        setActiveTab('format');
                        setResult(null);
                    }}
                    className={`px-4 py-3 font-medium transition-all border-b-2 whitespace-nowrap ${
                        activeTab === 'format'
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                    <FileSpreadsheet size={18} className="inline mr-2" />
                    Format Templates
                </button>
            </div>

            {/* File Upload Tab */}
            {activeTab === 'file' && (
                <>
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
                </>
            )}

            {/* Google Sheets Tab */}
            {activeTab === 'sheets' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LinkIcon size={24} />
                                Connect Google Sheets
                            </CardTitle>
                            <CardDescription>
                                Setup automatic syncing from your Google Sheets. Data will sync every 60 seconds.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                                <p className="text-sm text-primary-900">
                                    <strong>📋 How it works:</strong>
                                </p>
                                <ul className="text-sm text-primary-800 mt-2 space-y-1 ml-4 list-disc">
                                    <li>Get your Google Sheet ID from the URL (format: /spreadsheets/d/<strong>SHEET_ID</strong>/edit)</li>
                                    <li>Enter your sheet name (e.g., "Customers", "Products")</li>
                                    <li>Select what to sync (Customers or Products)</li>
                                    <li>Click "Setup Sync" - data will auto-sync every 60 seconds!</li>
                                </ul>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="sheet-id">Google Sheet ID *</Label>
                                    <Input
                                        id="sheet-id"
                                        placeholder="1a2b3c4d5e6f7g8h9i0j"
                                        value={sheetId}
                                        onChange={(e) => setSheetId(e.target.value)}
                                        className="mt-2"
                                    />
                                    <p className="text-xs text-neutral-500 mt-1">From the URL of your shared sheet</p>
                                </div>
                                <div>
                                    <Label htmlFor="sheet-name">Sheet Name *</Label>
                                    <Input
                                        id="sheet-name"
                                        placeholder="e.g., Customers"
                                        value={sheetName}
                                        onChange={(e) => setSheetName(e.target.value)}
                                        className="mt-2"
                                    />
                                    <p className="text-xs text-neutral-500 mt-1">Tab name in your sheet</p>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="sync-type">What to Sync *</Label>
                                <select
                                    id="sync-type"
                                    value={syncType}
                                    onChange={(e) => setSyncType(e.target.value as 'customers' | 'products')}
                                    className="w-full px-4 py-2 mt-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    <option value="customers">Customers (sync customer names, phones, emails)</option>
                                    <option value="products">Products (sync product catalog and prices)</option>
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="sync-interval">Sync Interval (seconds)</Label>
                                <Input
                                    id="sync-interval"
                                    type="number"
                                    min="30"
                                    max="3600"
                                    value={syncInterval}
                                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                                    className="mt-2"
                                />
                                <p className="text-xs text-neutral-500 mt-1">How often to check for updates (minimum 30s)</p>
                            </div>

                            <Button
                                onClick={handleSetupGoogleSheets}
                                disabled={setupLoading}
                                variant="default"
                                size="lg"
                                fullWidth
                                className="gap-2"
                            >
                                {setupLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Setting up...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Setup Google Sheets Sync
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Stock Import Tab */}
            {activeTab === 'stock' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package size={24} />
                                Import Products & Update Stock
                            </CardTitle>
                            <CardDescription>
                                Upload products (create new or update existing) and manage stock levels. Existing products are matched by SKU or Barcode.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                                <p className="text-sm text-primary-900">
                                    <strong>📦 How Product Import Works:</strong>
                                </p>
                                <ul className="text-sm text-primary-800 mt-2 space-y-1 ml-4 list-disc">
                                    <li><strong>Match by SKU or Barcode:</strong> If product exists with same SKU/barcode, it's updated with new stock levels</li>
                                    <li><strong>Create New:</strong> If product doesn't exist, it's created with the provided data</li>
                                    <li><strong>Auto-Reflects:</strong> Imported products immediately appear in Stock Management page</li>
                                    <li><strong>Bulk Updates:</strong> Update 100s of products at once from Excel/CSV</li>
                                    <li><strong>Columns needed:</strong> name, sku, barcode (at least one), category, current_stock, selling_price, cost_price</li>
                                </ul>
                            </div>

                            <div
                                onDragEnter={handleStockDrag}
                                onDragLeave={handleStockDrag}
                                onDragOver={handleStockDrag}
                                onDrop={handleStockDrop}
                                className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-all cursor-pointer ${
                                    stockDragActive
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'
                                }`}
                            >
                                <input
                                    type="file"
                                    accept=".csv,.xlsx"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) processStockFile(file);
                                    }}
                                    className="hidden"
                                    id="stock-upload"
                                />
                                <label htmlFor="stock-upload" className="cursor-pointer">
                                    <Upload className={`mx-auto mb-4 ${stockDragActive ? 'text-primary-600' : 'text-neutral-400'}`} size={48} />
                                    <p className={`mb-2 font-medium ${stockDragActive ? 'text-primary-900' : 'text-neutral-700'}`}>
                                        {stockFile ? stockFile.name : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-sm text-neutral-500">CSV or XLSX files only</p>
                                </label>
                            </div>

                            {stockFile && (
                                <Button
                                    onClick={handleImportProducts}
                                    disabled={stockImporting}
                                    variant="default"
                                    size="lg"
                                    fullWidth
                                    className="gap-2"
                                >
                                    {stockImporting ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Importing Products...
                                        </>
                                    ) : (
                                        <>
                                            <FileSpreadsheet size={20} />
                                            Import Products
                                        </>
                                    )}
                                </Button>
                            )}

                            <div>
                                <p className="text-sm font-semibold text-neutral-900 mb-3">Required Columns:</p>
                                <ul className="text-sm text-neutral-600 space-y-2 ml-4 list-disc">
                                    <li><strong>barcode</strong> - Product barcode (unique identifier)</li>
                                    <li><strong>quantity_change</strong> - Positive for stock in, negative for stock out</li>
                                    <li><strong>reason</strong> - Why stock changed (stock_in, sale, damage, return, etc)</li>
                                </ul>
                            </div>

                            <Button
                                onClick={() => downloadSampleFile('stock')}
                                variant="outline"
                                size="lg"
                                fullWidth
                                className="gap-2"
                            >
                                Download Sample Stock File
                            </Button>

                            {/* Stock Import Result */}
                            {stockResult && (
                                <Card
                                    className={`border-2 ${stockResult.errors?.length > 0 ? 'border-warning-200 bg-warning-50' : 'border-success-200 bg-success-50'
                                        }`}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex gap-4">
                                            <div>
                                                {stockResult.errors?.length > 0 ? (
                                                    <AlertCircle className="text-warning-600" size={32} />
                                                ) : (
                                                    <CheckCircle className="text-success-600" size={32} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-xl font-bold text-neutral-900 mb-2">Product Import Complete</h2>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-4">
                                                        <Badge variant="success">
                                                            {stockResult.imported} Created/Updated
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {stockResult.total} Total
                                                        </Badge>
                                                        {stockResult.skipped > 0 && (
                                                            <Badge variant="warning">
                                                                {stockResult.skipped} Skipped
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {stockResult.errors?.length > 0 && (
                                                        <div className="mt-4 p-4 bg-warning-100 border border-warning-300 rounded-lg">
                                                            <p className="font-semibold text-warning-900 mb-2">
                                                                {stockResult.errors.length} errors occurred:
                                                            </p>
                                                            <ul className="text-sm text-warning-800 space-y-1">
                                                                {stockResult.errors.slice(0, 5).map((err: any, index: number) => (
                                                                    <li key={index}>
                                                                        • Row {err.row}: {err.error}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            {stockResult.errors.length > 5 && (
                                                                <p className="text-xs text-warning-700 mt-2">
                                                                    ... and {stockResult.errors.length - 5} more errors
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <Button
                                                    onClick={() => {
                                                        setStockFile(null);
                                                        setStockResult(null);
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
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Format Templates Tab */}
            {activeTab === 'format' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Format Templates</CardTitle>
                            <CardDescription>Download sample files to see the exact format required</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Customers */}
                                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                                    <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                        <Users size={20} className="text-blue-600" />
                                        Customers Import
                                    </h3>
                                    <div className="text-sm text-neutral-700 space-y-2 mb-4">
                                        <div className="font-mono text-xs bg-white p-2 rounded border border-blue-200">
                                            <div>name,phone,email,location</div>
                                            <div>Rajesh,9876543210,raj@email,Mumbai</div>
                                            <div>Priya,9876543211,priya@email,Delhi</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-600 mb-3">
                                        ✓ Columns: name, phone, email, location<br/>
                                        ✓ Duplicates detected by phone/email
                                    </p>
                                    <Button onClick={() => downloadSampleFile('customers')} variant="outline" size="sm" fullWidth>
                                        Download Sample
                                    </Button>
                                </div>

                                {/* Products */}
                                <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                                    <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                        <Package size={20} className="text-green-600" />
                                        Products Import
                                    </h3>
                                    <div className="text-sm text-neutral-700 space-y-2 mb-4">
                                        <div className="font-mono text-xs bg-white p-2 rounded border border-green-200">
                                            <div>name,sku,barcode,category,price</div>
                                            <div>Shirt,SKU001,123456,Clothing,599</div>
                                            <div>Shoes,SKU002,123457,Footwear,2500</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-600 mb-3">
                                        ✓ Columns: name, sku, barcode, category, price<br/>
                                        ✓ Update prices automatically
                                    </p>
                                    <Button onClick={() => downloadSampleFile('products')} variant="outline" size="sm" fullWidth>
                                        Download Sample
                                    </Button>
                                </div>

                                {/* Stock */}
                                <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                                    <h3 className="font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                        <BarChart3 size={20} className="text-purple-600" />
                                        Stock Updates
                                    </h3>
                                    <div className="text-sm text-neutral-700 space-y-2 mb-4">
                                        <div className="font-mono text-xs bg-white p-2 rounded border border-purple-200">
                                            <div>barcode,qty_change,reason</div>
                                            <div>123456,10,stock_in</div>
                                            <div>123457,-2,sale</div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-600 mb-3">
                                        ✓ Qty: positive=in, negative=out<br/>
                                        ✓ Auto-updates on purchases
                                    </p>
                                    <Button onClick={() => downloadSampleFile('stock')} variant="outline" size="sm" fullWidth>
                                        Download Sample
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Google Sheets Format */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileSpreadsheet size={20} />
                                Google Sheets Format
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-neutral-900 mb-2">For Customers Sheet:</h3>
                                    <div className="bg-neutral-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="border-b border-neutral-400">
                                                <tr>
                                                    <th className="pr-4">name</th>
                                                    <th className="pr-4">phone</th>
                                                    <th className="pr-4">email</th>
                                                    <th>location</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs">
                                                <tr className="border-t border-neutral-300">
                                                    <td className="pr-4">Rajesh Kumar</td>
                                                    <td className="pr-4">9876543210</td>
                                                    <td className="pr-4">rajesh@email.com</td>
                                                    <td>Mumbai</td>
                                                </tr>
                                                <tr className="border-t border-neutral-300">
                                                    <td className="pr-4">Priya Singh</td>
                                                    <td className="pr-4">9876543211</td>
                                                    <td className="pr-4">priya@email.com</td>
                                                    <td>Delhi</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-neutral-900 mb-2">For Products Sheet:</h3>
                                    <div className="bg-neutral-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="border-b border-neutral-400">
                                                <tr className="text-xs">
                                                    <th className="pr-4">name</th>
                                                    <th className="pr-4">sku</th>
                                                    <th className="pr-4">barcode</th>
                                                    <th className="pr-4">category</th>
                                                    <th className="pr-4">selling_price</th>
                                                    <th>current_stock</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs">
                                                <tr className="border-t border-neutral-300">
                                                    <td className="pr-4">Formal Shirt</td>
                                                    <td className="pr-4">SKU001</td>
                                                    <td className="pr-4">1234567890</td>
                                                    <td className="pr-4">Clothing</td>
                                                    <td className="pr-4">599</td>
                                                    <td>50</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
