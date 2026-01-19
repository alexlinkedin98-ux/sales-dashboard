'use client';

interface FeedbackCardProps {
  feedback: string;
  improvedVersion?: string;
  identifiedType?: string;
  expectedType: string;
  typeCorrect: boolean;
  breakdown?: {
    typeComponent: number;
    qualityComponent: number;
    naturalnessComponent: number;
  };
}

export function FeedbackCard({
  feedback,
  improvedVersion,
  identifiedType,
  expectedType,
  typeCorrect,
  breakdown,
}: FeedbackCardProps) {
  const getTypeName = (type: string) => {
    switch (type) {
      case 'S': return 'Situation';
      case 'P': return 'Problem';
      case 'I': return 'Implication';
      case 'N': return 'Need-Payoff';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'S': return 'text-blue-600 bg-blue-100';
      case 'P': return 'text-orange-600 bg-orange-100';
      case 'I': return 'text-red-600 bg-red-100';
      case 'N': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Type Comparison */}
      <div className={`px-6 py-4 ${typeCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-2xl ${typeCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {typeCorrect ? '✓' : '✗'}
            </span>
            <div>
              <div className="font-medium text-gray-900">
                {typeCorrect ? 'Correct Question Type!' : 'Wrong Question Type'}
              </div>
              <div className="text-sm text-gray-600">
                Expected: <span className={`font-medium px-2 py-0.5 rounded ${getTypeColor(expectedType)}`}>
                  {getTypeName(expectedType)}
                </span>
                {identifiedType && identifiedType !== expectedType && (
                  <>
                    {' '}• Your question was: <span className={`font-medium px-2 py-0.5 rounded ${getTypeColor(identifiedType)}`}>
                      {getTypeName(identifiedType)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {breakdown && (
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-700 mb-3">Score Breakdown</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Type Accuracy (40%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(breakdown.typeComponent / 40) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {Math.round(breakdown.typeComponent)}/40
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quality (40%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(breakdown.qualityComponent / 40) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {Math.round(breakdown.qualityComponent)}/40
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Naturalness (20%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(breakdown.naturalnessComponent / 20) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {Math.round(breakdown.naturalnessComponent)}/20
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Text */}
      <div className="px-6 py-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <div className="font-medium text-gray-900 mb-1">Feedback</div>
            <div className="text-gray-700">{feedback}</div>
          </div>
        </div>
      </div>

      {/* Improved Version */}
      {improvedVersion && (
        <div className="px-6 py-4 bg-indigo-50 border-t border-indigo-100">
          <div className="flex items-start gap-3">
            <span className="text-xl">✨</span>
            <div>
              <div className="font-medium text-indigo-900 mb-1">Even Better Version</div>
              <div className="text-indigo-800 italic">&ldquo;{improvedVersion}&rdquo;</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
