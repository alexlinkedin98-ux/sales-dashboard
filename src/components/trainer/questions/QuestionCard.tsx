'use client';

interface ProspectPersona {
  name: string;
  role: string;
  company: string;
  revenue?: string;
  teamSize?: string;
}

interface QuestionCardProps {
  prospectPersona?: ProspectPersona;
  scenarioContext: string;
  prospectStatement: string;
  questionType?: string;
  level: number;
}

export function QuestionCard({
  prospectPersona,
  scenarioContext,
  prospectStatement,
  questionType,
  level,
}: QuestionCardProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'S': return { label: 'Situation', color: 'bg-blue-100 text-blue-700' };
      case 'P': return { label: 'Problem', color: 'bg-orange-100 text-orange-700' };
      case 'I': return { label: 'Implication', color: 'bg-red-100 text-red-700' };
      case 'N': return { label: 'Need-Payoff', color: 'bg-green-100 text-green-700' };
      default: return { label: type, color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">Level {level}</span>
            {questionType && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeLabel(questionType).color}`}>
                Craft a {getTypeLabel(questionType).label} question
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prospect Info */}
      {prospectPersona && (
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{prospectPersona.name}</div>
              <div className="text-sm text-gray-600">
                {prospectPersona.role} at {prospectPersona.company}
              </div>
              {(prospectPersona.revenue || prospectPersona.teamSize) && (
                <div className="text-xs text-gray-500 mt-1">
                  {prospectPersona.revenue && <span>{prospectPersona.revenue}</span>}
                  {prospectPersona.revenue && prospectPersona.teamSize && <span> • </span>}
                  {prospectPersona.teamSize && <span>{prospectPersona.teamSize}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scenario Context */}
      {scenarioContext && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-sm text-gray-600">{scenarioContext}</div>
        </div>
      )}

      {/* Prospect Statement */}
      <div className="px-6 py-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <span className="text-sm">💬</span>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Prospect says:</div>
            <div className="text-lg text-gray-900 italic">
              &ldquo;{prospectStatement}&rdquo;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
