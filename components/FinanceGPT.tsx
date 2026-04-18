'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Zap, Minimize2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

// Pre-defined responses for common finance questions (no API key needed)
const getResponse = (question: string): string => {
  const q = question.toLowerCase();
  
  const responses: Record<string, string> = {
    'save money': "Start with the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings. Track every expense for a week to identify spending leaks! 💰",
    'saving': "Start with the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings. Track every expense for a week to identify spending leaks! 💰",
    'budget': "Use the zero-based budgeting method: allocate every rupee to a category (rent, food, savings, etc.). Apps like FinPath can help automate this! 📊",
    'sip': "SIP (Systematic Investment Plan) lets you invest small amounts monthly in mutual funds. Start with just ₹500/month in an index fund! 📈",
    'mutual fund': "Mutual funds pool money from many investors to buy stocks/bonds. Start with large-cap or index funds for lower risk. Returns historically 10-12% 📊",
    'emergency fund': "Save 6 months of expenses in a liquid fund or high-interest savings account. Start with ₹5,000/month - you'll reach ₹1L in 20 months! 🛡️",
    'nifty': "Nifty 50 tracks India's top 50 companies. It's returned ~14% annually over 20 years. Great for long-term wealth building! 📈",
    'sensex': "Sensex tracks 30 top companies on BSE. Similar to Nifty, it's a benchmark for Indian stock market performance 🎯",
    'credit card': "Use credit cards wisely: pay full balance monthly, keep utilization below 30%, and maximize reward points. Never pay interest! 💳",
    'loan': "Compare interest rates across banks. Home loan rates: 8.5-10%, Personal loan: 10-15%. Always read fine print! 🏦",
    'tax': "Save tax under 80C up to ₹1.5L via PPF, ELSS, or life insurance. Section 80D gives ₹25k-50k for health insurance 💰",
    'retirement': "Start early! Investing ₹5,000/month from age 25 vs 35 can mean ₹3.5Cr vs ₹1.5Cr difference at 60. Time is money! ⏰",
    'stock market': "Start with index funds or large-cap stocks. Learn basics of P/E ratio, market cap, and diversification. Never invest money you can't lose! 📊",
    'fd': "Fixed Deposits give 7-8% guaranteed returns. Senior citizens get 0.5% extra. Good for emergency funds! 🏦",
    'ppf': "PPF gives ~7.1% tax-free returns with 15-year lock-in. Best for long-term safe goals like retirement! 🌟",
    'gold': "Gold is a good hedge against inflation. Consider Gold ETFs or Sovereign Gold Bonds instead of physical gold 🥇",
  };
  
  // Find matching response
  for (const [key, response] of Object.entries(responses)) {
    if (q.includes(key)) {
      return response;
    }
  }
  
  return "Great question! As a finance assistant, I can help with budgeting, saving, investing basics (SIP, Mutual Funds), emergency funds, taxes, and retirement planning. What specific topic interests you? 💡\n\nTry asking about: 'How to save money?', 'What is SIP?', 'Emergency fund size?', or 'How to start investing?'";
};

export function FinanceChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hi! I'm FinPath AI, your personal finance assistant. Ask me about budgeting, saving, investing, or any money question!",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = getResponse(userMessage.content);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 600);
  };

  const quickQuestions = [
    "How to save money?",
    "What is SIP?",
    "Emergency fund size?",
    "Best way to invest?",
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 bg-brand hover:bg-brand-dim text-[#0A0A0A] font-bold rounded-full p-4 shadow-lg transition-all z-40 group animate-bounce"
      >
        <MessageSquare size={22} className="group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-6 bg-surface-raised border border-brand/30 rounded-xl p-3 shadow-xl z-40 cursor-pointer hover:border-brand transition-all group"
      >
        <div className="flex items-center gap-2">
          <div className="bg-brand rounded-lg p-1.5">
            <Zap size={14} className="text-[#0A0A0A]" />
          </div>
          <span className="text-sm font-semibold text-text-base">FinPath AI</span>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-surface-raised border border-border rounded-xl shadow-2xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-brand-muted/20 to-transparent">
        <div className="flex items-center gap-2">
          <div className="bg-brand rounded-lg p-1.5">
            <Zap size={16} className="text-[#0A0A0A]" />
          </div>
 <div>
            <span className="font-semibold text-text-base">FinPath AI</span>
            <p className="text-xs text-text-faint">Your finance assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-surface transition-colors"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-surface transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-brand text-[#0A0A0A]'
                  : 'bg-surface border border-border text-text-base'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={10} className="text-brand" />
                  <span className="text-[10px] font-semibold text-brand">FinPath AI</span>
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className="text-[10px] mt-1 opacity-50">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text-muted">
              <Loader2 size={14} className="animate-spin inline mr-2" />
              Thinking...
            </div>
          </div>
        )}
        
        {/* Quick questions suggestions (show only when few messages) */}
        {messages.length <= 2 && !isLoading && (
          <div className="mt-4">
            <p className="text-xs text-text-faint mb-2 text-center">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => {
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      handleSubmit(fakeEvent);
                    }, 100);
                  }}
                  className="text-xs bg-surface border border-border rounded-full px-3 py-1.5 text-text-muted hover:text-text-base hover:border-brand/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-base placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-brand hover:bg-brand-dim text-[#0A0A0A] rounded-xl px-4 py-2 transition-all disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
      
      {/* Disclaimer */}
      <div className="text-center text-[10px] text-text-faint py-2 border-t border-border">
        🤖 AI assistant for educational purposes only
      </div>
    </div>
  );
}