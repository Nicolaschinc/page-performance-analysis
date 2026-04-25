import React, { useEffect, useState } from 'react';

interface Run {
  id: string;
  url: string;
  createdAt: string;
  score: number | null;
  lcp: number | null;
  cls: number | null;
  fcp: number | null;
  tbt: number | null;
}

interface HistoryPanelProps {
  url: string;
  refreshTrigger?: number;
}

export default function HistoryPanel({ url, refreshTrigger = 0 }: HistoryPanelProps) {
  const [history, setHistory] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/history?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        setHistory(data.runs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [url, refreshTrigger]);

  if (!url) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">Performance History</h2>
      
      {isLoading && <div className="text-zinc-500">Loading history...</div>}
      {error && <div className="text-red-500">{error}</div>}
      
      {!isLoading && !error && history.length === 0 && (
        <div className="text-zinc-500">No previous runs found for this URL.</div>
      )}

      {!isLoading && !error && history.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">LCP (ms)</th>
                <th className="px-4 py-3 font-medium">CLS</th>
                <th className="px-4 py-3 font-medium">FCP (ms)</th>
                <th className="px-4 py-3 rounded-tr-lg font-medium">TBT (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {history.map((run, index) => {
                const prevRun = history[index + 1];
                
                const renderDiff = (current: number | null, previous: number | null, lowerIsBetter = true) => {
                  if (current === null || previous === null) return null;
                  const diff = current - previous;
                  if (diff === 0) return <span className="text-zinc-400 ml-1 text-xs">-</span>;
                  
                  const isGood = lowerIsBetter ? diff < 0 : diff > 0;
                  return (
                    <span className={`ml-1 text-xs ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                      {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(diff % 1 !== 0 ? 2 : 0)}
                    </span>
                  );
                };

                return (
                  <tr key={run.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {run.score ?? '-'}
                      {renderDiff(run.score, prevRun?.score, false)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {run.lcp ?? '-'}
                      {renderDiff(run.lcp, prevRun?.lcp)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {run.cls ?? '-'}
                      {renderDiff(run.cls, prevRun?.cls)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {run.fcp ?? '-'}
                      {renderDiff(run.fcp, prevRun?.fcp)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {run.tbt ?? '-'}
                      {renderDiff(run.tbt, prevRun?.tbt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
