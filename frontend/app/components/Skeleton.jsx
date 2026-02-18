export default function Skeleton({ className = '' }) {
    return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
    return (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

export function SkeletonRow() {
    return (
        <div className="flex items-center gap-3 py-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
    );
}
