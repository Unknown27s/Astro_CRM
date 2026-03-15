import { useState, useEffect } from 'react';
import { campaigns, aiService } from '../services/api';
import toast from 'react-hot-toast';
import { Send, Plus, MessageCircle, Users, Check, Brain, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/Avatar';

export default function Campaigns() {
    const [campaignList, setCampaignList] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [listLoading, setListLoading] = useState(true);

    const [newCampaign, setNewCampaign] = useState({
        name: '',
        message: '',
        target_audience: 'all',
        audience_filter: {},
    });

    const templates = [
        {
            name: 'Welcome Back',
            message: 'Hi {{name}}! We missed you! Get 20% off on your next visit. Valid for 7 days only.',
        },
        {
            name: 'VIP Exclusive',
            message: 'Thank you {{name}} for being our VIP customer! Enjoy an exclusive 30% discount on your next purchase.',
        },
        {
            name: 'Special Offer',
            message: '{{name}}, it\'s been a while! Visit us this week and get a special surprise gift.',
        },
    ];

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        setListLoading(true);
        try {
            const response = await campaigns.getAll();
            setCampaignList(response.data.campaigns || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            toast.error('Failed to load campaigns');
        } finally {
            setListLoading(false);
        }
    };

    const handleCreateCampaign = async () => {
        if (!newCampaign.name.trim() || !newCampaign.message.trim()) {
            toast.error('Campaign name and message are required');
            return;
        }

        setLoading(true);
        try {
            const response = await campaigns.create(newCampaign);
            setShowCreate(false);
            setNewCampaign({
                name: '',
                message: '',
                target_audience: 'all',
                audience_filter: {},
            });
            await fetchCampaigns();
            await handlePreview(response.data);
            toast.success('Campaign created successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error creating campaign');
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async (campaign: any) => {
        setSelectedCampaign(campaign);
        try {
            const response = await campaigns.preview(campaign.id);
            setPreview(response.data);
        } catch (error) {
            console.error('Error previewing campaign:', error);
            toast.error('Failed to load campaign preview');
        }
    };

    const handleSendCampaign = async (campaignId: number) => {
        if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            await campaigns.send(campaignId);
            toast.success('Campaign sent successfully!');
            await fetchCampaigns();
            setSelectedCampaign(null);
            setPreview(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error sending campaign');
        } finally {
            setLoading(false);
        }
    };

    const handleAiGenerate = async () => {
        setAiGenerating(true);
        try {
            const res = await aiService.generateCampaign({
                audience: getAudienceLabel(newCampaign.target_audience),
                goal: 'drive repeat purchases and increase loyalty',
            });
            const { message, subject } = res.data;
            setNewCampaign((prev) => ({
                ...prev,
                message: message || prev.message,
                name: prev.name || subject || prev.name,
            }));
            toast.success('AI campaign message generated!');
        } catch {
            toast.error('AI generation failed. Check your API key.');
        } finally {
            setAiGenerating(false);
        }
    };

    const getAudienceLabel = (audience: string) => {
        const labels: Record<string, string> = {
            all: 'All Customers',
            active: 'Active Customers',
            inactive: 'Inactive Customers',
            vip: 'VIP Customers',
            low_spenders: 'Low Spenders',
            high_spenders: 'High Spenders',
            custom: 'Custom Audience',
        };
        return labels[audience] || audience;
    };

    const getStatusBadgeVariant = (status: string) => {
        return status === 'Sent' ? 'success' : 'secondary';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">SMS Campaigns</h1>
                    <p className="text-neutral-500 mt-1">Create and send targeted messages to customers</p>
                </div>
                <Button onClick={() => setShowCreate(true)} size="lg" className="gap-2">
                    <Plus size={20} />
                    New Campaign
                </Button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Campaign List */}
                <div>
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg">Campaigns</CardTitle>
                            <CardDescription>{campaignList.length} campaigns</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            {listLoading ? (
                                <div className="flex justify-center items-center h-32">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
                                </div>
                            ) : campaignList.length > 0 ? (
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {campaignList.map((campaign) => (
                                        <button
                                            key={campaign.id}
                                            onClick={() => handlePreview(campaign)}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedCampaign?.id === campaign.id
                                                    ? 'border-primary-500 bg-primary-50'
                                                    : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h3 className="font-semibold text-neutral-900 truncate">{campaign.name}</h3>
                                                <Badge variant={getStatusBadgeVariant(campaign.status)} className="text-xs whitespace-nowrap">
                                                    {campaign.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{campaign.message}</p>
                                            <div className="flex justify-between items-center text-xs text-neutral-500">
                                                <span>{getAudienceLabel(campaign.target_audience)}</span>
                                                {campaign.sent_count > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Send size={12} />
                                                        {campaign.sent_count}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState title="No campaigns yet" description="Create your first campaign to get started" />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Campaign Preview/Details */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        {selectedCampaign ? (
                            <>
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <CardTitle>{selectedCampaign.name}</CardTitle>
                                            <CardDescription>{getAudienceLabel(selectedCampaign.target_audience)}</CardDescription>
                                        </div>
                                        {selectedCampaign.status === 'Draft' && (
                                            <Button
                                                onClick={() => handleSendCampaign(selectedCampaign.id)}
                                                disabled={loading}
                                                variant="default"
                                                size="sm"
                                                className="gap-2"
                                            >
                                                <Send size={16} />
                                                Send
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {preview ? (
                                        <>
                                            {/* Target Audience Info */}
                                            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Users className="text-primary-600" size={24} />
                                                    <div>
                                                        <p className="text-sm text-neutral-600">Target Audience</p>
                                                        <p className="font-semibold text-neutral-900">
                                                            {getAudienceLabel(selectedCampaign.target_audience)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-lg font-bold text-primary-600">
                                                    <Check size={20} />
                                                    {preview.count} recipients
                                                </div>
                                            </div>

                                            {/* Message Preview */}
                                            <div>
                                                <h3 className="font-semibold text-neutral-900 mb-3">Message Preview</h3>
                                                <div className="bg-neutral-50 border-l-4 border-primary-500 rounded-lg p-4">
                                                    <p className="text-neutral-800 whitespace-pre-wrap text-sm leading-relaxed">
                                                        {preview.message_preview}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-2">
                                                    * Message will be personalized for each customer
                                                </p>
                                            </div>

                                            {/* Sample Recipients */}
                                            <div>
                                                <h3 className="font-semibold text-neutral-900 mb-3">Sample Recipients (First 10)</h3>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                    {preview.recipients?.map((recipient: any) => (
                                                        <div key={recipient.id} className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                                                            <div className="flex-1">
                                                                <p className="font-medium text-neutral-900">{recipient.name}</p>
                                                                <p className="text-xs text-neutral-500">{recipient.phone}</p>
                                                            </div>
                                                            {recipient.location && (
                                                                <span className="text-xs text-neutral-500">{recipient.location}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <EmptyState title="Loading preview..." />
                                    )}
                                </CardContent>
                            </>
                        ) : (
                            <CardContent className="flex flex-col items-center justify-center h-96">
                                <EmptyState
                                    icon={<MessageCircle size={48} className="text-neutral-400" />}
                                    title="Select a campaign"
                                    description="Choose a campaign from the list to view details"
                                />
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>

            {/* Create Campaign Modal */}
            <Modal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                title="Create New Campaign"
                size="lg"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowCreate(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCampaign} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Campaign'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-5 max-h-96 overflow-y-auto pr-2">
                    {/* Campaign Name */}
                    <div>
                        <Label htmlFor="campaign-name">Campaign Name *</Label>
                        <Input
                            id="campaign-name"
                            placeholder="e.g., Summer Sale 2024"
                            value={newCampaign.name}
                            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                        />
                    </div>

                    {/* Target Audience */}
                    <div>
                        <Label htmlFor="target-audience">Target Audience</Label>
                        <select
                            id="target-audience"
                            value={newCampaign.target_audience}
                            onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="all">All Customers</option>
                            <option value="active">Active Customers</option>
                            <option value="inactive">Inactive Customers (No purchase in 60+ days)</option>
                            <option value="vip">VIP Customers</option>
                            <option value="low_spenders">Low Spenders</option>
                            <option value="high_spenders">High Spenders</option>
                        </select>
                    </div>

                    {/* Message */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="message">Message *</Label>
                            <span className="text-xs text-neutral-500">{newCampaign.message.length}/160</span>
                        </div>
                        <div className="relative">
                            <textarea
                                id="message"
                                placeholder="Write your message here..."
                                value={newCampaign.message}
                                onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                rows={5}
                            />
                            <Button
                                type="button"
                                onClick={handleAiGenerate}
                                disabled={aiGenerating}
                                variant="outline"
                                size="sm"
                                className="absolute bottom-3 right-3 gap-2"
                            >
                                {aiGenerating ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Brain size={14} />
                                        AI Generate
                                    </>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">
                            Use {`{{name}}`}, {`{{total_spent}}`}, {`{{location}}`} as placeholders
                        </p>
                    </div>

                    {/* Templates */}
                    <div>
                        <Label>Quick Templates</Label>
                        <div className="space-y-2 mt-2">
                            {templates.map((template, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setNewCampaign({ ...newCampaign, message: template.message })}
                                    className="w-full text-left p-3 border border-neutral-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
                                >
                                    <p className="font-medium text-neutral-900 mb-1">{template.name}</p>
                                    <p className="text-xs text-neutral-600 line-clamp-2">{template.message}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
