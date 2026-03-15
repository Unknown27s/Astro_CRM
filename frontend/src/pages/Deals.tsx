import { useState, useEffect, useCallback } from 'react';
import { deals, customers } from '../services/api';
import toast from 'react-hot-toast';
import {
    Plus,
    Trash2,
    Edit2,
    DollarSign,
    Trophy,
    XCircle,
    Target,
    RefreshCw,
    Calendar,
    User,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner, EmptyState } from '../components/ui/Avatar';

const STAGES = [
    { value: 'Lead', color: 'bg-neutral-100 text-neutral-700 border-neutral-300', bar: 'bg-neutral-400' },
    { value: 'Qualified', color: 'bg-blue-100 text-blue-700 border-blue-300', bar: 'bg-blue-500' },
    { value: 'Proposal', color: 'bg-purple-100 text-purple-700 border-purple-300', bar: 'bg-purple-500' },
    { value: 'Negotiation', color: 'bg-amber-100 text-amber-700 border-amber-300', bar: 'bg-amber-500' },
    { value: 'Closed Won', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', bar: 'bg-emerald-500' },
    { value: 'Closed Lost', color: 'bg-red-100 text-red-700 border-red-300', bar: 'bg-red-500' },
];

function getStageMeta(stage: string) {
    return STAGES.find((s) => s.value === stage) || STAGES[0];
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Deals() {
    const [dealList, setDealList] = useState<any[]>([]);
    const [customerList, setCustomerList] = useState<any[]>([]);
    const [overview, setOverview] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDeal, setEditingDeal] = useState<any>(null);
    const [stageFilter, setStageFilter] = useState('');
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        customer_id: '',
        value: '',
        stage: 'Lead',
        probability: '0',
        expected_close_date: '',
        description: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (stageFilter) params.stage = stageFilter;

            const [dealsRes, pipelineRes] = await Promise.all([
                deals.getAll(params),
                deals.getPipeline(),
            ]);

            setDealList(dealsRes.data.deals || []);
            setOverview(pipelineRes.data.overview || {});
        } catch (error) {
            toast.error('Failed to load deals');
        } finally {
            setLoading(false);
        }
    }, [stageFilter]);

    const fetchCustomers = useCallback(async () => {
        try {
            const res = await customers.getAll({ limit: 500 });
            setCustomerList(res.data.customers || []);
        } catch {}
    }, []);

    useEffect(() => {
        fetchData();
        fetchCustomers();
    }, [fetchData, fetchCustomers]);

    const resetForm = () => {
        setFormData({
            title: '', customer_id: '', value: '', stage: 'Lead',
            probability: '0', expected_close_date: '', description: '',
        });
    };

    const handleCreate = async () => {
        if (!formData.title.trim()) {
            toast.error('Deal title is required');
            return;
        }
        setActionLoading(true);
        try {
            await deals.create({
                ...formData,
                customer_id: formData.customer_id ? Number(formData.customer_id) : null,
                value: formData.value ? Number(formData.value) : 0,
                probability: Number(formData.probability) || 0,
                expected_close_date: formData.expected_close_date || null,
            });
            setShowAddModal(false);
            resetForm();
            toast.success('Deal created');
            await fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create deal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!formData.title.trim() || !editingDeal) return;
        setActionLoading(true);
        try {
            await deals.update(editingDeal.id, {
                ...formData,
                customer_id: formData.customer_id ? Number(formData.customer_id) : null,
                value: formData.value ? Number(formData.value) : 0,
                probability: Number(formData.probability) || 0,
                expected_close_date: formData.expected_close_date || null,
            });
            setShowEditModal(false);
            setEditingDeal(null);
            resetForm();
            toast.success('Deal updated');
            await fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update deal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStageChange = async (dealId: number, newStage: string) => {
        try {
            await deals.updateStage(dealId, newStage);
            toast.success(`Moved to ${newStage}`);
            await fetchData();
        } catch (error: any) {
            toast.error('Failed to update stage');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setActionLoading(true);
        try {
            await deals.delete(deleteId);
            setShowDeleteConfirm(false);
            setDeleteId(null);
            toast.success('Deal deleted');
            await fetchData();
        } catch {
            toast.error('Failed to delete deal');
        } finally {
            setActionLoading(false);
        }
    };

    const openEdit = (deal: any) => {
        setEditingDeal(deal);
        setFormData({
            title: deal.title || '',
            customer_id: deal.customer_id?.toString() || '',
            value: deal.value?.toString() || '',
            stage: deal.stage || 'Lead',
            probability: deal.probability?.toString() || '0',
            expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
            description: deal.description || '',
        });
        setShowEditModal(true);
    };

    // Group deals by stage for Kanban
    const kanbanData = STAGES.filter((s) => s.value !== 'Closed Won' && s.value !== 'Closed Lost').map((stage) => ({
        ...stage,
        deals: dealList.filter((d) => d.stage === stage.value),
        totalValue: dealList.filter((d) => d.stage === stage.value).reduce((s, d) => s + (d.value || 0), 0),
    }));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Sales Pipeline</h1>
                    <p className="text-neutral-500 mt-1">Track and manage deals through your sales pipeline</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-neutral-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-primary-700' : 'text-neutral-500'}`}
                        >
                            Kanban
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-700' : 'text-neutral-500'}`}
                        >
                            List
                        </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchData()} title="Refresh">
                        <RefreshCw size={16} />
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAddModal(true); }} size="lg" className="gap-2">
                        <Plus size={20} />
                        New Deal
                    </Button>
                </div>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                        <Target size={24} className="mx-auto text-blue-600 mb-1" />
                        <p className="text-2xl font-bold text-blue-700">{overview.active_deals || 0}</p>
                        <p className="text-xs text-blue-600">Active Deals</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-4 text-center">
                        <DollarSign size={24} className="mx-auto text-amber-600 mb-1" />
                        <p className="text-xl font-bold text-amber-700">{formatCurrency(overview.pipeline_value || 0)}</p>
                        <p className="text-xs text-amber-600">Pipeline Value</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardContent className="p-4 text-center">
                        <Trophy size={24} className="mx-auto text-emerald-600 mb-1" />
                        <p className="text-2xl font-bold text-emerald-700">{overview.won_deals || 0}</p>
                        <p className="text-xs text-emerald-600">Won ({formatCurrency(overview.won_value || 0)})</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <CardContent className="p-4 text-center">
                        <XCircle size={24} className="mx-auto text-red-600 mb-1" />
                        <p className="text-2xl font-bold text-red-700">{overview.lost_deals || 0}</p>
                        <p className="text-xs text-red-600">Lost Deals</p>
                    </CardContent>
                </Card>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : viewMode === 'kanban' ? (
                /* Kanban View */
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                        {kanbanData.map((col) => (
                            <div key={col.value} className="w-72 flex-shrink-0">
                                <div className={`rounded-t-xl p-3 ${col.color} border-2`}>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-sm">{col.value}</h3>
                                        <Badge variant="secondary" className="text-xs">{col.deals.length}</Badge>
                                    </div>
                                    <p className="text-xs opacity-75 mt-0.5">{formatCurrency(col.totalValue)}</p>
                                </div>
                                <div className="bg-neutral-50 rounded-b-xl border-2 border-t-0 border-neutral-200 p-2 space-y-2 min-h-[200px]">
                                    {col.deals.length > 0 ? col.deals.map((deal: any) => (
                                        <div key={deal.id} className="bg-white rounded-lg border border-neutral-200 p-3 hover:shadow-md transition-shadow cursor-pointer group">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-medium text-sm text-neutral-900 flex-1 truncate">{deal.title}</h4>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEdit(deal)} className="p-1 hover:bg-neutral-100 rounded">
                                                        <Edit2 size={12} className="text-neutral-400" />
                                                    </button>
                                                    <button onClick={() => { setDeleteId(deal.id); setShowDeleteConfirm(true); }} className="p-1 hover:bg-red-50 rounded">
                                                        <Trash2 size={12} className="text-neutral-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            {deal.customer_name && (
                                                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                                                    <User size={10} />{deal.customer_name}
                                                </p>
                                            )}
                                            <p className="text-sm font-semibold text-neutral-700 mt-2">{formatCurrency(deal.value || 0)}</p>
                                            {deal.expected_close_date && (
                                                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {formatDate(deal.expected_close_date)}
                                                </p>
                                            )}
                                            {/* Stage navigation */}
                                            <div className="flex gap-1 mt-2 pt-2 border-t border-neutral-100">
                                                {STAGES.filter(s => s.value !== deal.stage).slice(0, 3).map((s) => (
                                                    <button
                                                        key={s.value}
                                                        onClick={() => handleStageChange(deal.id, s.value)}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded border ${s.color} hover:opacity-80 transition-opacity`}
                                                        title={`Move to ${s.value}`}
                                                    >
                                                        {s.value.length > 10 ? s.value.slice(0, 8) + '…' : s.value}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-8 text-neutral-400 text-xs">
                                            No deals
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Closed columns */}
                        {['Closed Won', 'Closed Lost'].map((closedStage) => {
                            const stageMeta = getStageMeta(closedStage);
                            const stageDeals = dealList.filter(d => d.stage === closedStage);
                            return (
                                <div key={closedStage} className="w-60 flex-shrink-0">
                                    <div className={`rounded-t-xl p-3 ${stageMeta.color} border-2`}>
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-sm">{closedStage}</h3>
                                            <Badge variant="secondary" className="text-xs">{stageDeals.length}</Badge>
                                        </div>
                                    </div>
                                    <div className="bg-neutral-50 rounded-b-xl border-2 border-t-0 border-neutral-200 p-2 space-y-2 min-h-[100px] max-h-[300px] overflow-y-auto">
                                        {stageDeals.map((deal: any) => (
                                            <div key={deal.id} className="bg-white rounded-lg border p-2 opacity-75">
                                                <p className="text-xs font-medium truncate">{deal.title}</p>
                                                <p className="text-xs text-neutral-500">{formatCurrency(deal.value || 0)}</p>
                                            </div>
                                        ))}
                                        {stageDeals.length === 0 && <p className="text-center text-xs text-neutral-400 py-4">—</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* List View */
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">All Deals</CardTitle>
                            <div className="flex gap-2">
                                {STAGES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setStageFilter(stageFilter === s.value ? '' : s.value)}
                                        className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                                            stageFilter === s.value ? s.color + ' shadow-sm' : 'text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                                        }`}
                                    >
                                        {s.value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {dealList.length > 0 ? (
                            <div className="space-y-2">
                                {dealList.map((deal: any) => {
                                    const stageMeta = getStageMeta(deal.stage);
                                    return (
                                        <div key={deal.id} className="flex items-center gap-4 p-3 rounded-xl border-2 border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all bg-white">
                                            <div className={`w-3 h-3 rounded-full ${stageMeta.bar}`} />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-neutral-900 truncate">{deal.title}</h4>
                                                {deal.customer_name && (
                                                    <p className="text-xs text-primary-600">👤 {deal.customer_name}</p>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className={`text-xs border ${stageMeta.color}`}>{deal.stage}</Badge>
                                            <p className="font-semibold text-neutral-700 text-sm w-28 text-right">{formatCurrency(deal.value || 0)}</p>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(deal)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
                                                    <Edit2 size={14} className="text-neutral-400" />
                                                </button>
                                                <button onClick={() => { setDeleteId(deal.id); setShowDeleteConfirm(true); }} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={14} className="text-neutral-400" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState title="No deals found" description="Create your first deal to start tracking your sales pipeline" />
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Add Deal Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Create New Deal"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={actionLoading}>
                            {actionLoading ? 'Creating...' : 'Create Deal'}
                        </Button>
                    </div>
                }
            >
                <DealForm formData={formData} setFormData={setFormData} customerList={customerList} />
            </Modal>

            {/* Edit Deal Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditingDeal(null); }}
                title="Edit Deal"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditingDeal(null); }}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={actionLoading}>
                            {actionLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <DealForm formData={formData} setFormData={setFormData} customerList={customerList} />
            </Modal>

            {/* Delete Confirm */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
                title="Delete Deal?"
                size="sm"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => { setShowDeleteConfirm(false); setDeleteId(null); }}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
                            {actionLoading ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                }
            >
                <p className="text-neutral-600">Are you sure you want to delete this deal? This action cannot be undone.</p>
            </Modal>
        </div>
    );
}

function DealForm({ formData, setFormData, customerList }: { formData: any; setFormData: (d: any) => void; customerList: any[] }) {
    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="deal-title">Title *</Label>
                <Input id="deal-title" placeholder="e.g., Enterprise Plan for Acme Corp" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div>
                <Label htmlFor="deal-customer">Customer</Label>
                <select id="deal-customer" value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                    <option value="">— No customer —</option>
                    {customerList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="deal-value">Value (₹)</Label>
                    <Input id="deal-value" type="number" placeholder="0" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} />
                </div>
                <div>
                    <Label htmlFor="deal-probability">Probability (%)</Label>
                    <Input id="deal-probability" type="number" min="0" max="100" placeholder="0" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: e.target.value })} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="deal-stage">Stage</Label>
                    <select id="deal-stage" value={formData.stage} onChange={(e) => setFormData({ ...formData, stage: e.target.value })} className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                        {STAGES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="deal-close">Expected Close</Label>
                    <Input id="deal-close" type="date" value={formData.expected_close_date} onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} />
                </div>
            </div>
            <div>
                <Label htmlFor="deal-desc">Description</Label>
                <textarea id="deal-desc" placeholder="Deal details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} />
            </div>
        </div>
    );
}
