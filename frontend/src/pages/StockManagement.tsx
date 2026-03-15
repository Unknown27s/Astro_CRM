import { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Search, AlertTriangle, TrendingDown, Package } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner, EmptyState } from '../components/ui/Avatar';
import toast from 'react-hot-toast';

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode: string;
    category: string;
    selling_price: number;
    current_stock: number;
    min_stock_level: number;
    max_stock_level: number;
}

interface Transaction {
    id: number;
    product_name: string;
    transaction_type: string;
    quantity_change: number;
    new_quantity: number;
    reason: string;
    created_at: string;
}

export default function StockManagement() {
    const [products, setProducts] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // Modal states
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showAdjustStock, setShowAdjustStock] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Barcode scanner
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [scanQuantity, setScanQuantity] = useState(1);
    const [scanType, setScanType] = useState('stock_in');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // New product form
    const [newProduct, setNewProduct] = useState({
        name: '',
        sku: '',
        barcode: '',
        category: '',
        selling_price: 0,
        current_stock: 0,
        min_stock_level: 10,
        max_stock_level: 100,
        supplier: '',
    });

    // Stock adjustment
    const [adjustQuantity, setAdjustQuantity] = useState(0);
    const [adjustReason, setAdjustReason] = useState('manual_adjustment');

    useEffect(() => {
        fetchProducts();
        fetchTransactions();
    }, [lowStockOnly]);

    const fetchProducts = async () => {
        setListLoading(true);
        try {
            const url = new URL('http://localhost:3001/api/inventory/products');
            if (lowStockOnly) url.searchParams.append('low_stock', 'true');
            if (searchTerm) url.searchParams.append('search', searchTerm);

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setListLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/inventory/transactions?limit=20', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            setTransactions(data.transactions || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (error) {
            toast.error('Unable to access camera');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    const handleScanBarcode = async () => {
        if (!scannedBarcode.trim()) {
            toast.error('Please enter or scan a barcode');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/inventory/scan-barcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    barcode: scannedBarcode,
                    quantity: scanQuantity,
                    transaction_type: scanType,
                    reason: `${scanType}_via_scanner`,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            const data = await response.json();
            toast.success(`Stock updated: ${data.product.name} → ${data.product.current_stock} units`);
            setScannedBarcode('');
            setScanQuantity(1);
            await fetchProducts();
            await fetchTransactions();
            setShowBarcodeScanner(false);
        } catch (error: any) {
            toast.error(error.message || 'Error scanning barcode');
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async () => {
        if (!newProduct.name.trim() || !newProduct.selling_price) {
            toast.error('Product name and selling price are required');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/inventory/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(newProduct),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            toast.success('Product added successfully');
            setShowAddProduct(false);
            setNewProduct({
                name: '',
                sku: '',
                barcode: '',
                category: '',
                selling_price: 0,
                current_stock: 0,
                min_stock_level: 10,
                max_stock_level: 100,
                supplier: '',
            });
            await fetchProducts();
        } catch (error: any) {
            toast.error(error.message || 'Error adding product');
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustStock = async () => {
        if (!selectedProduct) return;

        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/inventory/scan-barcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    barcode: selectedProduct.barcode,
                    quantity: Math.abs(adjustQuantity),
                    transaction_type: adjustQuantity > 0 ? 'stock_in' : 'stock_out',
                    reason: adjustReason,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            toast.success('Stock adjusted successfully');
            setShowAdjustStock(false);
            setAdjustQuantity(0);
            await fetchProducts();
            await fetchTransactions();
        } catch (error: any) {
            toast.error(error.message || 'Error adjusting stock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
                        <Package size={32} className="text-primary-600" />
                        Stock Management
                    </h1>
                    <p className="text-neutral-500 mt-1">Track inventory with barcode scanning</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => setShowBarcodeScanner(true)} size="lg" className="gap-2 flex-1 sm:flex-none">
                        <Camera size={20} />
                        Scan Barcode
                    </Button>
                    <Button onClick={() => setShowAddProduct(true)} variant="outline" size="lg" className="gap-2 flex-1 sm:flex-none">
                        <Plus size={20} />
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-neutral-600">Total Products</p>
                        <p className="text-2xl font-bold text-neutral-900">{products.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-neutral-600 flex items-center gap-1">
                            <AlertTriangle size={16} className="text-warning-600" />
                            Low Stock
                        </p>
                        <p className="text-2xl font-bold text-warning-600">
                            {products.filter((p) => p.current_stock <= p.min_stock_level).length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-neutral-600">Out of Stock</p>
                        <p className="text-2xl font-bold text-danger-600">
                            {products.filter((p) => p.current_stock === 0).length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-neutral-600">Total Units</p>
                        <p className="text-2xl font-bold text-primary-600">
                            {products.reduce((sum, p) => sum + p.current_stock, 0)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Products List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle>Products</CardTitle>
                                    <CardDescription>{products.length} products</CardDescription>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <div className="flex-1 sm:flex-none relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                                        <Input
                                            type="text"
                                            placeholder="Search products..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
                                            className="pl-10 w-full"
                                        />
                                    </div>
                                    <Button
                                        variant={lowStockOnly ? 'default' : 'outline'}
                                        onClick={() => setLowStockOnly(!lowStockOnly)}
                                        className="gap-2"
                                    >
                                        <AlertTriangle size={18} />
                                        {lowStockOnly ? 'Showing Low Stock' : 'Show Low Stock'}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {listLoading ? (
                                <div className="flex justify-center py-8">
                                    <Spinner size="md" />
                                </div>
                            ) : products.length > 0 ? (
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {products.map((product) => (
                                        <div
                                            key={product.id}
                                            className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-primary-300 transition-all cursor-pointer"
                                            onClick={() => {
                                                setSelectedProduct(product);
                                                setShowAdjustStock(true);
                                            }}
                                        >
                                            <div className="flex justify-between items-start gap-3 mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-neutral-900">{product.name}</h3>
                                                    <p className="text-xs text-neutral-500">SKU: {product.sku || 'N/A'}</p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        product.current_stock === 0
                                                            ? 'danger'
                                                            : product.current_stock <= product.min_stock_level
                                                                ? 'warning'
                                                                : 'success'
                                                    }
                                                    className="text-xs whitespace-nowrap"
                                                >
                                                    {product.current_stock} units
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs text-neutral-600">
                                                <div>
                                                    <p className="font-medium">Price</p>
                                                    <p>₹{Number(product.selling_price || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Min/Max</p>
                                                    <p>
                                                        {product.min_stock_level}/{product.max_stock_level}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Barcode</p>
                                                    <p className="font-mono text-xs">{product.barcode || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title="No products found" description="Add products to get started" />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Transactions */}
                <div>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingDown size={20} />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {transactions.length > 0 ? (
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="p-2 bg-neutral-50 rounded border border-neutral-200 text-xs">
                                            <p className="font-semibold text-neutral-900 truncate">{tx.product_name}</p>
                                            <div className="flex justify-between items-center mt-1">
                                                <Badge
                                                    variant={tx.transaction_type === 'stock_in' ? 'success' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {tx.transaction_type}
                                                </Badge>
                                                <span
                                                    className={`font-bold ${tx.quantity_change > 0 ? 'text-success-600' : 'text-danger-600'
                                                        }`}
                                                >
                                                    {tx.quantity_change > 0 ? '+' : ''}
                                                    {tx.quantity_change}
                                                </span>
                                            </div>
                                            <p className="text-neutral-500 mt-1">{tx.created_at?.split('T')[0]}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title="No transactions" description="Scan barcodes to record activity" />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Barcode Scanner Modal */}
            <Modal
                isOpen={showBarcodeScanner}
                onClose={() => {
                    setShowBarcodeScanner(false);
                    stopCamera();
                    setScannedBarcode('');
                }}
                title="Scan Barcode"
                size="lg"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => {
                            setShowBarcodeScanner(false);
                            stopCamera();
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleScanBarcode} disabled={loading}>
                            {loading ? 'Processing...' : 'Record Stock'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label>Barcode Input</Label>
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                placeholder="Scan barcode or enter manually"
                                value={scannedBarcode}
                                onChange={(e) => setScannedBarcode(e.target.value)}
                                autoFocus
                            />
                            <Button onClick={startCamera} variant="outline" className="gap-2">
                                <Camera size={18} />
                                Camera
                            </Button>
                        </div>
                    </div>

                    {videoRef && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full rounded-lg border border-neutral-300 max-h-48"
                        />
                    )}

                    <div>
                        <Label htmlFor="scan-type" className="text-sm">Transaction Type</Label>
                        <select
                            id="scan-type"
                            value={scanType}
                            onChange={(e) => setScanType(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="stock_in">Stock In (Receive)</option>
                            <option value="stock_out">Stock Out (Sale)</option>
                            <option value="adjustment">Adjustment</option>
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="scan-quantity">Quantity</Label>
                        <Input
                            id="scan-quantity"
                            type="number"
                            min="1"
                            value={scanQuantity}
                            onChange={(e) => setScanQuantity(Number(e.target.value))}
                        />
                    </div>
                </div>
            </Modal>

            {/* Add Product Modal */}
            <Modal
                isOpen={showAddProduct}
                onClose={() => setShowAddProduct(false)}
                title="Add New Product"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddProduct(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddProduct} disabled={loading}>
                            {loading ? 'Adding...' : 'Add Product'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label>Product Name *</Label>
                        <Input
                            placeholder="e.g., Formal Shirt"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>SKU</Label>
                            <Input
                                placeholder="e.g., SKU001"
                                value={newProduct.sku}
                                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Barcode</Label>
                            <Input
                                placeholder="Scan or enter"
                                value={newProduct.barcode}
                                onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Category</Label>
                        <Input
                            placeholder="e.g., Clothing"
                            value={newProduct.category}
                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label>Selling Price *</Label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={newProduct.selling_price}
                            onChange={(e) => setNewProduct({ ...newProduct, selling_price: Number(e.target.value) })}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label>Initial Stock</Label>
                            <Input
                                type="number"
                                min="0"
                                value={newProduct.current_stock}
                                onChange={(e) => setNewProduct({ ...newProduct, current_stock: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label>Min Level</Label>
                            <Input
                                type="number"
                                value={newProduct.min_stock_level}
                                onChange={(e) => setNewProduct({ ...newProduct, min_stock_level: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label>Max Level</Label>
                            <Input
                                type="number"
                                value={newProduct.max_stock_level}
                                onChange={(e) => setNewProduct({ ...newProduct, max_stock_level: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Adjust Stock Modal */}
            <Modal
                isOpen={showAdjustStock}
                onClose={() => {
                    setShowAdjustStock(false);
                    setAdjustQuantity(0);
                }}
                title={`Adjust Stock: ${selectedProduct?.name}`}
                size="sm"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAdjustStock(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdjustStock} disabled={loading}>
                            {loading ? 'Adjusting...' : 'Update Stock'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-neutral-600">Current Stock: <strong>{selectedProduct?.current_stock} units</strong></p>
                    </div>
                    <div>
                        <Label>Quantity Change</Label>
                        <Input
                            type="number"
                            placeholder="Positive = Add, Negative = Remove"
                            value={adjustQuantity}
                            onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <Label>Reason</Label>
                        <select
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="manual_adjustment">Manual Adjustment</option>
                            <option value="damaged">Damaged/Defective</option>
                            <option value="lost">Lost/Misplaced</option>
                            <option value="return">Customer Return</option>
                            <option value="inventory_count">Inventory Count</option>
                        </select>
                    </div>
                    {adjustQuantity !== 0 && (
                        <div className="p-2 bg-primary-50 border border-primary-200 rounded text-sm">
                            New Stock: <strong>{(selectedProduct?.current_stock || 0) + adjustQuantity}</strong> units
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
