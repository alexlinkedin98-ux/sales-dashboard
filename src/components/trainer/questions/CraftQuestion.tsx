'use client';

import { useState, useRef, useEffect } from 'react';

interface CraftQuestionProps {
  expectedType: string;
  hints?: string[];
  onSubmit: (response: string) => void;
  disabled?: boolean;
  mode: 'learn' | 'practice' | 'live_sim';
}

export function CraftQuestion({
  expectedType,
  hints,
  onSubmit,
  disabled,
  mode,
}: CraftQuestionProps) {
  const [response, setResponse] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    // Auto-focus the textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmit(response.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'S':
        return {
          label: 'Situation',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          tip: 'Gather facts: "What...", "How many...", "Who..."',
        };
      case 'P':
        return {
          label: 'Problem',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          tip: 'Find pain: "What challenges...", "Where do you struggle..."',
        };
      case 'I':
        return {
          label: 'Implication',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          tip: 'Build urgency: "What\'s that costing...", "How does that affect..."',
        };
      case 'N':
        return {
          label: 'Need-Payoff',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          tip: 'Paint the future: "Would it help if...", "How would that impact..."',
        };
      default:
        return { label: type, color: 'text-gray-600', bgColor: 'bg-gray-50', tip: '' };
    }
  };

  const typeInfo = getTypeInfo(expectedType);

  return (
    <div className="space-y-4">
      {/* Type Reminder */}
      <div className={`${typeInfo.bgColor} rounded-xl p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">Craft a </span>
            <span className={`font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
            <span className="text-sm text-gray-600"> question</span>
          </div>
          {hints && hints.length > 0 && mode === 'learn' && (
            <button
              onClick={() => setShowHints(!showHints)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {showHints ? 'Hide hints' : 'Show hints'}
            </button>
          )}
        </div>
        <div className="text-sm text-gray-600 mt-1">{typeInfo.tip}</div>

        {/* Hints */}
        {showHints && hints && hints.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Hints:</div>
            <ul className="text-sm text-gray-600 space-y-1">
              {hints.map((hint, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question here..."
          disabled={disabled}
          className={`w-full p-4 border-2 rounded-xl resize-none focus:outline-none focus:border-indigo-500 transition-colors ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
          rows={4}
        />
        <div className="absolute bottom-3 right-3 text-xs text-gray-400">
          ⌘ + Enter to submit
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!response.trim() || disabled}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
          response.trim() && !disabled
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Submit Question
      </button>

      {/* Quick Tips */}
      {mode === 'learn' && (
        <div className="text-center">
          <div className="text-sm text-gray-500">
            💡 Tip: Make your question open-ended (avoid yes/no questions)
          </div>
        </div>
      )}
    </div>
  );
}
