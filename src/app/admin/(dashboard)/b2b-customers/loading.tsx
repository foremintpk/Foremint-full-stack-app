export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="h-10 w-40 bg-gray-200 rounded-full ml-auto" />
      <div className="h-64 w-full bg-gray-100 rounded-2xl border border-gray-100" />
    </div>
  );
}
