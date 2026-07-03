export default function PlanLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse space-y-6 px-4 py-8">
      {/* Başlık */}
      <div className="space-y-2">
        <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-8 w-44 rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Gün sekmeleri */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-9 w-16 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800/60" />
        ))}
      </div>

      {/* Öğün kartları */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800/60" />
        ))}
      </div>

      {/* Su takibi */}
      <div className="h-24 rounded-3xl bg-gray-100 dark:bg-gray-800/60" />
    </div>
  );
}
