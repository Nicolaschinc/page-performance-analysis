'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import TodoList from '@/components/TodoList';
import HistoryPanel from '@/components/HistoryPanel';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [markdownText, setMarkdownText] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setStatusMessage(`Fetching PageSpeed for ${url}...`);
    setMarkdownText('');
    setCurrentUrl(url);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze URL');
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      setStatusMessage('AI Analyzing...');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);
                
                if (parsed.type === 'metrics') {
                  setStatusMessage('Generating Todo List...');
                } else if (parsed.type === 'text') {
                  setMarkdownText((prev) => prev + parsed.data);
                } else if (parsed.type === 'done') {
                  // Stream finished
                  setRefreshTrigger((prev) => prev + 1);
                } else if (parsed.type === 'error') {
                  console.error('Stream error:', parsed.data);
                  setStatusMessage(`Error: ${parsed.data}`);
                }
              } catch (e) {
                console.error('Error parsing stream data', e, dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? `Error: ${error.message}` : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
      setStatusMessage((prev) => (prev.startsWith('Error') ? prev : ''));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl mx-auto flex-col items-center py-24 px-6 sm:px-12">
        <div className="text-center max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl md:text-6xl">
            AI Performance Optimizer
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Enter a URL to analyze its mobile performance with Google PageSpeed Insights.
            Our AI will generate a prioritized, actionable Todo List to help you improve your Core Web Vitals.
          </p>
        </div>

        <SearchForm 
          onSubmit={handleAnalyze} 
          isLoading={isLoading} 
          statusMessage={statusMessage} 
        />

        {markdownText && <TodoList markdownText={markdownText} />}
        
        {currentUrl && <HistoryPanel url={currentUrl} refreshTrigger={refreshTrigger} />}
      </main>
    </div>
  );
}
