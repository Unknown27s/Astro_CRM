import { useState, useEffect } from 'react';
import { publicShop } from '../services/api';
import toast from 'react-hot-toast';
import { ShoppingCart, Plus, Minus, X, Search, Phone, Mail, ChevronRight, Package, CheckCircle, MapPin, SlidersHorizontal, Tag } from 'lucide-react';

interface CartItem { id: number; name: string; price: number; qty: number; image_url?: string; }

export default function Shop() {
    const [storeSettings, setStoreSettings] = useState<any>(null);
    const [productList, setProductList] = useState<any[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [placingOrder, setPlacingOrder] = useState(false);

    const [orderForm, setOrderForm] = useState({
        customer_name: '', customer_phone: '', customer_email: '',
        customer_address: '', notes: '',
    });

    // Coupon
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number; discount_type: string; discount_value: number } | null>(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    useEffect(() => {
        publicShop.getStorefront()
            .then(res => {
                setStoreSettings(res.data.settings || {});
                setProductList(res.data.products || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const primaryColor = storeSettings?.primary_color || '#4F46E5';
    const currency = storeSettings?.currency || '₹';

    const categories = ['All', ...Array.from(new Set(productList.map((p: any) => p.category).filter(Boolean))) as string[]];

    const filtered = productList.filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
        const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
        return matchSearch && matchCat;
    });

    const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const cartCount = cart.reduce((s, i) => s + i.qty, 0);
    const discountAmount = appliedCoupon?.discount_amount || 0;
    const finalTotal = Math.max(0, cartTotal - discountAmount);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, image_url: product.image_url }];
        });
    };

    const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.id !== id));

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
    };

    const getQty = (id: number) => cart.find(i => i.id === id)?.qty || 0;

    const applyCoupon = async () => {
        if (!couponCode.trim()) return toast.error('Enter a coupon code');
        setValidatingCoupon(true);
        try {
            const res = await publicShop.validateCoupon(couponCode.trim(), cartTotal);
            setAppliedCoupon(res.data);
            toast.success(`Coupon applied! You save ${currency}${res.data.discount_amount}`);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Invalid coupon code');
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
    };

    const placeOrder = async () => {
        if (!orderForm.customer_name.trim()) return toast.error('Please enter your name');
        if (!orderForm.customer_phone.trim()) return toast.error('Please enter your phone number');
        setPlacingOrder(true);
        try {
            const res = await publicShop.placeOrder({
                ...orderForm,
                items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
                total_amount: finalTotal,
                coupon_code: appliedCoupon?.code || '',
                discount_amount: discountAmount,
            });
            setOrderSuccess(res.data.order_number);
            setCart([]);
            setAppliedCoupon(null);
            setCouponCode('');
            setShowOrderForm(false);
            setShowCart(false);
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Failed to place order. Try again.');
        } finally {
            setPlacingOrder(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading store...</p>
                </div>
            </div>
        );
    }

    if (!storeSettings?.is_active) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <Package size={64} className="mx-auto mb-4 text-gray-300" />
                    <h2 className="text-2xl font-bold text-gray-700">{storeSettings?.store_name || 'Store'}</h2>
                    <p className="text-gray-500 mt-2">We'll be back soon! The store is temporarily offline.</p>
                    {storeSettings?.contact_phone && (
                        <a href={`tel:${storeSettings.contact_phone}`}
                            className="inline-flex items-center gap-2 mt-4 text-indigo-600 font-medium">
                            <Phone size={16} /> {storeSettings.contact_phone}
                        </a>
                    )}
                </div>
            </div>
        );
    }

    // Order Success Screen
    if (orderSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: `${primaryColor}20` }}>
                        <CheckCircle size={40} style={{ color: primaryColor }} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h2>
                    <p className="text-gray-500 mb-1">Your order number is</p>
                    <p className="text-xl font-bold font-mono" style={{ color: primaryColor }}>{orderSuccess}</p>
                    <p className="text-sm text-gray-500 mt-3">We'll contact you shortly to confirm your order.</p>
                    {storeSettings?.contact_phone && (
                        <p className="text-sm text-gray-500 mt-1">Questions? Call us at <strong>{storeSettings.contact_phone}</strong></p>
                    )}
                    <button onClick={() => setOrderSuccess(null)}
                        className="mt-6 w-full py-3 rounded-xl text-white font-semibold text-sm"
                        style={{ background: primaryColor }}>
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── NAVBAR ── */}
            <nav className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                            style={{ background: primaryColor }}>
                            {(storeSettings?.store_name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm leading-tight">{storeSettings?.store_name || 'Store'}</p>
                            {storeSettings?.store_tagline && (
                                <p className="text-xs text-gray-500 leading-tight hidden sm:block">{storeSettings.store_tagline}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={() => setShowCart(true)}
                        className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
                        style={{ background: primaryColor }}>
                        <ShoppingCart size={16} />
                        <span className="hidden sm:inline">Cart</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </nav>

            {/* ── HERO BANNER ── */}
            <div className="text-white px-4 py-10 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}>
                <h1 className="text-3xl font-bold mb-2">{storeSettings?.store_name || 'Our Store'}</h1>
                {storeSettings?.store_tagline && <p className="text-lg opacity-90 mb-3">{storeSettings.store_tagline}</p>}
                {storeSettings?.banner_text && (
                    <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-sm font-medium mt-2">
                        {storeSettings.banner_text}
                    </div>
                )}
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* ── SEARCH + FILTER ── */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 bg-white text-sm"
                            style={{ '--tw-ring-color': primaryColor } as any}
                        />
                    </div>
                    {categories.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {categories.map(cat => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat
                                        ? 'text-white shadow-md'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                    style={selectedCategory === cat ? { background: primaryColor } : {}}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── PRODUCTS GRID ── */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Package size={48} className="mx-auto mb-3 text-gray-200" />
                        <p className="text-gray-400 font-medium">No products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filtered.map(product => {
                            const qty = getQty(product.id);
                            const discount = product.original_price && product.original_price > product.price
                                ? Math.round((1 - product.price / product.original_price) * 100) : 0;
                            return (
                                <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
                                    {/* Image */}
                                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e: any) => e.target.style.display = 'none'} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package size={36} className="text-gray-300" />
                                            </div>
                                        )}
                                        {discount > 0 && (
                                            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                {discount}% OFF
                                            </span>
                                        )}
                                        {!product.in_stock && (
                                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                                <span className="bg-gray-800 text-white text-xs font-semibold px-3 py-1 rounded-full">Out of Stock</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3">
                                        {product.category && (
                                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{product.category}</p>
                                        )}
                                        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{product.name}</h3>
                                        {product.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="font-bold text-base" style={{ color: primaryColor }}>
                                                {currency}{Number(product.price).toFixed(0)}
                                            </span>
                                            {product.original_price && (
                                                <span className="text-xs text-gray-400 line-through">
                                                    {currency}{Number(product.original_price).toFixed(0)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Add to Cart */}
                                        {product.in_stock ? (
                                            qty === 0 ? (
                                                <button onClick={() => addToCart(product)}
                                                    className="mt-3 w-full py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                                                    style={{ background: primaryColor }}>
                                                    Add to Cart
                                                </button>
                                            ) : (
                                                <div className="mt-3 flex items-center justify-between">
                                                    <button onClick={() => updateQty(product.id, -1)}
                                                        className="w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-lg transition-all hover:bg-gray-50"
                                                        style={{ borderColor: primaryColor, color: primaryColor }}>
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-sm font-bold w-8 text-center" style={{ color: primaryColor }}>{qty}</span>
                                                    <button onClick={() => updateQty(product.id, 1)}
                                                        className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold"
                                                        style={{ background: primaryColor }}>
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <button disabled className="mt-3 w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium">
                                                Out of Stock
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── FOOTER ── */}
                {(storeSettings?.contact_phone || storeSettings?.contact_email) && (
                    <div className="mt-12 py-6 border-t border-gray-200 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
                        {storeSettings.contact_phone && (
                            <a href={`tel:${storeSettings.contact_phone}`} className="flex items-center gap-1.5 hover:text-gray-700">
                                <Phone size={14} /> {storeSettings.contact_phone}
                            </a>
                        )}
                        {storeSettings.contact_email && (
                            <a href={`mailto:${storeSettings.contact_email}`} className="flex items-center gap-1.5 hover:text-gray-700">
                                <Mail size={14} /> {storeSettings.contact_email}
                            </a>
                        )}
                    </div>
                )}
            </div>

            {/* ── FLOATING CART BUTTON (mobile) ── */}
            {cartCount > 0 && !showCart && (
                <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4">
                    <button onClick={() => setShowCart(true)}
                        className="flex items-center gap-3 px-6 py-3 rounded-2xl text-white shadow-xl text-sm font-semibold"
                        style={{ background: primaryColor }}>
                        <ShoppingCart size={18} />
                        {cartCount} item{cartCount !== 1 ? 's' : ''} · {currency}{cartTotal.toFixed(0)}
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {/* ── CART SIDEBAR ── */}
            {showCart && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="flex-1 bg-black/40" onClick={() => setShowCart(false)} />
                    <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b">
                            <div>
                                <h2 className="font-bold text-gray-800">Your Cart</h2>
                                <p className="text-xs text-gray-500">{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
                            </div>
                            <button onClick={() => setShowCart(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                                    <p>Your cart is empty</p>
                                </div>
                            ) : cart.map(item => (
                                <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                    {item.image_url && (
                                        <img src={item.image_url} alt={item.name} className="w-14 h-14 object-cover rounded-lg"
                                            onError={(e: any) => e.target.style.display = 'none'} />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                                        <p className="text-sm font-bold" style={{ color: primaryColor }}>{currency}{(item.price * item.qty).toFixed(0)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => updateQty(item.id, -1)}
                                            className="w-7 h-7 rounded-lg border flex items-center justify-center text-gray-600 hover:bg-white">
                                            <Minus size={12} />
                                        </button>
                                        <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)}
                                            className="w-7 h-7 rounded-lg text-white flex items-center justify-center"
                                            style={{ background: primaryColor }}>
                                            <Plus size={12} />
                                        </button>
                                        <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center">
                                            <X size={12} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-4 border-t space-y-3">
                                {/* Coupon input */}
                                <div>
                                    {appliedCoupon ? (
                                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Tag size={14} className="text-green-600" />
                                                <span className="text-sm font-medium text-green-700">{appliedCoupon.code}</span>
                                                <span className="text-xs text-green-600">-{currency}{discountAmount}</span>
                                            </div>
                                            <button onClick={removeCoupon} className="text-green-600 hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input type="text" value={couponCode}
                                                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                placeholder="Coupon code"
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2"
                                                style={{ '--tw-ring-color': primaryColor } as any}
                                                onKeyDown={e => e.key === 'Enter' && applyCoupon()} />
                                            <button onClick={applyCoupon} disabled={validatingCoupon}
                                                className="px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all disabled:opacity-50"
                                                style={{ borderColor: primaryColor, color: primaryColor }}>
                                                {validatingCoupon ? '...' : 'Apply'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Subtotal</span>
                                        <span>{currency}{cartTotal.toFixed(0)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Discount</span>
                                            <span>-{currency}{discountAmount}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold text-gray-800 pt-1 border-t">
                                        <span>Total</span>
                                        <span style={{ color: primaryColor }}>{currency}{finalTotal.toFixed(0)}</span>
                                    </div>
                                </div>
                                <button onClick={() => { setShowCart(false); setShowOrderForm(true); }}
                                    className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                                    style={{ background: primaryColor }}>
                                    Proceed to Order <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── ORDER FORM MODAL ── */}
            {showOrderForm && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-md sm:rounded-2xl shadow-2xl max-h-screen overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="font-bold text-gray-800">Complete Your Order</h2>
                                <p className="text-xs text-gray-500">Total: {currency}{finalTotal.toFixed(0)}{discountAmount > 0 && ` (saved ${currency}${discountAmount})`}</p>
                            </div>
                            <button onClick={() => setShowOrderForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Order summary mini */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm text-gray-700">
                                        <span>{item.name} x {item.qty}</span>
                                        <span className="font-medium">{currency}{(item.price * item.qty).toFixed(0)}</span>
                                    </div>
                                ))}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Coupon ({appliedCoupon?.code})</span>
                                        <span>-{currency}{discountAmount}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-gray-800 pt-1.5 border-t border-gray-200">
                                    <span>Total</span>
                                    <span style={{ color: primaryColor }}>{currency}{finalTotal.toFixed(0)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                                <input type="text" value={orderForm.customer_name}
                                    onChange={e => setOrderForm(f => ({ ...f, customer_name: e.target.value }))}
                                    placeholder="Full name"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-sm"
                                    style={{ '--tw-ring-color': primaryColor } as any} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input type="tel" value={orderForm.customer_phone}
                                    onChange={e => setOrderForm(f => ({ ...f, customer_phone: e.target.value }))}
                                    placeholder="e.g. 9876543210"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-sm"
                                    style={{ '--tw-ring-color': primaryColor } as any} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                                <input type="email" value={orderForm.customer_email}
                                    onChange={e => setOrderForm(f => ({ ...f, customer_email: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-sm"
                                    style={{ '--tw-ring-color': primaryColor } as any} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <MapPin size={12} /> Delivery Address
                                </label>
                                <textarea rows={2} value={orderForm.customer_address}
                                    onChange={e => setOrderForm(f => ({ ...f, customer_address: e.target.value }))}
                                    placeholder="House/flat, street, area, city..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-sm resize-none"
                                    style={{ '--tw-ring-color': primaryColor } as any} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                                <input type="text" value={orderForm.notes}
                                    onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Any special instructions..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 text-sm"
                                    style={{ '--tw-ring-color': primaryColor } as any} />
                            </div>

                            {storeSettings?.whatsapp_number && (
                                <p className="text-xs text-gray-500 text-center">
                                    We'll confirm your order via WhatsApp on {storeSettings.whatsapp_number}
                                </p>
                            )}

                            <button onClick={placeOrder} disabled={placingOrder}
                                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90"
                                style={{ background: primaryColor }}>
                                {placingOrder ? 'Placing Order...' : `Place Order · ${currency}${finalTotal.toFixed(0)}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
