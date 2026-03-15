import { useState, useEffect, useCallback } from 'react';
import { activities, customers } from '../services/api';
import toast from 'react-hot-toast';
import {
    Phone,
    Calendar,
    Mail,
    ClipboardList,
    MessageSquare,
    UserCheck,
    Plus,
    CheckCircle2,
    Circle,
    Clock,
    AlertTriangle,
    Trash2,
    Edit2,
    Filter,
    RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner, EmptyState } from '../components/ui/Avatar';

const ACTIVITY_TYPES = [
    { value: 'call', label: 'Call', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-100' },
    { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
    { value: 'email', label: 'Email', icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { value: 'task', label: 'Task', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-100' },
    { value: 'follow_up', label: 'Follow-up', icon: UserCheck, color: 'text-pink-600', bg: 'bg-pink-100' },
    { value: 'note', label: 'Note', icon: MessageSquare, color: 'text-neutral-600', bg: 'bg-neutral-100' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low', color: 'bg-neutral-100 text-neutral-700' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-700' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

function getActivityMeta(type: string) {
    return ACTIVITY_TYPES.find((t) => t.value === type) || ACTIVITY_TYPES[5];
}

function getPriorityMeta(priority: string) {
    return PRIORITIES.find((p) => p.value === priority) || PRIORITIES[1];
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function isOverdue(dueDate: string | null, completed: boolean) {
    if (!dueDate || completed) return false;
    return new Date(dueDate) < new Date();
}

export default function Activities() {
    const [activityList, setActivityList] = useState<any[]>([]);
    const [customerList, setCustomerList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState<any>(null);
    const [typeFilter, setTypeFilter] = useState('');
    const [completedFilter, setCompletedFilter] = useState('');
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        customer_id: '',
        type: 'note',
        subject: '',
        description: '',
        due_date: '',
        priority: 'medium',
    });

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 100 };
            if (typeFilter) params.type = typeFilter;
            if (completedFilter !== '') params.completed = completedFilter;

            const [actRes, statsRes] = await Promise.all([
                activities.getAll(params),
                activities.getStats(),
            ]);

            setActivityList(actRes.data.activities || []);
            setTotal(actRes.data.total || 0);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching activities:', error);
            toast.error('Failed to load activities');
        } finally {
            setLoading(false);
        }
    }, [typeFilter, completedFilter]);

    const fetchCustomers = useCallback(async () => {
        try {
            const res = await customers.getAll({ limit: 500 });
            setCustomerList(res.data.customers || []);
        } catch {
            // Non-critical, form still works
        }
    }, []);

    useEffect(() => {
        fetchActivities();
        fetchCustomers();
    }, [fetchActivities, fetchCustomers]);

    const resetForm = () => {
        setFormData({
            customer_id: '',
            type: 'note',
            subject: '',
            description: '',
            due_date: '',
            priority: 'medium',
        });
    };

    const handleCreate = async () => {
        if (!formData.subject.trim()) {
            toast.error('Subject is required');
            return;
        }

        setActionLoading(true);
        try {
            await activities.create({
                ...formData,
                customer_id: formData.customer_id ? Number(formData.customer_id) : null,
                due_date: formData.due_date || null,
            });
            setShowAddModal(false);
            resetForm();
            toast.success('Activity created successfully');
            await fetchActivities();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error creating activity');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!formData.subject.trim()) {
            toast.error('Subject is required');
            return;
        }
        if (!editingActivity) return;

        setActionLoading(true);
        try {
            await activities.update(editingActivity.id, {
                ...formData,
                customer_id: formData.customer_id ? Number(formData.customer_id) : null,
                due_date: formData.due_date || null,
            });
            setShowEditModal(false);
            setEditingActivity(null);
            resetForm();
            toast.success('Activity updated successfully');
            await fetchActivities();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error updating activity');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleComplete = async (id: number) => {
        try {
            await activities.toggleComplete(id);
            await fetchActivities();
        } catch (error: any) {
            toast.error('Error updating activity');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setActionLoading(true);
        try {
            await activities.delete(deleteId);
            setShowDeleteConfirm(false);
            setDeleteId(null);
            toast.success('Activity deleted');
            await fetchActivities();
        } catch (error: any) {
            toast.error('Error deleting activity');
        } finally {
            setActionLoading(false);
        }
    };

    const openEdit = (activity: any) => {
        setEditingActivity(activity);
        setFormData({
            customer_id: activity.customer_id?.toString() || '',
            type: activity.type || 'note',
            subject: activity.subject || '',
            description: activity.description || '',
            due_date: activity.due_date ? activity.due_date.split('T')[0] : '',
            priority: activity.priority || 'medium',
        });
        setShowEditModal(true);
    };

    const overview = stats?.overview || {};

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Activities</h1>
                    <p className="text-neutral-500 mt-1">Track calls, meetings, tasks, and customer interactions</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchActivities()} title="Refresh">
                        <RefreshCw size={16} />
                    </Button>
                    <Button onClick={() => { resetForm(); setShowAddModal(true); }} size="lg" className="gap-2">
                        <Plus size={20} />
                        Add Activity
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{overview.total_activities || 0}</p>
                        <p className="text-xs text-blue-600 mt-1">Total Activities</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-700">{overview.completed || 0}</p>
                        <p className="text-xs text-emerald-600 mt-1">Completed</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-700">{overview.pending || 0}</p>
                        <p className="text-xs text-amber-600 mt-1">Pending</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-700">{overview.overdue || 0}</p>
                        <p className="text-xs text-red-600 mt-1">Overdue</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                            <Filter size={16} />
                            <span>Filter:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setTypeFilter('')}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    typeFilter === '' ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                            >
                                All
                            </button>
                            {ACTIVITY_TYPES.map((t) => {
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.value}
                                        onClick={() => setTypeFilter(t.value === typeFilter ? '' : t.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                                            typeFilter === t.value ? 'bg-primary-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="ml-auto">
                            <select
                                value={completedFilter}
                                onChange={(e) => setCompletedFilter(e.target.value)}
                                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            >
                                <option value="">All Status</option>
                                <option value="false">Pending</option>
                                <option value="true">Completed</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Activity List */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Activity Timeline</CardTitle>
                        <Badge variant="secondary">{total} total</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Spinner size="lg" />
                        </div>
                    ) : activityList.length > 0 ? (
                        <div className="space-y-3">
                            {activityList.map((activity: any) => {
                                const meta = getActivityMeta(activity.type);
                                const priorityMeta = getPriorityMeta(activity.priority);
                                const Icon = meta.icon;
                                const overdue = isOverdue(activity.due_date, activity.completed);

                                return (
                                    <div
                                        key={activity.id}
                                        className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                                            activity.completed
                                                ? 'bg-neutral-50 border-neutral-200 opacity-70'
                                                : overdue
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-white border-neutral-200 hover:border-primary-300'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Complete Toggle */}
                                            <button
                                                onClick={() => handleToggleComplete(activity.id)}
                                                className="mt-0.5 transition-transform hover:scale-110"
                                                title={activity.completed ? 'Mark as pending' : 'Mark as complete'}
                                            >
                                                {activity.completed ? (
                                                    <CheckCircle2 size={22} className="text-emerald-500" />
                                                ) : (
                                                    <Circle size={22} className="text-neutral-300 hover:text-primary-500" />
                                                )}
                                            </button>

                                            {/* Type Icon */}
                                            <div className={`p-2 rounded-lg ${meta.bg}`}>
                                                <Icon size={18} className={meta.color} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`font-semibold text-neutral-900 ${activity.completed ? 'line-through' : ''}`}>
                                                            {activity.subject}
                                                        </h3>
                                                        {activity.customer_name && (
                                                            <p className="text-sm text-primary-600 mt-0.5">
                                                                👤 {activity.customer_name}
                                                            </p>
                                                        )}
                                                        {activity.description && (
                                                            <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                                                                {activity.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => openEdit(activity)}
                                                            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={15} className="text-neutral-400 hover:text-primary-600" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setDeleteId(activity.id); setShowDeleteConfirm(true); }}
                                                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={15} className="text-neutral-400 hover:text-red-500" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Meta row */}
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <Badge variant="secondary" className={`text-xs ${meta.bg} ${meta.color} border-0`}>
                                                        {meta.label}
                                                    </Badge>
                                                    <Badge variant="secondary" className={`text-xs ${priorityMeta.color} border-0`}>
                                                        {priorityMeta.label}
                                                    </Badge>
                                                    {activity.due_date && (
                                                        <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-neutral-500'}`}>
                                                            {overdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
                                                            Due: {formatDate(activity.due_date)}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-neutral-400">
                                                        Created {formatDateTime(activity.created_at)}
                                                    </span>
                                                    {activity.completed && activity.completed_at && (
                                                        <span className="text-xs text-emerald-600">
                                                            ✅ Completed {formatDate(activity.completed_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState
                            title="No activities found"
                            description="Start tracking your customer interactions by adding an activity"
                        />
                    )}
                </CardContent>
            </Card>

            {/* Add Activity Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Activity"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={actionLoading}>
                            {actionLoading ? 'Creating...' : 'Create Activity'}
                        </Button>
                    </div>
                }
            >
                <ActivityForm
                    formData={formData}
                    setFormData={setFormData}
                    customerList={customerList}
                />
            </Modal>

            {/* Edit Activity Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setEditingActivity(null); }}
                title="Edit Activity"
                size="md"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditingActivity(null); }}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={actionLoading}>
                            {actionLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <ActivityForm
                    formData={formData}
                    setFormData={setFormData}
                    customerList={customerList}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
                title="Delete Activity?"
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
                <p className="text-neutral-600">Are you sure you want to delete this activity? This action cannot be undone.</p>
            </Modal>
        </div>
    );
}

// Shared Form Component
function ActivityForm({
    formData,
    setFormData,
    customerList,
}: {
    formData: any;
    setFormData: (data: any) => void;
    customerList: any[];
}) {
    return (
        <div className="space-y-4">
            {/* Type Selection */}
            <div>
                <Label>Activity Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {ACTIVITY_TYPES.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.value}
                                onClick={() => setFormData({ ...formData, type: t.value })}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-sm ${
                                    formData.type === t.value
                                        ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                                        : 'border-neutral-200 hover:border-primary-300 text-neutral-600'
                                }`}
                            >
                                <Icon size={16} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Subject */}
            <div>
                <Label htmlFor="activity-subject">Subject *</Label>
                <Input
                    id="activity-subject"
                    placeholder="e.g., Follow up on demo request"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
            </div>

            {/* Customer */}
            <div>
                <Label htmlFor="activity-customer">Customer (optional)</Label>
                <select
                    id="activity-customer"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                    <option value="">— No customer —</option>
                    {customerList.map((c: any) => (
                        <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Description */}
            <div>
                <Label htmlFor="activity-desc">Description</Label>
                <textarea
                    id="activity-desc"
                    placeholder="Add notes or details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                />
            </div>

            {/* Due Date & Priority */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="activity-due">Due Date</Label>
                    <Input
                        id="activity-due"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                </div>
                <div>
                    <Label htmlFor="activity-priority">Priority</Label>
                    <select
                        id="activity-priority"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                        {PRIORITIES.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
