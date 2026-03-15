import { useState, useRef, useEffect } from 'react';
import { aiService, shop } from '../services/api';
import toast from 'react-hot-toast';
import {
    Bot,
    BarChart3,
    TrendingUp,
    Users,
    Megaphone,
    Sparkles,
    Send,
    Loader2,
    Copy,
    KeyRound,
    Eye,
    EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

const capabilityCards = [
    {
        title: 'Multimodal Chat',
        path: '/api/ai/chat',
        description: 'Send free-form prompts and get conversational answers about sales, campaigns, or data.',
    },
    {
        title: 'Dashboard Summary',
        path: '/api/ai/dashboard-summary',
        description: 'AI interprets KPIs, revenue trends, and top products for exec-ready insights.',
    },
    {
        title: 'Analytics Explanation',
        path: '/api/ai/explain-analytics',
        description: 'Translate customer segments and cluster characteristics into plain English.',
    },
    {
        title: 'Sales Forecast',
        path: '/api/ai/sales-forecast',
        description: 'Predict the next 7/30-day revenue based on the last month of sales.',
    },
    {
        title: 'Monthly Report',
        path: '/api/ai/report-summary',
        description: 'Generate an executive narrative and growth recommendation for any month.',
    },
    {
        title: 'Campaign Generator',
        path: '/api/ai/generate-campaign',
        description: 'Draft SMS marketing copy with placeholders, tone, and CTA auto-generated.',
    },
];

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type QuickAction = {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    action: () => Promise<string>;
};

const API_ROOT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export default function AIStudio() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Ask Astro AI anything or trigger one of the quick AI actions to explore reports, forecasts, or campaigns.',
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [actionResults, setActionResults] = useState<Record<string, string>>({});
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const [settings, setSettings] = useState<any>(null);
    const [asiKeyInput, setAsiKeyInput] = useState('');
    const [showAsiKey, setShowAsiKey] = useState(false);
    const [savingKey, setSavingKey] = useState(false);
    const [keyStatus, setKeyStatus] = useState<string | null>(null);

    const copyApiSnippet = (path: string) => {
        const snippet = `curl -X POST ${API_ROOT}${path} -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{}'`;
        navigator.clipboard.writeText(snippet);
        toast.success('Sample API call copied');
    };

    const handleCopyAsiKey = () => {
        if (!asiKeyInput) {
            toast.error('No API key stored yet');
            return;
        }
        navigator.clipboard.writeText(asiKeyInput);
        toast.success('ASI:One API key copied');
    };

    const handleSaveAsiKey = async () => {
        if (!settings) {
            toast.error('Unable to read store settings');
            return;
        }
        setSavingKey(true);
        try {
            const payload = { ...settings, asi_api_key: asiKeyInput };
            const res = await shop.updateSettings(payload);
            setSettings(res.data.settings);
            setAsiKeyInput(res.data.settings?.asi_api_key || '');
            setKeyStatus('Saved');
            toast.success('ASI:One API key saved');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to save API key');
        } finally {
            setSavingKey(false);
        }
    };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await shop.getSettings();
                setSettings(res.data.settings);
                setAsiKeyInput(res.data.settings?.asi_api_key || '');
            } catch (error: any) {
                toast.error('Unable to load AI settings');
            }
        };
        void loadSettings();
    }, []);

    const quickActions: QuickAction[] = [
        {
            id: 'summary',
            label: 'Dashboard Summary',
            description: 'Pull KPI context, revenue health, and one recommendation.',
            icon: BarChart3,
            color: 'from-violet-500 to-purple-600',
            action: async () => {
                const res = await aiService.dashboardSummary();
                return res.data?.summary || 'No summary available.';
            },
        },
        {
            id: 'forecast',
            label: 'Sales Forecast',
            description: 'Blend trends into 7/30 day projections.',
            icon: TrendingUp,
            color: 'from-blue-500 to-cyan-600',
            action: async () => {
                const res = await aiService.salesForecast();
                const d = res.data;
                return `7-day: ₹${Number(d.forecast7Day || 0).toLocaleString()} · 30-day: ₹${Number(
                    d.forecast30Day || 0
                ).toLocaleString()} · confidence: ${d.confidence || 'medium'}\n${d.insight || ''}`;
            },
        },
        {
            id: 'segments',
            label: 'Explain Segments',
            description: 'Turn your ML segments into plain-language insights.',
            icon: Users,
            color: 'from-emerald-500 to-teal-600',
            action: async () => {
                const res = await aiService.explainAnalytics();
                return res.data?.explanation || 'Run segmentation from Analytics first.';
            },
        },
        {
            id: 'report',
            label: 'Monthly Report',
            description: 'Executive summary + next best action.',
            icon: Sparkles,
            color: 'from-orange-500 to-amber-600',
            action: async () => {
                const res = await aiService.reportSummary();
                return res.data?.summary || 'Report data not available yet.';
            },
        },
        {
            id: 'campaign',
            label: 'Generate Campaign',
            description: 'One-click SMS copy with placeholders.',
            icon: Megaphone,
            color: 'from-pink-500 to-rose-600',
            action: async () => {
                const res = await aiService.generateCampaign({
                    audience: 'VIP customers',
                    goal: 'drive repeat purchases',
                    tone: 'friendly and urgent',
                });
                return `Subject: ${res.data?.subject || 'Campaign'}\nMessage: ${res.data?.message || 'No message generated.'}`;
            },
        },
    ];

    const handleQuickAction = async (action: QuickAction) => {
        setLoadingAction(action.id);
        try {
            const result = await action.action();
            setActionResults((prev) => ({ ...prev, [action.id]: result }));
        } catch (error: any) {
            setActionResults((prev) => ({
                ...prev,
                [action.id]: `Failed: ${error?.response?.data?.error || error?.message || 'Unknown'}`,
            }));
            toast.error('Check your ASI:One API key or backend connectivity.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;
        const userMessage: ChatMessage = { role: 'user', content: trimmed };
        const nextMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(nextMessages);
        setInput('');
        setIsLoading(true);
        try {
            const res = await aiService.chat(
                nextMessages as { role: 'user' | 'assistant' | 'system'; content: string }[]
            );
            const reply = res.data?.reply || 'No response generated.';
            const aiMessage: ChatMessage = { role: 'assistant', content: reply };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error: any) {
            const msg = error?.response?.data?.error || 'Unable to reach the AI service.';
            const errorMessage: ChatMessage = { role: 'assistant', content: `❌ ${msg}` };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMarkdown = (text: string) =>
        text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col gap-1">
                <Badge variant="default" className="w-fit">ASI:One Intelligence</Badge>
                <h1 className="text-3xl font-bold text-neutral-900">AI Studio</h1>
                <p className="text-sm text-neutral-500 max-w-2xl">
                    A dedicated workspace to chat with Astro AI, trigger pre-built prompts, and inspect the API surface
                    that drives our backend AI routes.
                </p>
            </header>

            {/* Quick Actions Grid */}
            <section className="grid lg:grid-cols-2 gap-4">
                {quickActions.map((action) => {
                    const Icon = action.icon;
                    const result = actionResults[action.id];
                    const loading = loadingAction === action.id;
                    return (
                        <Card
                            key={action.id}
                            className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => !loading && handleQuickAction(action)}
                        >
                            <CardContent className="p-5">
                                <button
                                    onClick={() => handleQuickAction(action)}
                                    disabled={loading}
                                    className="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}
                                        >
                                            {loading ? (
                                                <Loader2 size={20} className="text-white animate-spin" />
                                            ) : (
                                                <Icon size={22} className="text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-neutral-900">{action.label}</p>
                                            <p className="text-sm text-neutral-500 mt-1">{action.description}</p>
                                        </div>
                                    </div>
                                </button>
                                {result && (
                                    <div className="mt-4 pt-4 border-t border-neutral-100">
                                        <p
                                            className="text-sm text-neutral-700 whitespace-pre-line"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </section>

            {/* Main Chat Section */}
            <section className="grid lg:grid-cols-[2fr_1fr] gap-6">
                {/* Chat Panel */}
                <Card className="flex flex-col h-[600px]">
                    <CardHeader className="border-b border-neutral-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase text-neutral-500 tracking-widest">Conversational</p>
                                <CardTitle>Ask Astro AI anything</CardTitle>
                            </div>
                            <Send size={18} className="text-primary-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((message, idx) => (
                            <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center mr-3 flex-shrink-0">
                                        <Bot size={16} />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed rounded-lg ${message.role === 'user'
                                            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-br-none'
                                            : 'bg-neutral-100 text-neutral-900 rounded-bl-none border border-neutral-200'
                                        }`}
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                />
                            </div>
                        ))}
                        <div ref={endRef} />
                    </CardContent>
                    <div className="border-t border-neutral-200 p-4 bg-neutral-50">
                        <div className="flex items-center gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        void handleSend();
                                    }
                                }}
                                placeholder="Type a prompt like 'Summarize today's sales'"
                                className="flex-1"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={() => void handleSend()}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                            >
                                {isLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Sidebar */}
                <div className="space-y-4 flex flex-col">
                    {/* API Surface Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">API Surface</CardTitle>
                            <p className="text-xs text-neutral-500 mt-1">
                                Each endpoint below matches a backend route you can call from automation or Zapier.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {capabilityCards.map((card) => (
                                <div key={card.path} className="rounded-lg border border-neutral-200 p-3 bg-neutral-50 hover:border-primary-300 transition-colors">
                                    <p className="text-sm font-medium text-neutral-900">{card.title}</p>
                                    <p className="text-xs text-primary-600 mt-1 font-mono">{card.path}</p>
                                    <p className="text-xs text-neutral-500 mt-1">{card.description}</p>
                                    <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                                        <span>POST /api/ai</span>
                                        <button
                                            type="button"
                                            onClick={() => copyApiSnippet(card.path)}
                                            className="flex items-center gap-1 text-primary-600 font-semibold hover:text-primary-700"
                                        >
                                            <Copy size={12} />
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* API Key Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary-50">
                                    <KeyRound size={18} className="text-primary-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">ASI:One API Key</CardTitle>
                                    <p className="text-xs text-neutral-500 mt-0.5">Keep this workspace running</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Input
                                    type={showAsiKey ? 'text' : 'password'}
                                    value={asiKeyInput}
                                    placeholder="Paste ASI:One API key"
                                    autoComplete="new-password"
                                    onChange={(e) => setAsiKeyInput(e.target.value)}
                                    className="flex-1 font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    onClick={() => setShowAsiKey((prev) => !prev)}
                                >
                                    {showAsiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCopyAsiKey}
                                    disabled={!asiKeyInput}
                                    fullWidth
                                >
                                    <Copy size={12} className="mr-1" />
                                    Copy Key
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSaveAsiKey}
                                    disabled={!settings || savingKey}
                                    fullWidth
                                >
                                    {savingKey ? 'Saving...' : 'Save Key'}
                                </Button>
                            </div>
                            {keyStatus && <p className="text-xs text-success-600 font-semibold">{keyStatus}</p>}
                            <p className="text-xs text-neutral-500">
                                {settings?.asi_api_key
                                    ? 'Stored key is active for AI Studio.'
                                    : 'Blank key falls back to ASI_ONE_API_KEY env value.'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white border-0">
                        <CardContent className="p-5">
                            <p className="text-sm font-semibold">Need automation?</p>
                            <p className="text-xs mt-2 opacity-90">
                                Call the same `/api/ai` routes from your scripts, Zapier, or Postman. Just include a bearer token.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
}
