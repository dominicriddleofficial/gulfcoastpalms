import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-40 mb-1" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="platform-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="platform-card rounded-xl p-5 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
      <div className="platform-card rounded-xl p-5 space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-3 overflow-hidden">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-56 rounded-lg shrink-0" />)}
        </div>
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex gap-1.5">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-7 w-16 rounded-full" />)}
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-24 mb-1" />
        <Skeleton className="h-4 w-40" />
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="platform-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(j => <Skeleton key={j} className="h-14 w-full rounded-lg" />)}
          </div>
        </div>
      ))}
    </div>
  );
}
