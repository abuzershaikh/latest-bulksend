import { EmptyState, StatCard } from './AdminUi';
import { ActivationRow } from './UserDisplay';
import { formatCount } from './adminData';

export default function DashboardHome({ stats, users, isLoading, onOpenUser, onOpenUsers }) {
    const latestActivations = users
        .filter((user) => user.status === 'paid' && user.activationMillis)
        .slice(0, 5);

    return (
        <div className="space-y-6">
            <section className="rounded-lg border border-white/10 bg-dark-800 p-5 shadow-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-primary">Live overview</p>
                        <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Dashboard Grid</h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-300">
                            Users, paid plans, payment source and latest activations from Firebase.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenUsers}
                        className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-300"
                    >
                        Open User List
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                <StatCard label="Total Users" value={stats.total} helper="All records" />
                <StatCard label="Paid" value={stats.paid} helper="Active premium" tone="success" />
                <StatCard label="Free" value={stats.free} helper="Free plan" />
                <StatCard label="Expired" value={stats.expired} helper="Needs renewal" tone="warning" />
                <StatCard label="Today" value={stats.today} helper="New users" tone="primary" />
                <StatCard label="Active" value={stats.active} helper="Not suspended" />
                <StatCard label="Razorpay" value={stats.razorpay} helper="Paid source" tone="orange" />
                <StatCard label="Google Play" value={stats.googlePlay} helper="Paid source" tone="success" />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-lg border border-white/10 bg-dark-800 p-5">
                    <div className="mb-4">
                        <p className="text-sm font-semibold text-primary">Latest activation</p>
                        <h3 className="text-xl font-bold text-white">Newest paid users</h3>
                    </div>

                    {isLoading ? (
                        <EmptyState message="Loading activations..." />
                    ) : latestActivations.length ? (
                        <div className="space-y-3">
                            {latestActivations.map((user) => (
                                <ActivationRow key={user.id} user={user} onOpenUser={onOpenUser} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No paid activations found yet." />
                    )}
                </div>

                <div className="rounded-lg border border-white/10 bg-dark-800 p-5">
                    <p className="text-sm font-semibold text-primary">Payment source</p>
                    <h3 className="mt-1 text-xl font-bold text-white">Razorpay vs Google Play</h3>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <PaymentSummaryCard
                            title="Razorpay"
                            value={stats.razorpay}
                            description="Activated through Razorpay payment gateway"
                            tone="orange"
                        />
                        <PaymentSummaryCard
                            title="Google Play"
                            value={stats.googlePlay}
                            description="Activated through Google Play billing"
                            tone="green"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

function PaymentSummaryCard({ title, value, description, tone }) {
    const toneClass = tone === 'orange'
        ? 'border-orange-400/30 bg-orange-500/10 text-orange-100'
        : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';

    return (
        <div className={`rounded-lg border p-4 ${toneClass}`}>
            <div className="flex items-center justify-between gap-3">
                <h4 className="font-bold">{title}</h4>
                <span className="text-2xl font-bold">{formatCount(value)}</span>
            </div>
            <p className="mt-2 text-sm opacity-80">{description}</p>
        </div>
    );
}
