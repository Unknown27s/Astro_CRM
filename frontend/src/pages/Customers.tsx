import { useState, useEffect } from 'react';
import { customers, purchases } from '../services/api';
import { Users, Phone, Mail, MapPin, ShoppingBag, Plus, Search, Filter, DollarSign } from 'lucide-react';

export default function Customers() {
    const [customerList, setCustomerList] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerPurchases, setCustomerPurchases] = useState<any[]>([]);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [showAddPurchase, setShowAddPurchase] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        location: '',
        notes: ''
    });

    const [newPurchase, setNewPurchase] = useState({
        items: [{ name: '', qty: 1, price: 0 }],
        payment_method: 'Cash',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, [statusFilter]);

    const fetchCustomers = async () => {
        try {
            const response = await customers.getAll({ search: searchTerm, status: statusFilter });
            setCustomerList(response.data.customers || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleSelectCustomer = async (customer: any) => {
        setSelectedCustomer(customer);
        try {
            const response = await customers.getOne(customer.id);
            setCustomerPurchases(response.data.purchases || []);
        } catch (error) {
            console.error('Error fetching customer details:', error);
        }
    };

    const handleAddCustomer = async () => {
        if (!newCustomer.name.trim()) {
            alert('Customer name is required');
            return;
        }

        setLoading(true);
        try {
            await customers.create(newCustomer);
            setShowAddCustomer(false);
            setNewCustomer({ name: '', phone: '', email: '', location: '', notes: '' });
            fetchCustomers();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error adding customer');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPurchase = async () => {
        if (!selectedCustomer) return;

        const validItems = newPurchase.items.filter(item => item.name.trim() && item.qty > 0);
        if (validItems.length === 0) {
            alert('At least one item is required');
            return;
        }

        const totalAmount = validItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

        setLoading(true);
        try {
            await purchases.create({
                customer_id: selectedCustomer.id,
                items: validItems,
                total_amount: totalAmount,
                payment_method: newPurchase.payment_method,
                purchase_date: newPurchase.purchase_date,
                notes: newPurchase.notes
            });
            setShowAddPurchase(false);
            setNewPurchase({
                items: [{ name: '', qty: 1, price: 0 }],
                payment_method: 'Cash',
                purchase_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            handleSelectCustomer(selectedCustomer);
            fetchCustomers();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error adding purchase');
        } finally {
            setLoading(false);
        }
    };

    const addPurchaseItem = () => {
        setNewPurchase({
            ...newPurchase,
            items: [...newPurchase.items, { name: '', qty: 1, price: 0 }]
        });
    };

    const updatePurchaseItem = (index: number, field: string, value: any) => {
        const updated = [...newPurchase.items];
        updated[index] = { ...updated[index], [field]: value };
        setNewPurchase({ ...newPurchase, items: updated });
    };

    const removePurchaseItem = (index: number) => {
        const updated = newPurchase.items.filter((_, i) => i !== index);
        setNewPurchase({ ...newPurchase, items: updated });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'VIP': return 'bg-purple-100 text-purple-800';
            case 'Active': return 'bg-green-100 text-green-800';
            case 'Inactive': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
                    <p className="text-gray-600 mt-1">Manage customer profiles and purchase history</p>
                </div>
                <button
                    onClick={() => setShowAddCustomer(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                    <Plus size={20} />
                    Add Customer
                </button>
            </div>

            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-md p-4 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && fetchCustomers()}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="VIP">VIP</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
                <button
                    onClick={fetchCustomers}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Search
                </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Customer List */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Customer List</h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {customerList.map((customer) => (
                            <div
                                key={customer.id}
                                onClick={() => handleSelectCustomer(customer)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedCustomer?.id === customer.id
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-gray-200 hover:border-indigo-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(customer.status)}`}>
                                        {customer.status}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                    {customer.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} />
                                            {customer.phone}
                                        </div>
                                    )}
                                    {customer.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} />
                                            {customer.location}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 font-medium text-green-600">
                                        <DollarSign size={14} />
                                        ₹{customer.total_spent?.toFixed(2) || '0'} ({customer.total_purchases || 0} purchases)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Customer Details */}
                <div className="col-span-2 bg-white rounded-xl shadow-md p-6">
                    {selectedCustomer ? (
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">{selectedCustomer.name}</h2>
                                    <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full ${getStatusColor(selectedCustomer.status)}`}>
                                        {selectedCustomer.status}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowAddPurchase(true)}
                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    Add Purchase
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {selectedCustomer.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="text-indigo-600" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-500">Phone</p>
                                            <p className="font-medium">{selectedCustomer.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedCustomer.email && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="text-indigo-600" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-500">Email</p>
                                            <p className="font-medium">{selectedCustomer.email}</p>
                                        </div>
                                    </div>
                                )}
                                {selectedCustomer.location && (
                                    <div className="flex items-center gap-3">
                                        <MapPin className="text-indigo-600" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-500">Location</p>
                                            <p className="font-medium">{selectedCustomer.location}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <ShoppingBag className="text-indigo-600" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-500">Total Purchases</p>
                                        <p className="font-medium">{selectedCustomer.total_purchases || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Total Spent</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            ₹{selectedCustomer.total_spent?.toFixed(2) || '0'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Last Purchase</p>
                                        <p className="text-lg font-medium text-gray-800">
                                            {selectedCustomer.last_purchase_date || 'Never'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-4">Purchase History</h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                {customerPurchases.length > 0 ? (
                                    customerPurchases.map((purchase) => (
                                        <div key={purchase.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-sm text-gray-500">{purchase.purchase_date}</p>
                                                    <p className="text-lg font-bold text-green-600">
                                                        ₹{purchase.total_amount.toFixed(2)}
                                                    </p>
                                                </div>
                                                <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                                                    {purchase.payment_method || 'Cash'}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {JSON.parse(purchase.items || '[]').map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span>{item.name} × {item.qty}</span>
                                                        <span className="font-medium">₹{(item.qty * item.price).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {purchase.notes && (
                                                <p className="mt-2 text-sm text-gray-500 italic">{purchase.notes}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No purchases yet</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Users size={64} />
                            <p className="mt-4 text-lg">Select a customer to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Customer Modal */}
            {showAddCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Customer</h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Customer Name *"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="tel"
                                placeholder="Phone"
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="text"
                                placeholder="Location"
                                value={newCustomer.location}
                                onChange={(e) => setNewCustomer({ ...newCustomer, location: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <textarea
                                placeholder="Notes"
                                value={newCustomer.notes}
                                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddCustomer(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCustomer}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Customer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Purchase Modal */}
            {showAddPurchase && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Add Purchase</h2>
                        
                        <div className="space-y-4 mb-6">
                            <h3 className="font-semibold text-gray-700">Items</h3>
                            {newPurchase.items.map((item, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <input
                                        type="text"
                                        placeholder="Item name"
                                        value={item.name}
                                        onChange={(e) => updatePurchaseItem(index, 'name', e.target.value)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.qty}
                                        onChange={(e) => updatePurchaseItem(index, 'qty', Number(e.target.value))}
                                        className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={(e) => updatePurchaseItem(index, 'price', Number(e.target.value))}
                                        className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {newPurchase.items.length > 1 && (
                                        <button
                                            onClick={() => removePurchaseItem(index)}
                                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={addPurchaseItem}
                                className="text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                + Add Item
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <select
                                    value={newPurchase.payment_method}
                                    onChange={(e) => setNewPurchase({ ...newPurchase, payment_method: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option>Cash</option>
                                    <option>Card</option>
                                    <option>UPI</option>
                                    <option>Net Banking</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                                <input
                                    type="date"
                                    value={newPurchase.purchase_date}
                                    onChange={(e) => setNewPurchase({ ...newPurchase, purchase_date: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <textarea
                            placeholder="Notes (optional)"
                            value={newPurchase.notes}
                            onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-4"
                            rows={2}
                        />

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                                <span className="text-2xl font-bold text-green-600">
                                    ₹{newPurchase.items.reduce((sum, item) => sum + (item.qty * item.price), 0).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddPurchase(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPurchase}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Purchase'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
