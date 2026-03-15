import { useState, useEffect, useCallback } from 'react';
import { users } from '../services/api';
import toast from 'react-hot-toast';
import {
    Shield,
    Users as UsersIcon,
    Crown,
    Eye,
    Briefcase,
    RefreshCw,
    User,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner, EmptyState } from '../components/ui/Avatar';

const ROLES = [
    { value: 'admin', label: 'Admin', description: 'Full access to all features', icon: Crown, color: 'bg-red-100 text-red-700' },
    { value: 'manager', label: 'Manager', description: 'Manage customers, deals, and reports', icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
    { value: 'staff', label: 'Staff', description: 'View and manage day-to-day operations', icon: UsersIcon, color: 'bg-blue-100 text-blue-700' },
    { value: 'viewer', label: 'Viewer', description: 'Read-only access to dashboards only', icon: Eye, color: 'bg-neutral-100 text-neutral-700' },
];

function getRoleMeta(role: string) {
    return ROLES.find(r => r.value === role) || ROLES[2];
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UserManagement() {
    const [userList, setUserList] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [meRes, usersRes] = await Promise.all([
                users.getMe(),
                users.getAll(),
            ]);
            setCurrentUser(meRes.data.user);
            setUserList(usersRes.data.users || []);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleChange = async (userId: number, newRole: string) => {
        if (currentUser?.role !== 'admin') {
            toast.error('Only admins can change roles');
            return;
        }
        if (userId === currentUser?.id) {
            toast.error('You cannot change your own role');
            return;
        }

        setActionLoading(userId);
        try {
            await users.updateRole(userId, newRole);
            toast.success(`Role updated to ${newRole}`);
            await fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to update role');
        } finally {
            setActionLoading(null);
        }
    };

    const isAdmin = currentUser?.role === 'admin';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">User Management</h1>
                    <p className="text-neutral-500 mt-1">Manage team members and their roles & permissions</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData()} title="Refresh">
                    <RefreshCw size={16} />
                </Button>
            </div>

            {/* Current User Card */}
            {currentUser && (
                <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold">
                                {currentUser.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-neutral-900">{currentUser.fullName}</h2>
                                <p className="text-sm text-neutral-600">{currentUser.email}</p>
                            </div>
                            <Badge className={`text-sm px-3 py-1 ${getRoleMeta(currentUser.role).color}`}>
                                {getRoleMeta(currentUser.role).label}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Role Permissions Guide */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield size={20} className="text-primary-600" />
                        Role Permissions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {ROLES.map((role) => {
                            const Icon = role.icon;
                            return (
                                <div key={role.value} className={`p-4 rounded-xl border-2 border-neutral-200 ${role.value === currentUser?.role ? 'ring-2 ring-primary-500 border-primary-300' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`p-1.5 rounded-lg ${role.color}`}>
                                            <Icon size={16} />
                                        </div>
                                        <h3 className="font-semibold text-neutral-900">{role.label}</h3>
                                    </div>
                                    <p className="text-xs text-neutral-500">{role.description}</p>
                                    <div className="mt-3 space-y-1">
                                        {role.value === 'admin' && (
                                            <>
                                                <p className="text-xs text-emerald-600">✅ All features</p>
                                                <p className="text-xs text-emerald-600">✅ User management</p>
                                                <p className="text-xs text-emerald-600">✅ System settings</p>
                                            </>
                                        )}
                                        {role.value === 'manager' && (
                                            <>
                                                <p className="text-xs text-emerald-600">✅ Customers & Deals</p>
                                                <p className="text-xs text-emerald-600">✅ Reports & Analytics</p>
                                                <p className="text-xs text-neutral-400">❌ User management</p>
                                            </>
                                        )}
                                        {role.value === 'staff' && (
                                            <>
                                                <p className="text-xs text-emerald-600">✅ Customers & Activities</p>
                                                <p className="text-xs text-emerald-600">✅ Stock & Orders</p>
                                                <p className="text-xs text-neutral-400">❌ Delete data</p>
                                            </>
                                        )}
                                        {role.value === 'viewer' && (
                                            <>
                                                <p className="text-xs text-emerald-600">✅ View dashboards</p>
                                                <p className="text-xs text-neutral-400">❌ Edit anything</p>
                                                <p className="text-xs text-neutral-400">❌ Delete anything</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Users List */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Team Members</CardTitle>
                        <Badge variant="secondary">{userList.length} users</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
                    ) : userList.length > 0 ? (
                        <div className="space-y-3">
                            {userList.map((u: any) => {
                                const roleMeta = getRoleMeta(u.role);
                                const isCurrentUser = u.id === currentUser?.id;

                                return (
                                    <div key={u.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${isCurrentUser ? 'border-primary-200 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}>
                                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-semibold">
                                            {u.full_name?.charAt(0)?.toUpperCase() || <User size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-neutral-900 truncate">{u.full_name || 'Unknown'}</h4>
                                                {isCurrentUser && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                                            </div>
                                            <p className="text-sm text-neutral-500 truncate">{u.email}</p>
                                            <p className="text-xs text-neutral-400">Joined {formatDate(u.created_at)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isAdmin && !isCurrentUser ? (
                                                <select
                                                    value={u.role || 'staff'}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    disabled={actionLoading === u.id}
                                                    className={`px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 ${roleMeta.color} border-neutral-300`}
                                                >
                                                    {ROLES.map(r => (
                                                        <option key={r.value} value={r.value}>{r.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <Badge className={`text-sm px-3 py-1 ${roleMeta.color}`}>
                                                    {roleMeta.label}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState title="No users found" description="Something went wrong loading the user list" />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
