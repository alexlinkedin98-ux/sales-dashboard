'use client';

import { useState } from 'react';

type QuestionType = 'S' | 'P' | 'I' | 'N';

interface IdentifyQuestionProps {
  sampleQuestion: string;
  scenarioContext: string;
  prospectStatement?: string;
  onAnswer: (answer: QuestionType) => void;
  disabled?: boolean;
}

const TYPE_OPTIONS: { value: QuestionType; label: string; description: string; color: string }[] = [
  {
    value: 'S',
    label: 'Situation',
    description: 'Gathering facts about current state',
    color: 'border-blue-500 bg-blue-50 hover:bg-blue-100',
  },
  {
    value: 'P',
    label: 'Problem',
    description: 'Exploring difficulties and pain points',
    color: 'border-orange-500 bg-orange-50 hover:bg-orange-100',
  },
  {
    value: 'I',
    label: 'Implication',
    description: 'Developing the seriousness/cost',
    color: 'border-red-500 bg-red-50 hover:bg-red-100',
  },
  {
    value: 'N',
    label: 'Need-Payoff',
    description: 'Getting them to articulate the benefit',
    color: 'border-green-500 bg-green-50 hover:bg-green-100',
  },
];

export function IdentifyQuestion({
  sampleQuestion,
  scenarioContext,
  prospectStatement,
  onAnswer,
  disabled,
}: IdentifyQuestionProps) {
  const [selected, setSelected] = useState<QuestionType | null>(null);

  const handleSelect = (type: QuestionType) => {
    if (disabled) return;
    setSelected(type);
  };

  const handleSubmit = () => {
    if (selected) {
      onAnswer(selected);
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {scenarioContext && (
          <div className="text-sm text-gray-600 mb-4">{scenarioContext}</div>
        )}

        {prospectStatement && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Prospect says:</div>
            <div className="text-gray-900 italic">&ldquo;{prospectStatement}&rdquo;</div>
          </div>
        )}

        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">What type of question is this?</div>
          <div className="text-xl font-medium text-gray-900 p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
            &ldquo;{sampleQuestion}&rdquo;
          </div>
        </div>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-4">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={disabled}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selected === option.value
                ? `${option.color} border-2`
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                  selected === option.value
                    ? option.value === 'S'
                      ? 'bg-blue-500 text-white'
                      : option.value === 'P'
                      ? 'bg-orange-500 text-white'
                      : option.value === 'I'
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {option.value}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-600">{option.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!selected || disabled}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
          selected && !disabled
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Submit Answer
      </button>
    </div>
  );
}
