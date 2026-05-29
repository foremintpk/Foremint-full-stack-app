/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/not-found.tsx
 * @description Beautiful 404 error page displayed when an order is not found.
 */

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-sm border border-[#ebebeb] p-8 text-center shadow-sm">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-[#34088f]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-8 h-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold font-manrope text-gray-900 mb-2">Order Not Found</h2>
      <p className="text-gray-500 font-inter max-w-md mb-6">
        The order you are looking for does not exist, has been removed, or you do not have permission to view it.
      </p>
      <Link
        href="/admin/llc-registrations"
        className="inline-flex items-center justify-center px-4 py-2 bg-[#34088f] text-white font-semibold font-inter text-sm hover:opacity-90 active:scale-95 transition-all rounded-[0.125rem]"
      >
        Back to LLC Registrations
      </Link>
    </div>
  );
}
