import { EmptyState, ScreenTitle, StatCard } from './AdminUi';
import { formatCurrencyFromPaise, formatDate } from './adminData';

export default function BalancesScreen({ managers, isLoading, onOpenManager }) {
    const stats = {
        totalManagers: managers.length,
        fundedManagers: managers.filter((manager) => manager.walletBalancePaise > 0).length,
        totalBalancePaise: managers.reduce((sum, manager) => sum + (manager.walletBalancePaise || 0), 0),
        totalTopupPaise: managers.reduce((sum, manager) => sum + (manager.walletTotalTopupPaise || 0), 0),
        totalSpentPaise: managers.reduce((sum, manager) => sum + (manager.walletTotalSpentPaise || 0), 0),
    };

    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="Reseller wallet"
                title="Manager Balances"
                description="Review every reseller wallet balance, topup history, and activation spend from one admin screen."
            />

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Managers" value={stats.totalManagers} helper="All reseller accounts" />
                <StatCard label="Funded" value={stats.fundedManagers} helper="Wallet balance above zero" tone="success" />
                <MoneyCard label="Current Balance" value={formatCurrencyFromPaise(stats.totalBalancePaise)} helper="Combined live wallet value" tone="primary" />
                <MoneyCard label="Topups" value={formatCurrencyFromPaise(stats.totalTopupPaise)} helper="Lifetime credited amount" tone="success" />
                <MoneyCard label="Spent" value={formatCurrencyFromPaise(stats.totalSpentPaise)} helper="Wallet debit on activations" tone="warning" />
            </section>

            <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
                <div className="mb-4">
                    <p className="text-sm font-semibold text-primary">Live balances</p>
                    <h3 className="text-xl font-bold text-white">Reseller wallet list</h3>
                </div>

                {isLoading ? (
                    <EmptyState message="Loading manager balances..." />
                ) : managers.length ? (
                    <div className="space-y-3">
                        {managers.map((manager) => (
                            <article key={manager.id} className="rounded-lg border border-white/10 bg-dark-900 p-4">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="truncate text-lg font-bold text-white">{manager.name}</h4>
                                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${manager.enabled
                                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                                                : 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                                                }`}
                                            >
                                                {manager.enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                        <p className="mt-1 truncate text-sm text-slate-400">{manager.email}</p>
                                        <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                                            <InfoPill label="Balance" value={formatCurrencyFromPaise(manager.walletBalancePaise)} tone="primary" />
                                            <InfoPill label="Topup" value={formatCurrencyFromPaise(manager.walletTotalTopupPaise)} tone="success" />
                                            <InfoPill label="Spent" value={formatCurrencyFromPaise(manager.walletTotalSpentPaise)} tone="warning" />
                                            <InfoPill label="Customers" value={String(manager.totalCustomers)} />
                                        </div>
                                        <p className="mt-3 text-xs text-slate-500">
                                            Last topup {formatDate(manager.walletLastTopupMillis, true)} | Last debit {formatDate(manager.walletLastDebitMillis, true)}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onOpenManager?.(manager)}
                                        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
                                    >
                                        View Manager
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No reseller managers found yet." />
                )}
            </section>
        </div>
    );
}

function InfoPill({ label, value, tone = 'default' }) {
    const toneClass = tone === 'primary'
        ? 'border-sky-400/30 bg-sky-500/10 text-sky-100'
        : tone === 'success'
            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
            : tone === 'warning'
                ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
                : 'border-white/10 bg-white/5 text-slate-100';

    return (
        <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
            <p className="mt-1 font-bold">{value}</p>
        </div>
    );
}

function MoneyCard({ label, value, helper, tone = 'default' }) {
    const toneClass = tone === 'primary'
        ? 'text-sky-200'
        : tone === 'success'
            ? 'text-emerald-300'
            : tone === 'warning'
                ? 'text-amber-200'
                : 'text-white';

    return (
        <div className="rounded-lg border border-white/10 bg-dark-800 p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <div className={`mt-3 text-3xl font-bold ${toneClass}`}>{value}</div>
            <p className="mt-1 text-xs text-slate-400">{helper}</p>
        </div>
    );
}
