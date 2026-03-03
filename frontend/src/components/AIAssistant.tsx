import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { aiChat } from '../services/api';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I am Astro AI. Ask me about customers, sales, campaigns, or your store.',
    },
  ]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const payload = updatedMessages
        .filter((m) => m.role !== 'assistant' || m.content !== '')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiChat.send(payload);
      const reply = res.data?.reply || 'Sorry, no response generated.';

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Unable to connect to AI service.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <h3 className="font-semibold">Astro AI Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded"
              aria-label="Close assistant"
            >
              <X size={18} />
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-white border border-gray-200 text-gray-700 max-w-[85%] px-3 py-2 rounded-lg text-sm">
                Thinking...
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSend();
                }
              }}
              placeholder="Ask Astro AI..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => void handleSend()}
              disabled={isLoading}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 flex items-center justify-center"
          aria-label="Open assistant"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
