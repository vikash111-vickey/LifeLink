import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your LifeLink AI Assistant powered by Google Gemini. Ask me anything about blood donation, health, medical advice, or any general world questions!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      role: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `[Gemini API Key Notice]\nTo enable live AI generation, please set VITE_GEMINI_API_KEY in your .env.local file.\n\nSimulated Answer to "${query}":\nBlood donation is safe, quick, and saves up to 3 lives per donation! Healthy adults can donate every 56 days. Make sure to stay hydrated and eat a iron-rich meal.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isNotice: true,
          },
        ]);
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      // Build conversation payload for Gemini API
      const contentsPayload = messages
        .filter((m) => !m.isNotice)
        .concat(userMsg)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      const modelsToTry = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-1.5-flash-latest'];
      let data = null;
      let lastErr = null;

      for (const model of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: contentsPayload,
                systemInstruction: {
                  parts: [
                    {
                      text: 'You are LifeLink AI, an intelligent, helpful, compassionate, and versatile AI assistant. Answer any kind of real-world question the user asks accurately and thoroughly, whether it is about blood donation, health, science, math, technology, general knowledge, or daily life. Keep responses formatted nicely with markdown bullet points where appropriate.',
                    },
                  ],
                },
              }),
            }
          );
          const resJson = await response.json();
          if (!resJson.error) {
            data = resJson;
            break;
          } else {
            lastErr = resJson.error.message || JSON.stringify(resJson.error);
          }
        } catch (e) {
          lastErr = e.message;
        }
      }

      if (!data) {
        throw new Error(lastErr || 'Could not connect to Gemini API');
      }

      const replyText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Sorry, I could not generate a response right now. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Error communicating with Gemini API: ${err.message}. Please check your API key setup.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'How often can I donate blood?',
    'What foods increase hemoglobin?',
    'Who can receive O-negative blood?',
    'Tips before blood donation',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-auto">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white p-4 rounded-full shadow-[0_10px_35px_rgba(239,68,68,0.5)] border border-white/20 transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center gap-3"
        >
          <div className="relative">
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
          </div>
          <span className="font-bold text-sm tracking-wide pr-1 hidden sm:inline">Ask AI Assistant</span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[540px] bg-slate-950/95 border border-red-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-red-950/80 via-slate-900 to-slate-900 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-red-400" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2 leading-tight">
                  LifeLink AI Assistant
                  <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-mono">
                    Gemini 2.5
                  </span>
                </h3>
                <p className="text-xs text-gray-400">Ask any medical or general question</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm font-sans scrollbar-thin">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-red-600/30 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-md ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white rounded-tr-none'
                      : msg.isNotice
                      ? 'bg-amber-950/40 border border-amber-500/30 text-amber-200 rounded-tl-none'
                      : 'bg-slate-900 border border-white/10 text-gray-100 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="block text-[10px] opacity-60 text-right mt-1.5">{msg.time}</span>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center shrink-0 text-gray-300 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 items-center text-gray-400 text-xs py-2">
                <div className="w-7 h-7 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 px-3 py-2 rounded-2xl">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-gray-400">Thinking with Gemini...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-slate-950 border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap text-[11px] bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-red-500/40 text-gray-300 px-3 py-1 rounded-full transition-colors shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-950 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (medical, blood donor, general)..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-white/15 focus:border-red-500 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white p-2.5 rounded-2xl transition-all shadow-md shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
