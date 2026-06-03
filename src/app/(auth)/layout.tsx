export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">DiyetChat</p>
        </div>
        {children}
      </div>
    </div>
  );
}
