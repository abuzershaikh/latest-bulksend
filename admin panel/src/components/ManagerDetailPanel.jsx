import { Badge, EmptyState } from './AdminUi';
import { formatDate, statusBadgeClass, statusLabel } from './adminData';

export default function ManagerDetailPanel({ manager, onClose, onOpenUser, onToggleAccess, isBusy }) {
    return (
        <div className="fixed inset-0 z-40 bg-slate-950/70 p-0 backdrop-blur-sm md:p-6">
            <aside className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border border-white/10 bg-dark-900 shadow-2xl md:rounded-lg">
                <div className="border-b border-white/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-primary">Manager Performance</p>
                            <h2 className="mt-1 truncate text-2xl font-bold text-white">{manager.name}</h2>
                            <p className="mt-1 truncate text-sm text-slate-400">{manager.email}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-white/10"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    <section className="grid gap-3 md:grid-cols-4">
                        <MetricTile label="Customers" value={manager.totalCustomers} />
                        <MetricTile label="Active" value={manager.activeCustomers} tone="success" />
                        <MetricTile label="Expired" value={manager.expiredCustomers} tone="warning" />
                        <MetricTile label="Free" value={manager.freeCustomers} />
                    </section>

                    <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={manager.enabled
                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                                : 'border-rose-400/30 bg-rose-500/10 text-rose-100'}
                            >
                                {manager.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">
                                {manager.totalCustomers} customers
                            </Badge>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <InfoRow label="Last login" value={formatDate(manager.lastLoginMillis, true)} />
                            <InfoRow label="Last activation" value={formatDate(manager.latestActivationMillis, true)} />
                            <InfoRow label="Created" value={formatDate(manager.createdMillis, true)} />
                            <InfoRow label="Updated" value={formatDate(manager.updatedMillis, true)} />
                            <InfoRow label="Created by" value={manager.createdByName || manager.createdByEmail || 'Not recorded'} />
                            <InfoRow label="Updated by" value={manager.updatedByName || manager.updatedByEmail || 'Not recorded'} />
                        </div>
                        <div className="mt-4">
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => onToggleAccess(manager, !manager.enabled)}
                                className={`rounded-lg px-4 py-3 text-sm font-bold transition ${manager.enabled
                                    ? 'border border-rose-400/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15'
                                    : 'bg-primary text-slate-950 hover:brightness-105'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                                {isBusy
                                    ? 'Saving...'
                                    : manager.enabled
                                        ? 'Disable Manager Access'
                                        : 'Enable Manager Access'}
                            </button>
                        </div>
                    </section>

                    <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
                        <div className="mb-4">
                            <p className="text-sm font-semibold text-primary">Customer List</p>
                            <h3 className="text-xl font-bold text-white">Users Activated By This Manager</h3>
                        </div>

                        {manager.customers.length ? (
                            <div className="space-y-3">
                                {manager.customers.map((user) => (
                                    <article key={user.id} className="rounded-lg border border-white/10 bg-dark-900 p-4">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-lg font-bold text-white">{user.name}</h4>
                                                    <Badge className={statusBadgeClass(user.status)}>{statusLabel(user.status)}</Badge>
                                                </div>
                                                <p className="mt-1 truncate text-sm text-slate-400">{user.email} | {user.phone}</p>
                                                <p className="mt-1 text-sm text-slate-300">
                                                    {user.plan} | Activated {formatDate(user.activationMillis, true)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onOpenUser(user)}
                                                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
                                            >
                                                Open User
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No users have been activated by this manager yet." />
                        )}
                    </section>
                </div>
            </aside>
        </div>
    );
}

function MetricTile({ label, value, tone = 'default' }) {
    const toneClass = tone === 'success'
        ? 'text-emerald-200'
        : tone === 'warning'
            ? 'text-amber-100'
            : 'text-white';

    return (
        <div className="rounded-lg border border-white/10 bg-dark-800 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <div className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="rounded-lg border border-white/10 bg-dark-900 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-1 text-sm text-slate-100">{value}</p>
        </div>
    );
}
