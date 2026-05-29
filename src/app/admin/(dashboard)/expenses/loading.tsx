import React from 'react';

export default function ExpensesLoading() {
  return (
    <div className="space-y-6 font-inter pb-10 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-64 bg-gray-100 rounded-md"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-36 bg-gray-200 rounded-full"></div>
          <div className="h-10 w-32 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`rounded-2xl border border-gray-100 bg-white p-5 ${i === 1 ? 'md:col-span-1' : ''}`}>
            <div className="h-4 w-24 bg-gray-200 rounded-md mb-4"></div>
            <div className="h-8 w-32 bg-gray-200 rounded-md mb-2"></div>
            <div className="h-3 w-40 bg-gray-100 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-200 rounded-full shrink-0"></div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="h-10 w-full sm:max-w-xs bg-gray-200 rounded-full"></div>
          <div className="h-10 w-40 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hidden md:block">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-3 flex justify-between">
          <div className="h-4 w-20 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-20 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-20 bg-gray-200 rounded-md"></div>
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="h-6 w-28 bg-gray-200 rounded-full"></div>
            <div className="h-4 w-48 bg-gray-100 rounded-md"></div>
            <div className="h-4 w-24 bg-gray-100 rounded-md"></div>
            <div className="h-4 w-20 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* Mobile Table */}
      <div className="md:hidden space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl">
            <div className="h-6 w-28 bg-gray-200 rounded-full mb-3"></div>
            <div className="h-4 w-full bg-gray-100 rounded-md mb-3"></div>
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-gray-100 rounded-md"></div>
              <div className="h-4 w-20 bg-gray-200 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
