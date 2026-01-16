'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  context: 'sales' | 'triage' | 'marketing' | 'marketing-triage';
  data?: Record<string, unknown>;
}

export function ChatBot({ context, data }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getContextTitle = () => {
    switch (context) {
      case 'sales':
        return 'Sales Assistant';
      case 'triage':
        return 'Triage Assistant';
      case 'marketing':
        return 'Marketing Assistant';
      case 'marketing-triage':
        return 'Marketing Triage Assistant';
      default:
        return 'Dashboard Assistant';
    }
  };

  const getContextColor = () => {
    switch (context) {
      case 'sales':
        return 'blue';
      case 'triage':
        return 'teal';
      case 'marketing':
        return 'orange';
      case 'marketing-triage':
        return 'purple';
      default:
        return 'gray';
    }
  };

  const color = getContextColor();

  const getSuggestedQuestions = () => {
    switch (context) {
      case 'sales':
        return [
          'Who is the top performing sales rep?',
          'What is the average show rate?',
          'How much MRR did we close this month?',
        ];
      case 'triage':
        return [
          'Who has the best qualification rate?',
          'What is the overall show rate?',
          'Which rep needs improvement?',
        ];
      case 'marketing':
        return [
          'Which channel has the lowest CPL?',
          'Where are we spending the most?',
          'Which channel generates the most leads?',
        ];
      case 'marketing-triage':
        return [
          'Which channel brings the most leads?',
          'What are the lead trends this month?',
          'How do channels compare?',
        ];
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const result = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.message,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-6 bottom-6 z-40 p-4 rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : context === 'sales'
            ? 'bg-blue-600 hover:bg-blue-700'
            : context === 'triage'
            ? 'bg-teal-600 hover:bg-teal-700'
            : context === 'marketing'
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-purple-600 hover:bg-purple-700'
        } text-white`}
        title={isOpen ? 'Close chat' : 'Open AI assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b border-gray-200 ${
            color === 'blue'
              ? 'bg-blue-50'
              : color === 'teal'
              ? 'bg-teal-50'
              : color === 'orange'
              ? 'bg-orange-50'
              : 'bg-purple-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  color === 'blue'
                    ? 'bg-blue-100'
                    : color === 'teal'
                    ? 'bg-teal-100'
                    : color === 'orange'
                    ? 'bg-orange-100'
                    : 'bg-purple-100'
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    color === 'blue'
                      ? 'text-blue-600'
                      : color === 'teal'
                      ? 'text-teal-600'
                      : color === 'orange'
                      ? 'text-orange-600'
                      : 'text-purple-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{getContextTitle()}</h3>
                <p className="text-xs text-gray-500">Powered by Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Clear chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100vh - 180px)' }}>
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  color === 'blue'
                    ? 'bg-blue-100'
                    : color === 'teal'
                    ? 'bg-teal-100'
                    : color === 'orange'
                    ? 'bg-orange-100'
                    : 'bg-purple-100'
                }`}
              >
                <svg
                  className={`w-8 h-8 ${
                    color === 'blue'
                      ? 'text-blue-600'
                      : color === 'teal'
                      ? 'text-teal-600'
                      : color === 'orange'
                      ? 'text-orange-600'
                      : 'text-purple-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h4 className="text-gray-900 font-medium mb-2">Ask me anything!</h4>
              <p className="text-sm text-gray-500 mb-6">
                I can help you analyze your data and find insights.
              </p>

              {/* Suggested Questions */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Try asking:</p>
                {getSuggestedQuestions().map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(question)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors ${
                      color === 'blue'
                        ? 'border-blue-200 text-blue-700 hover:bg-blue-50'
                        : color === 'teal'
                        ? 'border-teal-200 text-teal-700 hover:bg-teal-50'
                        : color === 'orange'
                        ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                        : 'border-purple-200 text-purple-700 hover:bg-purple-50'
                    }`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? color === 'blue'
                        ? 'bg-blue-600 text-white'
                        : color === 'teal'
                        ? 'bg-teal-600 text-white'
                        : color === 'orange'
                        ? 'bg-orange-600 text-white'
                        : 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 text-gray-900"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                color === 'blue'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : color === 'teal'
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : color === 'orange'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
