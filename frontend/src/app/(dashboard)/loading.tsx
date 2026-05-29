export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-[#0D0E14] border border-[#1E2330] rounded-[4px] animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-[#0D0E14] border border-[#1E2330] rounded-[6px] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
