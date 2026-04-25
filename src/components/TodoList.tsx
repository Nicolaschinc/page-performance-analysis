import React from 'react';
import ReactMarkdown from 'react-markdown';

interface TodoListProps {
  markdownText: string;
}

export default function TodoList({ markdownText }: TodoListProps) {
  if (!markdownText) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">Performance Action Plan</h2>
      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <ReactMarkdown>{markdownText}</ReactMarkdown>
      </div>
    </div>
  );
}
