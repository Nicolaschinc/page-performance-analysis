'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setStatusMessage(`Fetching PageSpeed for ${url}...`);
    
    // The actual fetch and streaming logic will be implemented in Task 5
    // For now, we just simulate the state transition
    setTimeout(() => {
      setStatusMessage('AI Analyzing...');
      setTimeout(() => {
        setIsLoading(false);
        setStatusMessage('');
      }, 2000);
    }, 2000);
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
      </main>
    </div>
  );
}
