/**
 * @file src/app/admin/(dashboard)/loading.tsx
 * @description Highly visual, premium loading skeleton screen representing the dashboard structure during transition.
 * 
 * 1. Server vs Client choice rationale: Server Component. Auto-loaded by Next.js during route navigation transitions.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

export default function AdminDashboardLoading() {
 return (
 <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
 {/* Sidebar Skeleton */}
 <aside className="w-64 bg-[#34088f] flex flex-col p-6 animate-pulse">
 <div className="h-6 w-32 bg-white/20 rounded-[0.125rem] mb-2" />
 <div className="h-3 w-20 bg-white/10 rounded-[0.125rem] mb-12" />
 
 <div className="space-y-6 flex-1">
 {Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="flex items-center gap-4">
 <div className="h-5 w-5 bg-white/20 rounded-[0.125rem]" />
 <div className="h-4 bg-white/20 rounded-[0.125rem] flex-1" />
 </div>
 ))}
 </div>
 </aside>

 {/* Main Area Skeleton */}
 <div className="flex-1 flex flex-col overflow-hidden">
 {/* Header Skeleton */}
 <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between animate-pulse">
 <div className="h-4 w-48 bg-gray-200 rounded-[0.125rem]" />
 <div className="flex items-center gap-6">
 <div className="h-5 w-5 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-5 w-5 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-8 w-8 bg-gray-200 rounded-full" />
 </div>
 </header>

 {/* Content Skeleton */}
 <main className="flex-1 p-6 space-y-6 overflow-y-auto animate-pulse">
 <div className="h-8 w-64 bg-gray-200 rounded-[0.125rem] mb-6" />
 
 {/* Card Skeletons */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="bg-white p-6 border border-gray-100 rounded-[0.125rem] h-32 space-y-3">
 <div className="h-4 w-24 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-8 w-16 bg-gray-200 rounded-[0.125rem]" />
 </div>
 ))}
 </div>

 <div className="bg-white p-6 border border-gray-100 rounded-[0.125rem] h-64 space-y-3">
 <div className="h-5 w-36 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-4 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-4 bg-gray-200 rounded-[0.125rem] w-5/6" />
 <div className="h-4 bg-gray-200 rounded-[0.125rem] w-2/3" />
 </div>
 </main>
 </div>
 </div>
 );
}
