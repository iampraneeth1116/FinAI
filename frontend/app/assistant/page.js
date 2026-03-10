"use client";
import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const SUGGESTED_QUESTIONS = [
    "How much did I spend this month?",
    "What's my biggest spending category?",
    "Am I spending more than I earn?",
    "How can I save more money?",
    "Give me a summary of my finances",
];

function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white shadow-sm ${isUser ? 'bg-gradient-to-tr from-blue-500 to-indigo-600' : 'bg-gradient-to-tr from-emerald-400 to-teal-500'}`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-tl-sm shadow-sm'
                }`}>
                {message.text}
            </div>
        </div>
    );
}

export default function Assistant() {
    const [messages, setMessages] = useState([
        {
            role: 'model',
            text: "Hi! I'm FinAI, your personal finance assistant 👋 I can see your real financial data and help you understand your spending, savings, and financial goals. What would you like to know?",
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState([]);
    const [insightsLoading, setInsightsLoading] = useState(true);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setInsightsLoading(false); return; }
        fetch(`${API_BASE}/ai/insights`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                if (data.insights) setInsights(data.insights);
            })
            .catch(console.error)
            .finally(() => setInsightsLoading(false));
    }, []);

    const sendMessage = async (text) => {
        const userMsg = text || input.trim();
        if (!userMsg) return;

        setInput('');
        setLoading(true);

        const newMessages = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMessages);

        try {
            const token = localStorage.getItem('token');
            // Build history (exclude first greeting from model)
            const history = newMessages.slice(1, -1).map(m => ({ role: m.role, text: m.text }));

            const res = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: userMsg, history }),
            });

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'model', text: data.reply || data.error || 'Something went wrong.' }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I had trouble connecting. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full max-h-[calc(100vh-8rem)]">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">FinAI Assistant</h2>
                        <p className="text-xs text-emerald-500">Powered by Gemini • Online</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg, i) => (
                        <MessageBubble key={i} message={msg} />
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                <span className="text-sm text-zinc-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Suggested Questions */}
                {messages.length <= 1 && (
                    <div className="px-6 pb-4 flex flex-wrap gap-2">
                        {SUGGESTED_QUESTIONS.map((q) => (
                            <button
                                key={q}
                                onClick={() => sendMessage(q)}
                                className="text-xs px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 border border-zinc-200 dark:border-zinc-700 transition-colors"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input */}
                <div className="px-4 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 items-end">
                    <textarea
                        rows={1}
                        className="flex-1 resize-none bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-sm outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
                        placeholder="Ask anything about your finances..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 rounded-xl flex items-center justify-center text-white transition-colors shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Insights Sidebar */}
            <div className="lg:w-72 space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">AI Insights</h3>
                    </div>
                    {insightsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Generating insights...
                        </div>
                    ) : insights.length === 0 ? (
                        <p className="text-sm text-zinc-400">Add transactions to get personalized insights.</p>
                    ) : (
                        <div className="space-y-4">
                            {insights.map((insight, i) => (
                                <div key={i} className="border-l-2 border-emerald-500 pl-3">
                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{insight.title}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{insight.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm">
                    <h3 className="font-semibold text-sm mb-1">Pro Tip</h3>
                    <p className="text-xs opacity-90 leading-relaxed">Ask the AI to categorize your spending, predict your savings, or explain any financial term — it's trained on your real data!</p>
                </div>
            </div>
        </div>
    );
}
