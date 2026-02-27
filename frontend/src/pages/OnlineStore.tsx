import { useState, useEffect } from 'react';
import { products as productsApi, shop as shopApi, coupons as couponsApi } from '../services/api';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
    Package, Settings, ShoppingBag, Share2, Plus, Edit2, Trash2,
    Eye, EyeOff, CheckCircle, XCircle, Copy, ExternalLink,
    ChevronDown, AlertCircle, Store, Tag, Phone, Mail, Palette,
    ToggleLeft, ToggleRight, TrendingUp, Clock, Ticket, Percent
} from 'lucide-react';

const TABS = ['Products', 'Coupons', 'Customize', 'Orders', 'Share & Promote'] as const;
type Tab = typeof TABS[number];

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_COLORS: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Processing: 'bg-indigo-100 text-indigo-700',
    Shipped: 'bg-purple-100 text-purple-700',
    Delivered: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
};

const EMPTY_PRODUCT = {
    name: '', description: '', price: '', original_price: '',
    image_url: '', category: '', stock_qty: '0', in_stock: true, is_visible: true,
};

export default function OnlineStore() {
    const [activeTab, setActiveTab] = useState<Tab>('Products');
    const [productList, setProductList] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Product modal
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [productForm, setProductForm] = useState({ ...EMPTY_PRODUCT });
    const [savingProduct, setSavingProduct] = useState(false);

    // Settings form
    const [settingsForm, setSettingsForm] = useState<any>({});
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    // Delete confirm
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Expanded order
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    // Coupons
    const [couponList, setCouponList] = useState<any[]>([]);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<any>(null);
    const [couponForm, setCouponForm] = useState({
        code: '', discount_type: 'percentage', discount_value: '',
        min_order_amount: '', max_discount: '', max_uses: '',
        is_active: true, expires_at: ''
    });
    const [savingCoupon, setSavingCoupon] = useState(false);
    const [deleteCouponId, setDeleteCouponId] = useState<number | null>(null);

    const shopUrl = `${window.location.origin}/shop`;

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [prodRes, settRes, ordRes, coupRes] = await Promise.all([
                productsApi.getAll(),
                shopApi.getSettings(),
                shopApi.getOrders(),
                couponsApi.getAll(),
            ]);
            setProductList(prodRes.data.products || []);
            setSettings(settRes.data.settings || {});
            setSettingsForm(settRes.data.settings || {});
            setOrders(ordRes.data.orders || []);
            setCouponList(coupRes.data.coupons || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // ── Products ──
    const openAddProduct = () => {
        setEditingProduct(null);
        setProductForm({ ...EMPTY_PRODUCT });
        setShowProductModal(true);
    };

    const openEditProduct = (p: any) => {
        setEditingProduct(p);
        setProductForm({
            name: p.name || '',
            description: p.description || '',
            price: String(p.price ?? ''),
            original_price: p.original_price ? String(p.original_price) : '',
            image_url: p.image_url || '',
            category: p.category || '',
            stock_qty: String(p.stock_qty ?? 0),
            in_stock: !!p.in_stock,
            is_visible: !!p.is_visible,
        });
        setShowProductModal(true);
    };

    const saveProduct = async () => {
        if (!productForm.name.trim()) return toast.error('Product name is required');
        if (!productForm.price) return toast.error('Price is required');
        setSavingProduct(true);
        try {
            const payload = {
                ...productForm,
                price: parseFloat(productForm.price),
                original_price: productForm.original_price ? parseFloat(productForm.original_price) : null,
                stock_qty: parseInt(productForm.stock_qty) || 0,
            };
            if (editingProduct) {
                const res = await productsApi.update(editingProduct.id, payload);
                setProductList(prev => prev.map(p => p.id === editingProduct.id ? res.data.product : p));
            } else {
                const res = await productsApi.create(payload);
                setProductList(prev => [res.data.product, ...prev]);
            }
            setShowProductModal(false);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to save product');
        } finally {
            setSavingProduct(false);
        }
    };

    const deleteProduct = async (id: number) => {
        try {
            await productsApi.delete(id);
            setProductList(prev => prev.filter(p => p.id !== id));
            setDeleteId(null);
        } catch (e) {
            toast.error('Failed to delete product');
        }
    };

    const toggleVisibility = async (id: number) => {
        const res = await productsApi.toggleVisibility(id);
        setProductList(prev => prev.map(p => p.id === id ? res.data.product : p));
    };

    const toggleStock = async (id: number) => {
        const res = await productsApi.toggleStock(id);
        setProductList(prev => prev.map(p => p.id === id ? res.data.product : p));
    };

    // ── Settings ──
    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await shopApi.updateSettings(settingsForm);
            setSettings(res.data.settings);
            setSettingsForm(res.data.settings);
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2500);
        } catch (e) {
            toast.error('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    // ── Orders ──
    const updateOrderStatus = async (id: number, status: string) => {
        const res = await shopApi.updateOrderStatus(id, status);
        setOrders(prev => prev.map(o => o.id === id ? res.data.order : o));
    };

    const deleteOrder = async (id: number) => {
        await shopApi.deleteOrder(id);
        setOrders(prev => prev.filter(o => o.id !== id));
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shopUrl);
    };

    // ── Coupons ──
    const openAddCoupon = () => {
        setEditingCoupon(null);
        setCouponForm({ code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_discount: '', max_uses: '', is_active: true, expires_at: '' });
        setShowCouponModal(true);
    };

    const openEditCoupon = (c: any) => {
        setEditingCoupon(c);
        setCouponForm({
            code: c.code || '', discount_type: c.discount_type || 'percentage',
            discount_value: String(c.discount_value ?? ''), min_order_amount: c.min_order_amount ? String(c.min_order_amount) : '',
            max_discount: c.max_discount ? String(c.max_discount) : '', max_uses: c.max_uses ? String(c.max_uses) : '',
            is_active: !!c.is_active, expires_at: c.expires_at || ''
        });
        setShowCouponModal(true);
    };

    const saveCoupon = async () => {
        if (!couponForm.code.trim()) return toast.error('Coupon code is required');
        if (!couponForm.discount_value || Number(couponForm.discount_value) <= 0) return toast.error('Discount value is required');
        setSavingCoupon(true);
        try {
            const payload = {
                ...couponForm,
                discount_value: parseFloat(couponForm.discount_value),
                min_order_amount: couponForm.min_order_amount ? parseFloat(couponForm.min_order_amount) : 0,
                max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : 0,
                max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : 0,
            };
            if (editingCoupon) {
                const res = await couponsApi.update(editingCoupon.id, payload);
                setCouponList(prev => prev.map(c => c.id === editingCoupon.id ? res.data.coupon : c));
            } else {
                const res = await couponsApi.create(payload);
                setCouponList(prev => [res.data.coupon, ...prev]);
            }
            setShowCouponModal(false);
            toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to save coupon');
        } finally {
            setSavingCoupon(false);
        }
    };

    const deleteCoupon = async (id: number) => {
        try {
            await couponsApi.delete(id);
            setCouponList(prev => prev.filter(c => c.id !== id));
            setDeleteCouponId(null);
            toast.success('Coupon deleted');
        } catch (e) {
            toast.error('Failed to delete coupon');
        }
    };

    const toggleCoupon = async (id: number) => {
        const res = await couponsApi.toggle(id);
        setCouponList(prev => prev.map(c => c.id === id ? res.data.coupon : c));
    };

    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const totalOrderValue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Online Store</h1>
                    <p className="text-gray-500 mt-1">Manage your products, customize your store, and track orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${settings.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {settings.is_active ? 'Store Live' : 'Store Offline'}
                    </span>
                    <a href="/shop" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                        <ExternalLink size={15} />
                        View Store
                    </a>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Products', value: productList.length, sub: `${productList.filter(p => p.is_visible).length} visible`, icon: Package, color: 'indigo' },
                    { label: 'Total Orders', value: orders.length, sub: `${pendingOrders} pending`, icon: ShoppingBag, color: 'purple' },
                    { label: 'Order Revenue', value: `₹${totalOrderValue.toFixed(0)}`, sub: 'from online orders', icon: TrendingUp, color: 'green' },
                    { label: 'Categories', value: [...new Set(productList.map(p => p.category).filter(Boolean))].length, sub: 'product categories', icon: Tag, color: 'orange' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    const colorMap: any = {
                        indigo: 'from-indigo-500 to-indigo-600',
                        purple: 'from-purple-500 to-purple-600',
                        green: 'from-green-500 to-emerald-600',
                        orange: 'from-orange-500 to-red-500',
                    };
                    return (
                        <div key={i} className={`bg-gradient-to-br ${colorMap[s.color]} rounded-xl p-5 text-white shadow-md`}>
                            <div className="flex items-center justify-between mb-2">
                                <Icon size={24} className="opacity-90" />
                            </div>
                            <p className="text-2xl font-bold">{s.value}</p>
                            <p className="text-sm opacity-80 mt-0.5">{s.label}</p>
                            <p className="text-xs opacity-60 mt-1">{s.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="flex border-b border-gray-200">
                    {TABS.map(tab => {
                        const icons: any = { Products: Package, Coupons: Ticket, Customize: Settings, Orders: ShoppingBag, 'Share & Promote': Share2 };
                        const Icon = icons[tab];
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab}
                                {tab === 'Orders' && pendingOrders > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                        {pendingOrders}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* ── TAB: PRODUCTS ── */}
                    {activeTab === 'Products' && (
                        <div>
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-gray-800">Product Catalog</h2>
                                <button onClick={openAddProduct}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                                    <Plus size={16} />
                                    Add Product
                                </button>
                            </div>

                            {loading ? (
                                <div className="text-center py-12 text-gray-400">Loading...</div>
                            ) : productList.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-lg font-medium">No products yet</p>
                                    <p className="text-sm mt-1">Add your first product to start selling online</p>
                                    <button onClick={openAddProduct} className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700">
                                        Add Product
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {productList.map(p => (
                                        <div key={p.id} className={`border rounded-xl overflow-hidden transition-all ${!p.is_visible ? 'opacity-60 border-dashed' : 'border-gray-200 hover:shadow-md'}`}>
                                            {/* Image */}
                                            <div className="h-44 bg-gray-100 relative overflow-hidden">
                                                {p.image_url ? (
                                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={(e: any) => { e.target.style.display = 'none'; }} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package size={40} className="text-gray-300" />
                                                    </div>
                                                )}
                                                {/* Badges */}
                                                <div className="absolute top-2 left-2 flex gap-1">
                                                    {!p.is_visible && <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">Hidden</span>}
                                                    {!p.in_stock && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">Out of Stock</span>}
                                                    {p.category && <span className="bg-white/90 text-gray-700 text-xs px-2 py-0.5 rounded-full">{p.category}</span>}
                                                </div>
                                            </div>

                                            <div className="p-4">
                                                <h3 className="font-semibold text-gray-800 truncate">{p.name}</h3>
                                                {p.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-lg font-bold text-indigo-600">₹{Number(p.price).toFixed(0)}</span>
                                                    {p.original_price && (
                                                        <span className="text-sm text-gray-400 line-through">₹{Number(p.original_price).toFixed(0)}</span>
                                                    )}
                                                    {p.original_price && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                            {Math.round((1 - p.price / p.original_price) * 100)}% off
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => toggleVisibility(p.id)} title={p.is_visible ? 'Hide' : 'Show'}
                                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                                            {p.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
                                                        </button>
                                                        <button onClick={() => toggleStock(p.id)} title={p.in_stock ? 'Mark out of stock' : 'Mark in stock'}
                                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                                            {p.in_stock ? <CheckCircle size={15} className="text-green-500" /> : <XCircle size={15} className="text-red-400" />}
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => openEditProduct(p)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors">
                                                            <Edit2 size={15} />
                                                        </button>
                                                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: COUPONS ── */}
                    {activeTab === 'Coupons' && (
                        <div>
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-gray-800">Discount Coupons</h2>
                                <button onClick={openAddCoupon}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                                    <Plus size={16} />
                                    Create Coupon
                                </button>
                            </div>

                            {couponList.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Ticket size={48} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-lg font-medium">No coupons yet</p>
                                    <p className="text-sm mt-1">Create discount codes to promote your store</p>
                                    <button onClick={openAddCoupon} className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700">
                                        Create Coupon
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {couponList.map(c => {
                                        const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                                        const isUsedUp = c.max_uses > 0 && c.used_count >= c.max_uses;
                                        return (
                                            <div key={c.id} className={`border rounded-xl p-4 transition-all ${!c.is_active || isExpired || isUsedUp ? 'opacity-60 border-dashed' : 'border-gray-200 hover:shadow-md'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                                            {c.discount_type === 'percentage' ? <Percent size={20} /> : <span className="text-sm font-bold">₹</span>}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-lg font-bold text-gray-800 tracking-wider">{c.code}</code>
                                                                {!c.is_active && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">Inactive</span>}
                                                                {isExpired && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Expired</span>}
                                                                {isUsedUp && <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">Used up</span>}
                                                            </div>
                                                            <p className="text-sm text-gray-500 mt-0.5">
                                                                {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                                                                {c.min_order_amount > 0 && ` on orders above ₹${c.min_order_amount}`}
                                                                {c.max_discount > 0 && c.discount_type === 'percentage' && ` (max ₹${c.max_discount})`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right text-sm text-gray-500">
                                                            <p>{c.used_count || 0}{c.max_uses > 0 ? `/${c.max_uses}` : ''} used</p>
                                                            {c.expires_at && <p className="text-xs">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => toggleCoupon(c.id)} title={c.is_active ? 'Deactivate' : 'Activate'}
                                                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                                                                {c.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
                                                            </button>
                                                            <button onClick={() => openEditCoupon(c)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors">
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button onClick={() => setDeleteCouponId(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: CUSTOMIZE ── */}
                    {activeTab === 'Customize' && (
                        <div className="max-w-2xl space-y-6">
                            <h2 className="text-lg font-bold text-gray-800">Store Customization</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Name</label>
                                    <div className="relative">
                                        <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" value={settingsForm.store_name || ''}
                                            onChange={e => setSettingsForm((f: any) => ({ ...f, store_name: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency Symbol</label>
                                    <input type="text" value={settingsForm.currency || '₹'}
                                        onChange={e => setSettingsForm((f: any) => ({ ...f, currency: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Store Tagline</label>
                                <input type="text" value={settingsForm.store_tagline || ''}
                                    onChange={e => setSettingsForm((f: any) => ({ ...f, store_tagline: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    placeholder="e.g. Quality products at great prices" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Banner / Hero Text</label>
                                <input type="text" value={settingsForm.banner_text || ''}
                                    onChange={e => setSettingsForm((f: any) => ({ ...f, banner_text: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    placeholder="e.g. Free delivery on orders above ₹999" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <Palette size={14} />
                                        Brand Color
                                    </div>
                                </label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={settingsForm.primary_color || '#4F46E5'}
                                        onChange={e => setSettingsForm((f: any) => ({ ...f, primary_color: e.target.value }))}
                                        className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer p-1" />
                                    <input type="text" value={settingsForm.primary_color || '#4F46E5'}
                                        onChange={e => setSettingsForm((f: any) => ({ ...f, primary_color: e.target.value }))}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-mono" />
                                    <div className="w-10 h-10 rounded-lg border border-gray-200" style={{ background: settingsForm.primary_color || '#4F46E5' }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" value={settingsForm.contact_phone || ''}
                                            onChange={e => setSettingsForm((f: any) => ({ ...f, contact_phone: e.target.value }))}
                                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
                                        <input type="text" value={settingsForm.whatsapp_number || ''}
                                            onChange={e => setSettingsForm((f: any) => ({ ...f, whatsapp_number: e.target.value }))}
                                            placeholder="e.g. 919876543210"
                                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email</label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="email" value={settingsForm.contact_email || ''}
                                        onChange={e => setSettingsForm((f: any) => ({ ...f, contact_email: e.target.value }))}
                                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-medium text-gray-800 text-sm">Store Active</p>
                                    <p className="text-xs text-gray-500">When off, customers will see a "coming soon" message</p>
                                </div>
                                <button onClick={() => setSettingsForm((f: any) => ({ ...f, is_active: !f.is_active }))}>
                                    {settingsForm.is_active ? <ToggleRight size={32} className="text-indigo-600" /> : <ToggleLeft size={32} className="text-gray-400" />}
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <button onClick={saveSettings} disabled={savingSettings}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm">
                                    {savingSettings ? 'Saving...' : 'Save Settings'}
                                </button>
                                {settingsSaved && (
                                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                        <CheckCircle size={16} />
                                        Saved!
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: ORDERS ── */}
                    {activeTab === 'Orders' && (
                        <div>
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-lg font-bold text-gray-800">Online Orders</h2>
                                <div className="flex gap-2 text-sm text-gray-500">
                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">{pendingOrders} Pending</span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{orders.length} Total</span>
                                </div>
                            </div>

                            {orders.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-lg font-medium">No orders yet</p>
                                    <p className="text-sm mt-1">Share your store link to start receiving orders</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orders.map(o => {
                                        let items: any[] = [];
                                        try { items = JSON.parse(o.items || '[]'); } catch (_) {}
                                        const isExpanded = expandedOrder === o.id;
                                        return (
                                            <div key={o.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => setExpandedOrder(isExpanded ? null : o.id)}>
                                                    <div className="flex items-center gap-4">
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm">{o.order_number}</p>
                                                            <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-800">{o.customer_name}</p>
                                                            <p className="text-xs text-gray-500">{o.customer_phone}</p>
                                                        </div>
                                                        <div className="text-sm text-gray-600">{items.length} item{items.length !== 1 ? 's' : ''}</div>
                                                        <div className="font-bold text-indigo-600">₹{Number(o.total_amount).toFixed(0)}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                                                            {o.status}
                                                        </span>
                                                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Customer Details</p>
                                                                <p className="text-sm text-gray-800">{o.customer_name}</p>
                                                                <p className="text-sm text-gray-600">{o.customer_phone}</p>
                                                                {o.customer_email && <p className="text-sm text-gray-600">{o.customer_email}</p>}
                                                                {o.customer_address && <p className="text-sm text-gray-600 mt-1">{o.customer_address}</p>}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Order Items</p>
                                                                {items.map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between text-sm text-gray-700">
                                                                        <span>{item.name} × {item.qty}</span>
                                                                        <span className="font-medium">₹{(item.price * item.qty).toFixed(0)}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between font-bold text-gray-800 mt-1 pt-1 border-t">
                                                                    <span>Total</span>
                                                                    <span>₹{Number(o.total_amount).toFixed(0)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {o.notes && <p className="text-sm text-gray-600 italic">Note: {o.notes}</p>}
                                                        <div className="flex items-center gap-3">
                                                            <select value={o.status}
                                                                onChange={e => updateOrderStatus(o.id, e.target.value)}
                                                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                                                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                            {o.customer_phone && (
                                                                <a href={`https://wa.me/${o.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                                                    className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
                                                                    WhatsApp
                                                                </a>
                                                            )}
                                                            <button onClick={() => deleteOrder(o.id)}
                                                                className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-sm hover:bg-red-100 transition-colors">
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: SHARE & PROMOTE ── */}
                    {activeTab === 'Share & Promote' && (
                        <div className="space-y-6 max-w-2xl">
                            <h2 className="text-lg font-bold text-gray-800">Share Your Store</h2>

                            {/* Store Link */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                                <p className="text-sm font-semibold text-indigo-800 mb-2">Your Store Link</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white px-3 py-2.5 rounded-lg border border-indigo-200 text-sm text-gray-700 overflow-x-auto">
                                        {shopUrl}
                                    </code>
                                    <button onClick={copyLink}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap">
                                        <Copy size={14} />
                                        Copy
                                    </button>
                                    <a href="/shop" target="_blank" rel="noopener noreferrer"
                                        className="p-2.5 bg-white border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                                <p className="text-xs text-indigo-600 mt-2 opacity-75">Share this link on WhatsApp, Instagram, Facebook, or any platform</p>
                            </div>

                            {/* QR Code */}
                            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                                <p className="font-semibold text-gray-800 mb-4">QR Code</p>
                                <div className="inline-block p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                                    <QRCode value={shopUrl} size={180} />
                                </div>
                                <p className="text-sm text-gray-500 mt-3">Scan to open your store instantly</p>
                                <p className="text-xs text-gray-400 mt-1">Print this QR code on your packaging, receipts, or shop display</p>
                            </div>

                            {/* Share messages */}
                            <div className="bg-white border border-gray-200 rounded-xl p-5">
                                <p className="font-semibold text-gray-800 mb-3">Quick Share Messages</p>
                                <div className="space-y-3">
                                    {[
                                        {
                                            label: 'WhatsApp',
                                            color: 'bg-green-500',
                                            msg: `🛍️ Shop at ${settings.store_name || 'our store'}!\n\n${settings.store_tagline || ''}\n\nOrder now: ${shopUrl}`,
                                            href: `https://wa.me/?text=${encodeURIComponent(`🛍️ Shop at ${settings.store_name || 'our store'}!\n\n${settings.store_tagline || ''}\n\nOrder now: ${shopUrl}`)}`
                                        },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 font-medium mb-1">{item.label}</p>
                                                <p className="text-sm text-gray-700 whitespace-pre-line">{item.msg}</p>
                                            </div>
                                            <a href={item.href} target="_blank" rel="noopener noreferrer"
                                                className={`${item.color} text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap`}>
                                                Share
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tips */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                                <div className="flex gap-3">
                                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-amber-800 mb-2">Promotion Tips</p>
                                        <ul className="text-sm text-amber-700 space-y-1.5">
                                            <li>• Post your store link in WhatsApp groups & status</li>
                                            <li>• Add QR code to your business card and receipts</li>
                                            <li>• Share product photos on Instagram with your store link in bio</li>
                                            <li>• Offer a discount for first-time online orders</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── PRODUCT MODAL ── */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                            <button onClick={() => setShowProductModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                                <input type="text" value={productForm.name}
                                    onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Men's Cotton T-Shirt"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea rows={3} value={productForm.description}
                                    onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Describe your product..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹) *</label>
                                    <input type="number" min="0" step="0.01" value={productForm.price}
                                        onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">MRP / Original (₹)</label>
                                    <input type="number" min="0" step="0.01" value={productForm.original_price}
                                        onChange={e => setProductForm(f => ({ ...f, original_price: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input type="text" value={productForm.category}
                                        onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))}
                                        placeholder="e.g. Clothing"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                                    <input type="number" min="0" value={productForm.stock_qty}
                                        onChange={e => setProductForm(f => ({ ...f, stock_qty: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                <input type="url" value={productForm.image_url}
                                    onChange={e => setProductForm(f => ({ ...f, image_url: e.target.value }))}
                                    placeholder="https://... (paste any image link)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                {productForm.image_url && (
                                    <img src={productForm.image_url} alt="preview" className="mt-2 h-24 w-24 object-cover rounded-lg border" onError={(e: any) => e.target.style.display = 'none'} />
                                )}
                            </div>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={productForm.in_stock}
                                        onChange={e => setProductForm(f => ({ ...f, in_stock: e.target.checked }))}
                                        className="rounded text-indigo-600" />
                                    <span className="text-sm text-gray-700">In Stock</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={productForm.is_visible}
                                        onChange={e => setProductForm(f => ({ ...f, is_visible: e.target.checked }))}
                                        className="rounded text-indigo-600" />
                                    <span className="text-sm text-gray-700">Visible on Store</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setShowProductModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={saveProduct} disabled={savingProduct}
                                className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                {savingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRM ── */}
            {deleteId !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Product?</h3>
                        <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
                            <button onClick={() => deleteProduct(deleteId)} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── COUPON MODAL ── */}
            {showCouponModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-800">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
                            <button onClick={() => setShowCouponModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                                <input type="text" value={couponForm.code}
                                    onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    placeholder="e.g. SAVE20, WELCOME10"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase tracking-wider" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                                    <select value={couponForm.discount_type}
                                        onChange={e => setCouponForm(f => ({ ...f, discount_type: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Discount Value * {couponForm.discount_type === 'percentage' ? '(%)' : '(₹)'}
                                    </label>
                                    <input type="number" min="0" step="0.01" value={couponForm.discount_value}
                                        onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))}
                                        placeholder="e.g. 20"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (₹)</label>
                                    <input type="number" min="0" value={couponForm.min_order_amount}
                                        onChange={e => setCouponForm(f => ({ ...f, min_order_amount: e.target.value }))}
                                        placeholder="0 = no minimum"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                                {couponForm.discount_type === 'percentage' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                                        <input type="number" min="0" value={couponForm.max_discount}
                                            onChange={e => setCouponForm(f => ({ ...f, max_discount: e.target.value }))}
                                            placeholder="0 = no cap"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                                    <input type="number" min="0" value={couponForm.max_uses}
                                        onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))}
                                        placeholder="0 = unlimited"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                    <input type="date" value={couponForm.expires_at}
                                        onChange={e => setCouponForm(f => ({ ...f, expires_at: e.target.value }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={couponForm.is_active}
                                    onChange={e => setCouponForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="rounded text-indigo-600" />
                                <span className="text-sm text-gray-700">Active (customers can use this coupon)</span>
                            </label>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setShowCouponModal(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={saveCoupon} disabled={savingCoupon}
                                className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                {savingCoupon ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE COUPON CONFIRM ── */}
            {deleteCouponId !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Coupon?</h3>
                        <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteCouponId(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm">Cancel</button>
                            <button onClick={() => deleteCoupon(deleteCouponId)} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
