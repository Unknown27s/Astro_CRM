import { useState, useRef, useEffect } from 'react';
import {
  Bot, X, Send, Minimize2, Maximize2, Sparkles,
  TrendingUp, Users, Megaphone, BarChart3, Loader2, ChevronRight
} from 'lucide-react';
import { aiService } from '../services/api';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type QuickAction = {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  action: () => Promise<string>;
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tab, setTab] = useState<'chat' | 'actions'>('actions');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m **Astro AI**, your CRM intelligence assistant. Use Quick Actions below or ask me anything about your business.',
    },
  ]);
  const [actionResults, setActionResults] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickActions: QuickAction[] = [
    {
      id: 'dashboard',
      icon: BarChart3,
      label: 'Dashboard Summary',
      description: 'AI analysis of today\'s business health',
      color: 'from-violet-500 to-purple-600',
      action: async () => {
        const res = await aiService.dashboardSummary();
        return res.data?.summary || 'No summary available.';
      },
    },
    {
      id: 'forecast',
      icon: TrendingUp,
      label: 'Sales Forecast',
      description: 'AI revenue prediction for next 7 & 30 days',
      color: 'from-blue-500 to-cyan-600',
      action: async () => {
        const res = await aiService.salesForecast();
        const d = res.data;
        return `📈 **7-Day Forecast:** ₹${(d.forecast7Day || 0).toLocaleString()}\n📅 **30-Day Forecast:** ₹${(d.forecast30Day || 0).toLocaleString()}\n🎯 **Confidence:** ${d.confidence || 'medium'}\n\n${d.insight || ''}`;
      },
    },
    {
      id: 'analytics',
      icon: Users,
      label: 'Explain Segments',
      description: 'AI explains your customer clusters',
      color: 'from-emerald-500 to-teal-600',
      action: async () => {
        const res = await aiService.explainAnalytics();
        return res.data?.explanation || 'Run segmentation first from the Analytics page.';
      },
    },
    {
      id: 'report',
      icon: Megaphone,
      label: 'Monthly Report',
      description: 'AI-written executive business summary',
      color: 'from-orange-500 to-amber-600',
      action: async () => {
        const res = await aiService.reportSummary();
        return res.data?.summary || 'No report data available.';
      },
    },
  ];

  const handleQuickAction = async (action: QuickAction) => {
    setLoadingAction(action.id);
    try {
      const result = await action.action();
      setActionResults((prev) => ({ ...prev, [action.id]: result }));
    } catch (err: any) {
      setActionResults((prev) => ({
        ...prev,
        [action.id]: `❌ ${err?.response?.data?.error || 'Failed to fetch. Check your ASI:One API key.'}`,
      }));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const updated: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const payload = updated.map((m) => ({ role: m.role, content: m.content }));
      const res = await aiService.chat(payload);
      const reply = res.data?.reply || 'No response generated.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || 'Unable to connect to AI service.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  const panelWidth = isExpanded ? 'w-[520px]' : 'w-[380px]';
  const panelHeight = isExpanded ? 'h-[680px]' : 'h-[560px]';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          className={`${panelWidth} ${panelHeight} bg-white rounded-2xl shadow-2xl border border-gray-200/80 flex flex-col overflow-hidden transition-all duration-300`}
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Astro AI</h3>
                <p className="text-[10px] text-white/70 leading-tight">ASI:One Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title={isExpanded ? 'Compact' : 'Expand'}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 flex-shrink-0 bg-gray-50">
            <button
              onClick={() => setTab('actions')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === 'actions'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles size={12} />
                Quick Actions
              </span>
            </button>
            <button
              onClick={() => setTab('chat')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                tab === 'chat'
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Send size={12} />
                Chat
              </span>
            </button>
          </div>

          {/* Quick Actions Tab */}
          {tab === 'actions' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                AI-Powered Insights
              </p>
              {quickActions.map((action) => {
                const Icon = action.icon;
                const result = actionResults[action.id];
                const loading = loadingAction === action.id;

                return (
                  <div key={action.id} className="rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => handleQuickAction(action)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                        {loading ? (
                          <Loader2 size={16} className="text-white animate-spin" />
                        ) : (
                          <Icon size={16} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{action.label}</p>
                        <p className="text-xs text-gray-500 truncate">{action.description}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                    </button>
                    {result && (
                      <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100">
                        <p
                          className="text-xs text-gray-700 leading-relaxed mt-2 whitespace-pre-line"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chat Tab */}
          {tab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                        <Bot size={12} className="text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(message.content),
                      }}
                    />
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm">
                      <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-gray-100 bg-white flex gap-2 flex-shrink-0">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                  placeholder="Ask about customers, sales, campaigns..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 placeholder-gray-400"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 flex items-center justify-center transition-all flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
        }`}
        style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}
        title="Astro AI Assistant"
      >
        {isOpen ? <X size={22} className="text-white" /> : <Bot size={24} className="text-white" />}
      </button>
    </div>
  );
}
