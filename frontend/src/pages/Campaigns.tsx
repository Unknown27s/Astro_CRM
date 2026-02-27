import { useState, useEffect } from 'react';
import { campaigns } from '../services/api';
import toast from 'react-hot-toast';
import { Send, Plus, MessageCircle, Users, Check } from 'lucide-react';

export default function Campaigns() {
    const [campaignList, setCampaignList] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [newCampaign, setNewCampaign] = useState({
        name: '',
        message: '',
        target_audience: 'all',
        audience_filter: {}
    });

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await campaigns.getAll();
            setCampaignList(response.data.campaigns || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        }
    };

    const handleCreateCampaign = async () => {
        if (!newCampaign.name.trim() || !newCampaign.message.trim()) {
            toast.error('Name and message are required');
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
                audience_filter: {}
            });
            fetchCampaigns();
            // Auto-preview the new campaign
            handlePreview(response.data);
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
            fetchCampaigns();
            setSelectedCampaign(null);
            setPreview(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Error sending campaign');
        } finally {
            setLoading(false);
        }
    };

    const templates = [
        {
            name: 'Welcome Back',
            message: 'Hi {{name}}! We missed you! Get 20% off on your next visit. Valid for 7 days only.'
        },
        {
            name: 'VIP Exclusive',
            message: 'Thank you {{name}} for being our VIP customer! Enjoy an exclusive 30% discount on your next purchase.'
        },
        {
            name: 'Special Offer',
            message: '{{name}}, it\'s been a while! Visit us this week and get a special surprise gift.'
        }
    ];

    const getAudienceLabel = (audience: string) => {
        const labels: Record<string, string> = {
            all: 'All Customers',
            active: 'Active Customers',
            inactive: 'Inactive Customers',
            vip: 'VIP Customers',
            low_spenders: 'Low Spenders',
            high_spenders: 'High Spenders',
            custom: 'Custom Audience'
        };
        return labels[audience] || audience;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">SMS Campaigns</h1>
                    <p className="text-gray-600 mt-1">Create and send targeted messages to customers</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all"
                >
                    <Plus size={20} />
                    New Campaign
                </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Campaign List */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Campaigns</h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {campaignList.map((campaign) => (
                            <div
                                key={campaign.id}
                                onClick={() => handlePreview(campaign)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    selectedCampaign?.id === campaign.id
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-green-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-800">{campaign.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        campaign.status === 'Sent' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {campaign.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{campaign.message}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{getAudienceLabel(campaign.target_audience)}</span>
                                    {campaign.sent_count > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Send size={12} />
                                            {campaign.sent_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {campaignList.length === 0 && (
                            <p className="text-center text-gray-500 py-8">No campaigns yet</p>
                        )}
                    </div>
                </div>

                {/* Campaign Preview */}
                <div className="col-span-2 bg-white rounded-xl shadow-md p-6">
                    {selectedCampaign ? (
                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">{selectedCampaign.name}</h2>
                                    <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full ${
                                        selectedCampaign.status === 'Sent' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {selectedCampaign.status}
                                    </span>
                                </div>
                                {selectedCampaign.status === 'Draft' && (
                                    <button
                                        onClick={() => handleSendCampaign(selectedCampaign.id)}
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        <Send size={18} />
                                        {loading ? 'Sending...' : 'Send Campaign'}
                                    </button>
                                )}
                            </div>

                            {preview && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Users className="text-blue-600" size={24} />
                                            <div>
                                                <p className="text-sm text-gray-600">Target Audience</p>
                                                <p className="font-semibold text-gray-800">
                                                    {getAudienceLabel(selectedCampaign.target_audience)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
                                            <Check size={20} />
                                            {preview.count} recipients
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-700 mb-3">Message Preview</h3>
                                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-500">
                                            <p className="text-gray-800 whitespace-pre-wrap">{preview.message_preview}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            * Message will be personalized for each customer
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-700 mb-3">Sample Recipients (First 10)</h3>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                            {preview.recipients.map((recipient: any) => (
                                                <div key={recipient.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{recipient.name}</p>
                                                        <p className="text-sm text-gray-600">{recipient.phone}</p>
                                                    </div>
                                                    <span className="text-sm text-gray-500">{recipient.location || 'N/A'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <MessageCircle size={64} />
                            <p className="mt-4 text-lg">Select a campaign to view details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Campaign Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Campaign</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Summer Sale 2024"
                                    value={newCampaign.name}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                                <select
                                    value={newCampaign.target_audience}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, target_audience: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="all">All Customers</option>
                                    <option value="active">Active Customers</option>
                                    <option value="inactive">Inactive Customers (No purchase in 60+ days)</option>
                                    <option value="vip">VIP Customers</option>
                                    <option value="low_spenders">Low Spenders</option>
                                    <option value="high_spenders">High Spenders</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message
                                    <span className="text-xs text-gray-500 ml-2">
                                        Use {`{{name}}`}, {`{{total_spent}}`}, {`{{location}}`} as placeholders
                                    </span>
                                </label>
                                <textarea
                                    placeholder="Write your message here..."
                                    value={newCampaign.message}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    rows={5}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {newCampaign.message.length}/160 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Templates</label>
                                <div className="space-y-2">
                                    {templates.map((template, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setNewCampaign({ ...newCampaign, message: template.message })}
                                            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                                        >
                                            <p className="font-medium text-gray-800 mb-1">{template.name}</p>
                                            <p className="text-sm text-gray-600">{template.message}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateCampaign}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Campaign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
