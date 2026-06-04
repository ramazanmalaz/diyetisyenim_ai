export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 0%, rgba(20,168,102,0.14), transparent 70%), radial-gradient(40% 40% at 90% 90%, rgba(54,201,128,0.10), transparent 70%)",
        }}
      />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-lg font-bold tracking-tight text-emerald-600">
            DiyetChat
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
