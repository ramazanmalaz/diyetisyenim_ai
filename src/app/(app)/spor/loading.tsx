export default function SporLoading() {
  return (
    <div className="min-h-[calc(100vh-7rem)] animate-pulse bg-black px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {/* Hero */}
        <div className="h-40 rounded-[28px] bg-zinc-900" />

        {/* Gün sekmeleri */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-[72px] shrink-0 rounded-full bg-zinc-900" />
          ))}
        </div>

        {/* Egzersiz listesi */}
        <div className="overflow-hidden rounded-3xl bg-zinc-900">
          <div className="border-b border-white/5 p-5">
            <div className="flex items-center gap-4">
              <div className="h-[72px] w-[72px] rounded-full bg-zinc-800" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 rounded-lg bg-zinc-800" />
                <div className="h-4 w-24 rounded-lg bg-zinc-800" />
              </div>
            </div>
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 rounded-lg bg-zinc-800" />
                <div className="h-3 w-24 rounded-lg bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
