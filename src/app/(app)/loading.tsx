/** Genel yükleme iskeleti — tüm (app) sayfaları için geri dönüş. */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse space-y-5 px-4 py-8">
      <div className="h-6 w-28 rounded-full bg-gray-200 dark:bg-gray-800" />
      <div className="h-44 rounded-3xl bg-gray-100 dark:bg-gray-800/60" />
      <div className="h-36 rounded-3xl bg-gray-100 dark:bg-gray-800/60" />
      <div className="h-28 rounded-3xl bg-gray-100 dark:bg-gray-800/60" />
    </div>
  );
}
