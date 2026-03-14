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
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <p className="text-sm text-indigo-600 font-semibold">ASI:One Intelligence</p>
                <h1 className="text-3xl font-bold text-gray-900">AI Studio</h1>
                <p className="text-sm text-gray-500 max-w-2xl">
                    A dedicated workspace to chat with Astro AI, trigger pre-built prompts, and inspect the API surface
                    that drives our backend AI routes.
                </p>
            </header>

            <section className="grid lg:grid-cols-2 gap-6">
                {quickActions.map((action) => {
                    const Icon = action.icon;
                    const result = actionResults[action.id];
                    const loading = loadingAction === action.id;
                    return (
                        <div key={action.id} className="rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                            <button
                                onClick={() => handleQuickAction(action)}
                                disabled={loading}
                                className="w-full text-left px-5 py-4 flex items-start gap-4"
                            >
                                <div
                                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}
                                >
                                    {loading ? <Loader2 size={20} className="text-white animate-spin" /> : <Icon size={22} className="text-white" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{action.label}</p>
                                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                                </div>
                                <span className="text-gray-400">→</span>
                            </button>
                            {result && (
                                <div className="px-5 pb-4 text-sm text-gray-700 bg-gray-50">
                                    <p className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </section>

            <section className="grid lg:grid-cols-[2fr_1fr] gap-6">
                <div className="flex flex-col bg-white rounded-2xl border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase text-gray-500 tracking-widest">Conversational</p>
                            <h2 className="text-lg font-semibold text-gray-900">Ask Astro AI anything</h2>
                        </div>
                        <Send size={18} className="text-indigo-600" />
                    </div>
                    <div className="p-6 space-y-4 h-[420px] overflow-y-auto">
                        {messages.map((message, idx) => (
                            <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {message.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center mr-2">
                                        <Bot size={16} />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed rounded-2xl ${
                                        message.role === 'user'
                                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                                            : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-sm'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                                />
                            </div>
                        ))}
                        <div ref={endRef} />
                    </div>
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSend();
                                }
                            }}
                            placeholder="Type a prompt like 'Summarize today's sales'"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button
                            onClick={() => void handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-60"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <article className="bg-white border border-gray-200 rounded-2xl p-5">
                        <p className="text-xs uppercase text-gray-500 tracking-wide">API Surface</p>
                        <h3 className="text-lg font-semibold text-gray-900 mt-1">Endpoints powering AI Studio</h3>
                        <p className="text-sm text-gray-500 mt-2">Each card below matches a backend route you can call from automation or Zapier.</p>
                        <div className="mt-4 space-y-3">
                            {capabilityCards.map((card) => (
                                <div key={card.path} className="rounded-xl border border-gray-100 px-4 py-3 bg-gray-50">
                                    <p className="text-sm font-medium text-gray-900">{card.title}</p>
                                    <p className="text-xs text-indigo-600 mt-0.5">{card.path}</p>
                                    <p className="text-xs text-gray-500 mt-1">{card.description}</p>
                                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                            <span>POST /api/ai</span>
                                            <button
                                                type="button"
                                                onClick={() => copyApiSnippet(card.path)}
                                                className="flex items-center gap-1 text-indigo-600 font-semibold"
                                            >
                                                <Copy size={12} />
                                                Copy API call
                                            </button>
                                        </div>
                                    </div>
                            ))}
                        </div>
                    </article>
                    <article className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-indigo-50">
                                <KeyRound size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">ASI:One API key</p>
                                <p className="text-xs text-gray-500">Update the key and keep this workspace running.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type={showAsiKey ? 'text' : 'password'}
                                    value={asiKeyInput}
                                    placeholder="Paste ASI:One API key"
                                    autoComplete="new-password"
                                    onChange={(e) => setAsiKeyInput(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-2xl px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAsiKey((prev) => !prev)}
                                    className="px-3 py-2 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:border-indigo-300"
                                >
                                    {showAsiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <button
                                    type="button"
                                    onClick={handleCopyAsiKey}
                                    disabled={!asiKeyInput}
                                    className="flex items-center gap-1 px-3 py-1 rounded-2xl border border-transparent text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40"
                                >
                                    <Copy size={12} />
                                    Copy key
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveAsiKey}
                                    disabled={!settings || savingKey}
                                    className="px-3 py-1 rounded-2xl border border-transparent text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40"
                                >
                                    {savingKey ? 'Saving...' : 'Save key'}
                                </button>
                                {keyStatus && <span className="text-green-600">{keyStatus}</span>}
                            </div>
                            <p className="text-xs text-gray-500">
                                {settings?.asi_api_key
                                    ? 'Stored key is active for AI Studio and quick actions.'
                                    : 'Blank key falls back to the ASI_ONE_API_KEY environment value.'}
                            </p>
                        </div>
                    </article>
                    <article className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-5 shadow-lg">
                        <p className="text-sm font-semibold">Need automation?</p>
                        <p className="text-sm mt-1">Call the same `/api/ai` routes from your scripts, Zapier, or Postman. Just include a bearer token from an admin account.</p>
                    </article>
                </div>
            </section>
        </div>
    );
}
