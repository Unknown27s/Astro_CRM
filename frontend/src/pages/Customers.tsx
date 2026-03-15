import { useState, useEffect } from 'react';
import { customers, purchases } from '../services/api';
import toast from 'react-hot-toast';
import {
    Users,
    Phone,
    Mail,
    MapPin,
    ShoppingBag,
    Plus,
    Search,
    TrendingUp,
    Edit2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner, EmptyState } from '../components/ui/Avatar';

export default function Customers() {
    const [customerList, setCustomerList] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerPurchases, setCustomerPurchases] = useState<any[]>([]);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [showEditCustomer, setShowEditCustomer] = useState(false);
    const [showAddPurchase, setShowAddPurchase] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);

    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        location: '',
        notes: '',
    });

    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
        location: '',
        notes: '',
        status: 'Active',
    });

    const [newPurchase, setNewPurchase] = useState({
        items: [{ name: '', qty: 1, price: 0 }],
        payment_method: 'Cash',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    useEffect(() => {
        fetchCustomers();
    }, [statusFilter]);

    const fetchCustomers = async () => {
        setListLoading(true);
        try {
            const response = await customers.getAll({ search: searchTerm, status: statusFilter });
            setCustomerList(response.data.customers || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setListLoading(false);
        }
    };

    const handleSelectCustomer = async (customer: any) => {
        setSelectedCustomer(customer);
        try {
            const response = await customers.getOne(customer.id);
            setCustomerPurchases(response.data.purchases || []);
        } catch (error) {
            console.error('Error fetching customer details:', error);
            toast.error('Failed to load customer details');
        }
    };

    const handleAddCustomer = async () => {
        if (!newCustomer.name.trim()) {
            toast.error('Customer name is required');
            return;
        }

        setLoading(true);
        try {
            await customers.create(newCustomer);
            setShowAddCustomer(false);
            setNewCustomer({ name: '', phone: '', email: '', location: '', notes: '' });
            await fetchCustomers();
            toast.success('Customer added successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error adding customer');
        } finally {
            setLoading(false);
        }
    };

    const openEditCustomer = (customer: any) => {
        setEditForm({
            name: customer.name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            location: customer.location || '',
            notes: customer.notes || '',
            status: customer.status || 'Active',
        });
        setShowEditCustomer(true);
    };

    const handleEditCustomer = async () => {
        if (!editForm.name.trim()) {
            toast.error('Customer name is required');
            return;
        }
        if (!selectedCustomer) return;

        setLoading(true);
        try {
            await customers.update(selectedCustomer.id, editForm);
            setShowEditCustomer(false);
            await fetchCustomers();
            const updated = { ...selectedCustomer, ...editForm };
            setSelectedCustomer(updated);
            toast.success('Customer updated successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error updating customer');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPurchase = async () => {
        if (!selectedCustomer) return;

        const validItems = newPurchase.items.filter(item => item.name.trim() && item.qty > 0);
        if (validItems.length === 0) {
            toast.error('At least one item is required');
            return;
        }

        const totalAmount = validItems.reduce((sum, item) => sum + item.qty * item.price, 0);

        setLoading(true);
        try {
            await purchases.create({
                customer_id: selectedCustomer.id,
                items: validItems,
                total_amount: totalAmount,
                payment_method: newPurchase.payment_method,
                purchase_date: newPurchase.purchase_date,
                notes: newPurchase.notes,
            });
            setShowAddPurchase(false);
            setNewPurchase({
                items: [{ name: '', qty: 1, price: 0 }],
                payment_method: 'Cash',
                purchase_date: new Date().toISOString().split('T')[0],
                notes: '',
            });
            await handleSelectCustomer(selectedCustomer);
            await fetchCustomers();
            toast.success('Purchase added successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error adding purchase');
        } finally {
            setLoading(false);
        }
    };

    const addPurchaseItem = () => {
        setNewPurchase({
            ...newPurchase,
            items: [...newPurchase.items, { name: '', qty: 1, price: 0 }],
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

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'VIP':
                return 'default';
            case 'Active':
                return 'success';
            case 'Inactive':
                return 'secondary';
            default:
                return 'secondary';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Customers</h1>
                    <p className="text-neutral-500 mt-1">Manage customer profiles and purchase history</p>
                </div>
                <Button onClick={() => setShowAddCustomer(true)} size="lg" className="gap-2">
                    <Plus size={20} />
                    Add Customer
                </Button>
            </div>

            {/* Search and Filter */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
                            <Input
                                type="text"
                                placeholder="Search customers by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && fetchCustomers()}
                                className="pl-10"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="">All Status</option>
                            <option value="Active">Active</option>
                            <option value="VIP">VIP</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <Button onClick={fetchCustomers} variant="outline">
                            <Search size={20} />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer List */}
                <div>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg">Customer List</CardTitle>
                            <CardDescription>{customerList.length} customers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {listLoading ? (
                                <div className="flex justify-center py-8">
                                    <Spinner size="md" />
                                </div>
                            ) : customerList.length > 0 ? (
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {customerList.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedCustomer?.id === customer.id
                                                    ? 'border-primary-500 bg-primary-50'
                                                    : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h3 className="font-semibold text-neutral-900 truncate">{customer.name}</h3>
                                                <Badge variant={getStatusBadgeVariant(customer.status)} className="text-xs whitespace-nowrap">
                                                    {customer.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-neutral-500 truncate">{customer.email || customer.phone}</p>
                                            <div className="text-sm font-medium text-success-600 mt-1">
                                                ₹{customer.total_spent?.toFixed(0) || '0'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title="No customers found" description="Add a new customer to get started" />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Customer Details */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        {selectedCustomer ? (
                            <>
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <CardTitle>{selectedCustomer.name}</CardTitle>
                                            <CardDescription>Customer ID: {selectedCustomer.id}</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditCustomer(selectedCustomer)}
                                                className="gap-2"
                                            >
                                                <Edit2 size={16} />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => setShowAddPurchase(true)}
                                                className="gap-2"
                                            >
                                                <Plus size={16} />
                                                Purchase
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Contact Info */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-900 mb-3">Contact Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedCustomer.phone && (
                                                <div className="flex items-start gap-3">
                                                    <Phone className="text-primary-600 mt-0.5" size={18} />
                                                    <div>
                                                        <p className="text-xs text-neutral-500">Phone</p>
                                                        <p className="font-medium text-neutral-900"> {selectedCustomer.phone}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedCustomer.email && (
                                                <div className="flex items-start gap-3">
                                                    <Mail className="text-primary-600 mt-0.5" size={18} />
                                                    <div>
                                                        <p className="text-xs text-neutral-500">Email</p>
                                                        <p className="font-medium text-neutral-900 truncate">{selectedCustomer.email}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedCustomer.location && (
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="text-primary-600 mt-0.5" size={18} />
                                                    <div>
                                                        <p className="text-xs text-neutral-500">Location</p>
                                                        <p className="font-medium text-neutral-900">{selectedCustomer.location}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-start gap-3">
                                                <ShoppingBag className="text-primary-600 mt-0.5" size={18} />
                                                <div>
                                                    <p className="text-xs text-neutral-500">Purchases</p>
                                                    <p className="font-medium text-neutral-900">{selectedCustomer.total_purchases || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-neutral-600">Total Spent</p>
                                                <p className="text-2xl font-bold text-primary-600">₹{selectedCustomer.total_spent?.toFixed(0) || '0'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-600">Last Purchase</p>
                                                <p className="text-lg font-medium text-neutral-900">{selectedCustomer.last_purchase_date || 'Never'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Purchase History */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                            <TrendingUp size={16} />
                                            Purchase History
                                        </h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {customerPurchases.length > 0 ? (
                                                customerPurchases.map((purchase: any) => (
                                                    <div key={purchase.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <p className="text-xs text-neutral-500">{purchase.purchase_date}</p>
                                                                <p className="font-bold text-success-600">₹{purchase.total_amount.toFixed(2)}</p>
                                                            </div>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {purchase.payment_method || 'Cash'}
                                                            </Badge>
                                                        </div>
                                                        {JSON.parse(purchase.items || '[]').length > 0 && (
                                                            <p className="text-xs text-neutral-600 mt-2 truncate">
                                                                {JSON.parse(purchase.items || '[]')
                                                                    .map((item: any) => `${item.name} (${item.qty})`)
                                                                    .join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-neutral-500 py-4 text-sm">No purchases yet</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        ) : (
                            <CardContent className="flex flex-col items-center justify-center h-96">
                                <EmptyState
                                    icon={<Users size={48} className="text-neutral-400" />}
                                    title="Select a customer"
                                    description="Choose a customer from the list to view details"
                                />
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>

            {/* Add Customer Modal */}
            <Modal
                isOpen={showAddCustomer}
                onClose={() => setShowAddCustomer(false)}
                title="Add New Customer"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddCustomer(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddCustomer} disabled={loading}>
                            {loading ? 'Adding...' : 'Add Customer'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name">Customer Name *</Label>
                        <Input
                            id="name"
                            placeholder="John Doe"
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+91 9876543210"
                            value={newCustomer.phone}
                            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={newCustomer.email}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            placeholder="City, Country"
                            value={newCustomer.location}
                            onChange={(e) => setNewCustomer({ ...newCustomer, location: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="notes">Notes</Label>
                        <textarea
                            id="notes"
                            placeholder="Additional notes..."
                            value={newCustomer.notes}
                            onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={3}
                        />
                    </div>
                </div>
            </Modal>

            {/* Edit Customer Modal */}
            <Modal
                isOpen={showEditCustomer}
                onClose={() => setShowEditCustomer(false)}
                title="Edit Customer"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowEditCustomer(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditCustomer} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="edit-name">Name *</Label>
                        <Input
                            id="edit-name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="edit-phone">Phone</Label>
                        <Input
                            id="edit-phone"
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                            id="edit-email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="edit-location">Location</Label>
                        <Input
                            id="edit-location"
                            value={editForm.location}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        />
                    </div>
                    <div>
                        <Label htmlFor="edit-status">Status</Label>
                        <select
                            id="edit-status"
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="Active">Active</option>
                            <option value="VIP">VIP</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="edit-notes">Notes</Label>
                        <textarea
                            id="edit-notes"
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={3}
                        />
                    </div>
                </div>
            </Modal>

            {/* Add Purchase Modal */}
            <Modal
                isOpen={showAddPurchase}
                onClose={() => setShowAddPurchase(false)}
                title="Add Purchase"
                size="lg"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddPurchase(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddPurchase} disabled={loading}>
                            {loading ? 'Adding...' : 'Add Purchase'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                    {/* Items */}
                    <div>
                        <Label className="mb-3 block">Items</Label>
                        <div className="space-y-3">
                            {newPurchase.items.map((item, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder="Item name"
                                        value={item.name}
                                        onChange={(e) => updatePurchaseItem(index, 'name', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.qty}
                                        onChange={(e) => updatePurchaseItem(index, 'qty', Number(e.target.value))}
                                        className="w-20"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={(e) => updatePurchaseItem(index, 'price', Number(e.target.value))}
                                        className="w-24"
                                    />
                                    {newPurchase.items.length > 1 && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => removePurchaseItem(index)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addPurchaseItem}
                            className="mt-3 w-full"
                        >
                            <Plus size={16} className="mr-2" />
                            Add Item
                        </Button>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="payment-method">Payment Method</Label>
                            <select
                                id="payment-method"
                                value={newPurchase.payment_method}
                                onChange={(e) => setNewPurchase({ ...newPurchase, payment_method: e.target.value })}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            >
                                <option>Cash</option>
                                <option>Card</option>
                                <option>UPI</option>
                                <option>Net Banking</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="purchase-date">Purchase Date</Label>
                            <Input
                                id="purchase-date"
                                type="date"
                                value={newPurchase.purchase_date}
                                onChange={(e) => setNewPurchase({ ...newPurchase, purchase_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="purchase-notes">Notes</Label>
                        <textarea
                            id="purchase-notes"
                            placeholder="Additional notes..."
                            value={newPurchase.notes}
                            onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={2}
                        />
                    </div>

                    {/* Total */}
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-neutral-900">Total Amount:</span>
                            <span className="text-2xl font-bold text-primary-600">
                                ₹{newPurchase.items.reduce((sum, item) => sum + item.qty * item.price, 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
