import { useState, useEffect } from 'react';
import { customers, purchases, notes, activities } from '../services/api';
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
    Trash2,
    Handshake,
    Trophy,
    XCircle,
    MessageSquare,
    Pin,
    Send,
    CalendarCheck,
    CheckCircle2,
    Clock,
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
    const [customerDeals, setCustomerDeals] = useState<any[]>([]);
    const [dealSummary, setDealSummary] = useState<any>({});
    const [customerNotes, setCustomerNotes] = useState<any[]>([]);
    const [newNoteText, setNewNoteText] = useState('');
    const [newNoteType, setNewNoteType] = useState('general');
    const [notesLoading, setNotesLoading] = useState(false);
    const [customerActivities, setCustomerActivities] = useState<any[]>([]);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [showEditCustomer, setShowEditCustomer] = useState(false);
    const [showAddPurchase, setShowAddPurchase] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(true);
    const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set()); // Bulk delete
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk' | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const itemsPerPage = 50;

    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        location: '',
        notes: '',
        customer_type: 'buyer',
    });

    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        email: '',
        location: '',
        notes: '',
        status: 'Active',
        customer_type: 'buyer',
    });

    const [newPurchase, setNewPurchase] = useState({
        items: [{ name: '', qty: 1, price: 0 }],
        payment_method: 'Cash',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    useEffect(() => {
        setCurrentPage(0);
        fetchCustomers(0);
    }, [statusFilter]);

    const fetchCustomers = async (page: number = 0) => {
        setListLoading(true);
        try {
            const offset = page * itemsPerPage;
            const response = await customers.getAll({
                search: searchTerm,
                status: statusFilter,
                limit: itemsPerPage,
                offset: offset
            });
            setCustomerList(response.data.customers || []);
            setTotalCustomers(response.data.total || 0);
            setCurrentPage(page);
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
            setCustomerDeals(response.data.deals || []);
            setDealSummary(response.data.dealSummary || {});
        } catch (error) {
            console.error('Error fetching customer details:', error);
            toast.error('Failed to load customer details');
        }
        // Fetch notes and activities separately
        fetchCustomerNotes(customer.id);
        fetchCustomerActivities(customer.id);
    };

    const fetchCustomerActivities = async (customerId: number) => {
        try {
            const res = await activities.getByCustomer(customerId);
            setCustomerActivities(res.data.activities || []);
        } catch { /* ignore */ }
    };

    const fetchCustomerNotes = async (customerId: number) => {
        setNotesLoading(true);
        try {
            const res = await notes.getByCustomer(customerId);
            setCustomerNotes(res.data.notes || []);
        } catch { /* ignore */ }
        finally { setNotesLoading(false); }
    };

    const handleAddNote = async () => {
        if (!newNoteText.trim() || !selectedCustomer) return;
        try {
            await notes.create({ customer_id: selectedCustomer.id, note_type: newNoteType, content: newNoteText });
            setNewNoteText('');
            setNewNoteType('general');
            toast.success('Note added');
            fetchCustomerNotes(selectedCustomer.id);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to add note');
        }
    };

    const handleTogglePin = async (noteId: number) => {
        try {
            await notes.togglePin(noteId);
            if (selectedCustomer) fetchCustomerNotes(selectedCustomer.id);
        } catch { toast.error('Failed to toggle pin'); }
    };

    const handleDeleteNote = async (noteId: number) => {
        try {
            await notes.delete(noteId);
            toast.success('Note deleted');
            if (selectedCustomer) fetchCustomerNotes(selectedCustomer.id);
        } catch { toast.error('Failed to delete note'); }
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
            setNewCustomer({ name: '', phone: '', email: '', location: '', notes: '', customer_type: 'buyer' });
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
            customer_type: customer.customer_type || 'buyer',
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

    const handleDeleteCustomer = async (customerId: number) => {
        setLoading(true);
        try {
            await customers.delete(customerId);
            if (selectedCustomer?.id === customerId) {
                setSelectedCustomer(null);
            }
            await fetchCustomers();
            toast.success('Customer deleted successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error deleting customer');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            const ids = Array.from(selectedForDelete);
            for (const id of ids) {
                try {
                    await customers.delete(id);
                } catch (error) {
                    console.error(`Error deleting customer ${id}:`, error);
                }
            }
            setSelectedForDelete(new Set());
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
            if (selectedCustomer && selectedForDelete.has(selectedCustomer.id)) {
                setSelectedCustomer(null);
            }
            await fetchCustomers();
            toast.success(`${ids.length} customer(s) deleted successfully`);
        } catch (error: any) {
            toast.error('Error deleting customers');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectForDelete = (customerId: number) => {
        const newSet = new Set(selectedForDelete);
        if (newSet.has(customerId)) {
            newSet.delete(customerId);
        } else {
            newSet.add(customerId);
        }
        setSelectedForDelete(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedForDelete.size === customerList.length) {
            setSelectedForDelete(new Set());
        } else {
            setSelectedForDelete(new Set(customerList.map((c) => c.id)));
        }
    };

    const handleAddPurchase = async () => {
        if (!selectedCustomer) return;

        const validItems = newPurchase.items.filter(item => item.name.trim() && item.qty > 0);
        if (validItems.length === 0) {
            toast.error('At least one item is required');
            return;
        }

        const totalAmount = validItems.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);

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
                                onKeyPress={(e) => e.key === 'Enter' && fetchCustomers(0)}
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
                        <Button onClick={() => fetchCustomers(currentPage)} variant="outline">
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
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg">Customer List</CardTitle>
                                    <CardDescription>{customerList.length} customers</CardDescription>
                                </div>
                                {selectedForDelete.size > 0 && (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => {
                                            setDeleteTarget('bulk');
                                            setShowDeleteConfirm(true);
                                        }}
                                    >
                                        <Trash2 size={16} className="mr-1" />
                                        Delete ({selectedForDelete.size})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {listLoading ? (
                                <div className="flex justify-center py-8">
                                    <Spinner size="md" />
                                </div>
                            ) : customerList.length > 0 ? (
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {selectedForDelete.size > 0 && (
                                        <button
                                            onClick={toggleSelectAll}
                                            className="w-full text-left p-3 rounded-lg border-2 border-primary-300 bg-primary-50 flex items-center gap-2 mb-2"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedForDelete.size === customerList.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm font-medium">
                                                {selectedForDelete.size === customerList.length ? 'Deselect All' : 'Select All'}
                                            </span>
                                        </button>
                                    )}
                                    {customerList.map((customer) => (
                                        <div key={customer.id} className="flex gap-2 items-center">
                                            {selectedForDelete.size > 0 && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedForDelete.has(customer.id)}
                                                    onChange={() => toggleSelectForDelete(customer.id)}
                                                    className="w-4 h-4 rounded"
                                                />
                                            )}
                                            <button
                                                onClick={() => handleSelectCustomer(customer)}
                                                className={`flex-1 text-left p-3 rounded-lg border-2 transition-all ${selectedCustomer?.id === customer.id
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
                                                    ₹{Number(customer.total_spent || 0).toFixed(0)}
                                                </div>
                                            </button>
                                            {!selectedForDelete.has(customer.id) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setDeleteTarget('single');
                                                        setShowDeleteConfirm(true);
                                                    }}
                                                    className="p-2 hover:bg-danger-50 hover:text-danger-600 rounded-lg transition-all"
                                                    title="Delete customer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title="No customers found" description="Add a new customer to get started" />
                            )}
                        </CardContent>
                        {/* Pagination */}
                        {customerList.length > 0 && totalCustomers > itemsPerPage && (
                            <div className="border-t border-neutral-200 px-6 py-3 flex items-center justify-between bg-neutral-50">
                                <div className="text-sm text-neutral-600">
                                    Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalCustomers)} of {totalCustomers} customers
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchCustomers(currentPage - 1)}
                                        disabled={currentPage === 0}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchCustomers(currentPage + 1)}
                                        disabled={(currentPage + 1) * itemsPerPage >= totalCustomers}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
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
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => {
                                                    setDeleteTarget('single');
                                                    setShowDeleteConfirm(true);
                                                }}
                                                className="gap-2"
                                            >
                                                <Trash2 size={16} />
                                                Delete
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
                                                <p className="text-2xl font-bold text-primary-600">₹{Number(selectedCustomer.total_spent || 0).toFixed(0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-600">Last Purchase</p>
                                                <p className="text-lg font-medium text-neutral-900">{selectedCustomer.last_purchase_date || 'Never'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deals & Pipeline */}
                                    {(customerDeals.length > 0 || dealSummary.total_deals > 0) && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                                <Handshake size={16} />
                                                Deals & Pipeline
                                            </h3>
                                            {/* Deal stats row */}
                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
                                                    <Trophy size={16} className="mx-auto text-emerald-600 mb-1" />
                                                    <p className="text-lg font-bold text-emerald-700">{dealSummary.won_deals || 0}</p>
                                                    <p className="text-[10px] text-emerald-600">Won (₹{Number(dealSummary.won_value || 0).toLocaleString('en-IN')})</p>
                                                </div>
                                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                                                    <Handshake size={16} className="mx-auto text-blue-600 mb-1" />
                                                    <p className="text-lg font-bold text-blue-700">{dealSummary.active_deals || 0}</p>
                                                    <p className="text-[10px] text-blue-600">Active (₹{Number(dealSummary.pipeline_value || 0).toLocaleString('en-IN')})</p>
                                                </div>
                                                <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                                                    <XCircle size={16} className="mx-auto text-red-600 mb-1" />
                                                    <p className="text-lg font-bold text-red-700">{dealSummary.lost_deals || 0}</p>
                                                    <p className="text-[10px] text-red-600">Lost</p>
                                                </div>
                                            </div>
                                            {/* Deals list */}
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {customerDeals.map((deal: any) => {
                                                    const stageColors: Record<string, string> = {
                                                        Lead: 'bg-neutral-100 text-neutral-700',
                                                        Qualified: 'bg-blue-100 text-blue-700',
                                                        Proposal: 'bg-purple-100 text-purple-700',
                                                        Negotiation: 'bg-amber-100 text-amber-700',
                                                        'Closed Won': 'bg-emerald-100 text-emerald-700',
                                                        'Closed Lost': 'bg-red-100 text-red-700',
                                                    };
                                                    return (
                                                        <div key={deal.id} className="flex items-center gap-3 p-2 rounded-lg border border-neutral-200 bg-white hover:border-primary-300 transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-neutral-900 truncate">{deal.title}</p>
                                                                <p className="text-xs text-neutral-500">₹{Number(deal.value || 0).toLocaleString('en-IN')}</p>
                                                            </div>
                                                            <Badge className={`text-[10px] px-2 py-0.5 ${stageColors[deal.stage] || 'bg-neutral-100 text-neutral-600'}`}>
                                                                {deal.stage}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes / Interactions */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                            <MessageSquare size={16} />
                                            Notes & Interactions
                                        </h3>
                                        {/* Add note form */}
                                        <div className="flex gap-2 mb-3">
                                            <select
                                                value={newNoteType}
                                                onChange={e => setNewNoteType(e.target.value)}
                                                className="px-2 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="general">General</option>
                                                <option value="call_log">Call Log</option>
                                                <option value="meeting_notes">Meeting</option>
                                                <option value="complaint">Complaint</option>
                                                <option value="feedback">Feedback</option>
                                                <option value="internal">Internal</option>
                                            </select>
                                            <input
                                                value={newNoteText}
                                                onChange={e => setNewNoteText(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                                placeholder="Write a note..."
                                                className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                            <Button size="sm" onClick={handleAddNote} disabled={!newNoteText.trim()} title="Add note">
                                                <Send size={14} />
                                            </Button>
                                        </div>
                                        {/* Notes list */}
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {notesLoading ? (
                                                <p className="text-xs text-neutral-400 text-center py-3">Loading notes...</p>
                                            ) : customerNotes.length > 0 ? (
                                                customerNotes.map((note: any) => {
                                                    const typeLabels: Record<string, { label: string; color: string }> = {
                                                        general: { label: 'General', color: 'bg-neutral-100 text-neutral-600' },
                                                        call_log: { label: 'Call', color: 'bg-blue-100 text-blue-700' },
                                                        meeting_notes: { label: 'Meeting', color: 'bg-purple-100 text-purple-700' },
                                                        complaint: { label: 'Complaint', color: 'bg-red-100 text-red-700' },
                                                        feedback: { label: 'Feedback', color: 'bg-amber-100 text-amber-700' },
                                                        internal: { label: 'Internal', color: 'bg-cyan-100 text-cyan-700' },
                                                    };
                                                    const meta = typeLabels[note.note_type] || typeLabels.general;
                                                    return (
                                                        <div key={note.id} className={`p-2.5 rounded-lg border transition-all ${
                                                            note.is_pinned ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-white'
                                                        }`}>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 mb-1">
                                                                        <Badge className={`text-[10px] px-1.5 py-0 ${meta.color}`}>{meta.label}</Badge>
                                                                        {note.is_pinned && <Pin size={10} className="text-amber-500" />}
                                                                        <span className="text-[10px] text-neutral-400">
                                                                            {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-neutral-700 whitespace-pre-wrap">{note.content}</p>
                                                                    {note.author_name && (
                                                                        <p className="text-[10px] text-neutral-400 mt-1">— {note.author_name}</p>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-0.5 flex-shrink-0">
                                                                    <button onClick={() => handleTogglePin(note.id)} className="p-1 hover:bg-amber-100 rounded transition-colors" title="Pin">
                                                                        <Pin size={12} className={note.is_pinned ? 'text-amber-500' : 'text-neutral-300'} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                                        <Trash2 size={12} className="text-neutral-300" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-xs text-neutral-400 text-center py-3">No notes yet — add one above</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Activities / Follow-ups */}
                                    {customerActivities.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                                <CalendarCheck size={16} />
                                                Activities & Follow-Ups
                                                <Badge variant="secondary" className="text-[10px]">{customerActivities.length}</Badge>
                                            </h3>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {customerActivities.map((act: any) => {
                                                    const typeColors: Record<string, string> = {
                                                        call: 'bg-blue-100 text-blue-700',
                                                        meeting: 'bg-purple-100 text-purple-700',
                                                        email: 'bg-cyan-100 text-cyan-700',
                                                        task: 'bg-amber-100 text-amber-700',
                                                        follow_up: 'bg-emerald-100 text-emerald-700',
                                                        note: 'bg-neutral-100 text-neutral-600',
                                                    };
                                                    const isOverdue = !act.completed && act.due_date && new Date(act.due_date) < new Date();
                                                    return (
                                                        <div key={act.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                                            act.completed ? 'border-neutral-200 bg-neutral-50 opacity-60' :
                                                            isOverdue ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-white'
                                                        }`}>
                                                            {act.completed ? (
                                                                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                            ) : (
                                                                <Clock size={14} className={`flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-neutral-400'}`} />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-xs font-medium truncate ${act.completed ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                                                                    {act.subject}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <Badge className={`text-[9px] px-1 py-0 ${typeColors[act.type] || 'bg-neutral-100 text-neutral-600'}`}>
                                                                        {act.type}
                                                                    </Badge>
                                                                    {act.due_date && (
                                                                        <span className={`text-[10px] ${isOverdue ? 'text-red-600 font-medium' : 'text-neutral-400'}`}>
                                                                            {new Date(act.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                            {isOverdue && ' (overdue)'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Purchase History */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                                            <TrendingUp size={16} />
                                            Purchase History & Breakdown
                                        </h3>
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {customerPurchases.length > 0 ? (
                                                customerPurchases.map((purchase: any) => {
                                                    const items = Array.isArray(purchase.items) ? purchase.items : (() => { try { return JSON.parse(purchase.items || '[]'); } catch { return []; } })();
                                                    return (
                                                        <div key={purchase.id} className="p-3 bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-lg border border-neutral-200 hover:border-primary-300 transition-all">
                                                            {/* Purchase Header */}
                                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                                <div>
                                                                    <p className="text-xs text-neutral-500">{purchase.purchase_date}</p>
                                                                    <p className="font-bold text-success-600 text-sm">Total: ₹{Number(purchase.total_amount || 0).toFixed(2)}</p>
                                                                </div>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {purchase.payment_method || 'Cash'}
                                                                </Badge>
                                                            </div>

                                                            {/* Itemized Breakdown */}
                                                            {items.length > 0 && (
                                                                <div className="mt-2 pt-2 border-t border-neutral-300">
                                                                    <div className="space-y-1 text-xs">
                                                                        {items.map((item: any, idx: number) => {
                                                                            const lineTotal = Number(item.qty || 0) * Number(item.price || 0);
                                                                            return (
                                                                                <div key={idx} className="flex justify-between items-center gap-2 px-1">
                                                                                    <span className="text-neutral-700 font-medium flex-1">
                                                                                        {item.name} × {item.qty}
                                                                                    </span>
                                                                                    <span className="text-neutral-600">
                                                                                        ₹{Number(item.price || 0).toFixed(0)}
                                                                                    </span>
                                                                                    <span className="text-neutral-900 font-semibold min-w-[60px] text-right">
                                                                                        ₹{lineTotal.toFixed(2)}
                                                                                    </span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {purchase.notes && (
                                                                        <p className="text-xs text-neutral-600 mt-2 italic">
                                                                            Note: {purchase.notes}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
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
                        <Label htmlFor="customer-type">Customer Type</Label>
                        <select
                            id="customer-type"
                            value={newCustomer.customer_type}
                            onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="buyer">Buyer</option>
                            <option value="seller">Seller/Vendor</option>
                            <option value="both">Both Buyer & Seller</option>
                        </select>
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
                        <Label htmlFor="edit-customer-type">Customer Type</Label>
                        <select
                            id="edit-customer-type"
                            value={editForm.customer_type}
                            onChange={(e) => setEditForm({ ...editForm, customer_type: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="buyer">Buyer</option>
                            <option value="seller">Seller/Vendor</option>
                            <option value="both">Both Buyer & Seller</option>
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
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Items */}
                    <div>
                        <Label className="mb-3 block">Purchase Items *</Label>
                        <div className="space-y-3 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                            {newPurchase.items.map((item, index) => (
                                <div key={index} className="space-y-2 p-3 bg-white rounded-lg border border-neutral-200">
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <Label htmlFor={`item-name-${index}`} className="text-xs">Product Name *</Label>
                                            <Input
                                                id={`item-name-${index}`}
                                                placeholder="Enter product name (e.g., Shirt, Shoe)"
                                                value={item.name}
                                                onChange={(e) => updatePurchaseItem(index, 'name', e.target.value)}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Label htmlFor={`item-qty-${index}`} className="text-xs">Qty *</Label>
                                            <Input
                                                id={`item-qty-${index}`}
                                                type="number"
                                                placeholder="1"
                                                value={item.qty}
                                                onChange={(e) => updatePurchaseItem(index, 'qty', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <Label htmlFor={`item-price-${index}`} className="text-xs">Price *</Label>
                                            <Input
                                                id={`item-price-${index}`}
                                                type="number"
                                                placeholder="0"
                                                value={item.price}
                                                onChange={(e) => updatePurchaseItem(index, 'price', Number(e.target.value))}
                                            />
                                        </div>
                                        {newPurchase.items.length > 1 && (
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => removePurchaseItem(index)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="text-xs text-neutral-600 text-right">
                                        Subtotal: ₹{(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}
                                    </div>
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
                            Add Another Item
                        </Button>
                    </div>

                    {/* Purchase Details */}
                    <div>
                        <Label className="mb-3 block">Purchase Details</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label htmlFor="payment-method" className="text-xs">Payment Method</Label>
                                <select
                                    id="payment-method"
                                    value={newPurchase.payment_method}
                                    onChange={(e) => setNewPurchase({ ...newPurchase, payment_method: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    <option>Cash</option>
                                    <option>Card</option>
                                    <option>UPI</option>
                                    <option>Net Banking</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="purchase-date" className="text-xs">Date *</Label>
                                <Input
                                    id="purchase-date"
                                    type="date"
                                    value={newPurchase.purchase_date}
                                    onChange={(e) => setNewPurchase({ ...newPurchase, purchase_date: e.target.value })}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="purchase-notes" className="text-xs">Notes (Optional)</Label>
                        <textarea
                            id="purchase-notes"
                            placeholder="Add any notes about this purchase..."
                            value={newPurchase.notes}
                            onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={2}
                        />
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-neutral-600">Subtotal:</span>
                            <span className="font-semibold text-neutral-900">₹{newPurchase.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-primary-300 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-neutral-900">Total Amount:</span>
                                <span className="text-2xl font-bold text-primary-600">
                                    ₹{newPurchase.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTarget(null);
                }}
                title="Confirm Delete"
                size="sm"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteTarget(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                if (deleteTarget === 'single' && selectedCustomer) {
                                    handleDeleteCustomer(selectedCustomer.id);
                                    setShowDeleteConfirm(false);
                                    setDeleteTarget(null);
                                } else if (deleteTarget === 'bulk') {
                                    handleBulkDelete();
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {deleteTarget === 'single' && (
                        <div className="text-neutral-700">
                            <p className="font-semibold mb-2">Are you sure you want to delete this customer?</p>
                            <p className="text-sm text-neutral-600">
                                <strong>{selectedCustomer?.name}</strong> and all their purchase history will be permanently removed.
                            </p>
                        </div>
                    )}
                    {deleteTarget === 'bulk' && (
                        <div className="text-neutral-700">
                            <p className="font-semibold mb-2">Delete {selectedForDelete.size} customer(s)?</p>
                            <p className="text-sm text-neutral-600">
                                This action cannot be undone. All selected customers and their purchase histories will be permanently removed.
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
