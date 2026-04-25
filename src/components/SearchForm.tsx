'use client';

import { useState } from 'react';

type SearchFormProps = {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  statusMessage?: string;
};

export default function SearchForm({ onSubmit, isLoading, statusMessage }: SearchFormProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onSubmit(url.trim());
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-10">
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <input
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-black dark:text-white"
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
      {isLoading && statusMessage && (
        <p className="mt-4 text-sm text-center text-zinc-500 dark:text-zinc-400 animate-pulse">
          {statusMessage}
        </p>
      )}
    </div>
  );
}
