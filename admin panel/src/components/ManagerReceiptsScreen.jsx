import { Badge, EmptyState, ScreenTitle, StatCard } from './AdminUi';
import { formatCurrencyFromPaise, formatDate, methodBadgeClass } from './adminData';

export default function ManagerReceiptsScreen({
    activations,
    isLoading,
    busyActivationId,
    onMarkReceived,
    onOpenUser,
}) {
    const pendingActivations = activations.filter((activation) => !activation.adminPaymentReceived);
    const clearedToday = activations.filter((activation) => activation.adminPaymentReceived && isToday(activation.adminPaymentReceivedMillis));
    const managersWithPending = new Set(pendingActivations.map((activation) => activation.managerEmail).filter(Boolean)).size;

    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="Receipt queue"
                title="Manager Payment Notifications"
                description="Review manager activations, keep pending dues sorted on top, and mark each admin receipt before that manager can activate again."
            />

            <section className="grid gap-3 md:grid-cols-4">
                <StatCard label="Pending" value={pendingActivations.length} helper="Need admin receipt" tone="warning" />
                <StatCard label="Managers Blocked" value={managersWithPending} helper="Cannot activate again yet" tone="orange" />
                <StatCard label="Total Logged" value={activations.length} helper="All manager activations" />
                <StatCard label="Cleared Today" value={clearedToday.length} helper="Marked received today" tone="success" />
            </section>

            <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
                {isLoading ? (
                    <EmptyState message="Loading manager payment notifications..." />
                ) : activations.length ? (
                    <div className="space-y-3">
                        {activations.map((activation) => (
                            <article key={activation.id} className="rounded-lg border border-white/10 bg-dark-900 p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-lg font-bold text-white">{activation.userName}</h4>
                                            <Badge className={activation.adminPaymentReceived
                                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                                                : 'border-amber-400/30 bg-amber-500/10 text-amber-100'}
                                            >
                                                {activation.adminPaymentReceived ? 'Received' : 'Pending'}
                                            </Badge>
                                            <Badge className={methodBadgeClass(activation.paymentMethod.id)}>{activation.paymentMethod.label}</Badge>
                                            <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">{activation.plan}</Badge>
                                        </div>

                                        <p className="mt-1 text-sm text-slate-400">
                                            {activation.userEmail || 'No email'} | Manager {activation.managerName} ({activation.managerEmail || 'No email'})
                                        </p>

                                        <div className="mt-3 grid gap-3 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-4">
                                            <InfoTile label="Activated" value={formatDate(activation.activationMillis, true)} />
                                            <InfoTile
                                                label="Customer Payment"
                                                value={activation.customerPaymentReceived
                                                    ? `Confirmed ${formatDate(activation.customerPaymentReceivedMillis, true)}`
                                                    : 'Not confirmed'}
                                            />
                                            <InfoTile label="Plan Price" value={formatCurrencyFromPaise(activation.planPricePaise)} />
                                            <InfoTile
                                                label="Admin Receipt"
                                                value={activation.adminPaymentReceived
                                                    ? `Received ${formatDate(activation.adminPaymentReceivedMillis, true)}`
                                                    : 'Pending'}
                                            />
                                        </div>

                                        <p className="mt-3 text-xs text-slate-500">
                                            Ref: {activation.activationReference || 'Not recorded'}
                                            {activation.adminPaymentReceivedByName
                                                ? ` | Received by ${activation.adminPaymentReceivedByName || activation.adminPaymentReceivedByEmail}`
                                                : ''}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={!activation.user}
                                            onClick={() => activation.user && onOpenUser?.(activation.user)}
                                            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Open User
                                        </button>
                                        <button
                                            type="button"
                                            disabled={activation.adminPaymentReceived || busyActivationId === activation.id}
                                            onClick={() => onMarkReceived?.(activation)}
                                            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {busyActivationId === activation.id
                                                ? 'Saving...'
                                                : activation.adminPaymentReceived
                                                    ? 'Received'
                                                    : 'Mark Received'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No manager activation notifications found yet." />
                )}
            </section>
        </div>
    );
}

function InfoTile({ label, value }) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
        </div>
    );
}

function isToday(value) {
    if (!value) return false;
    const date = new Date(value);
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();
}
