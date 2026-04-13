import { useMemo, useState } from 'react';
import { formatCount, formatDate, methodBadgeClass, shortToken, statusBadgeClass, statusLabel } from './adminData';
import { Badge } from './AdminUi';
import { activateUserPlan, deactivateUserPlan } from './planActions';
import { PAYMENT_SOURCE_OPTIONS, PLAN_OPTIONS, getPlanEndMillis, getPlanLabel, isKnownPlan } from './planConfig';

export default function UserDetailPanel({ user, onClose }) {
    const [planType, setPlanType] = useState(() => getInitialPlan(user));
    const [paymentMethod, setPaymentMethod] = useState(() => getInitialPaymentMethod(user));
    const [reference, setReference] = useState(() => getInitialReference(user));
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const nextEndDate = useMemo(() => formatDate(getPlanEndMillis(planType), true), [planType]);
    const activateLabel = user.status === 'paid'
        ? 'Update Plan'
        : user.status === 'expired'
            ? 'Reactivate Plan'
            : 'Activate Plan';
    const referenceLabel = paymentMethod === 'google_play'
        ? 'Order ID / token'
        : paymentMethod === 'razorpay'
            ? 'Payment ID'
            : 'Manual reference';

    const handleActivate = async () => {
        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const result = await activateUserPlan(user, {
                planType,
                paymentMethod,
                reference,
            });

            setFeedback({
                type: 'success',
                message: `${activateLabel} successful. Ends on ${formatDate(result.endTimestamp, true)}.`,
            });
        } catch (error) {
            console.error('Failed to activate plan:', error);
            setFeedback({
                type: 'error',
                message: error.message || 'Failed to update the user plan.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeactivate = async () => {
        const shouldContinue = window.confirm(`Deactivate ${user.name}'s current plan and move this user to free?`);
        if (!shouldContinue) return;

        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            await deactivateUserPlan(user);
            setFeedback({
                type: 'success',
                message: 'Plan deactivated. User is now on the free limits.',
            });
        } catch (error) {
            console.error('Failed to deactivate plan:', error);
            setFeedback({
                type: 'error',
                message: error.message || 'Failed to deactivate the user plan.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-slate-950/70 p-0 backdrop-blur-sm md:p-6">
            <aside className="ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden border border-white/10 bg-dark-900 shadow-2xl md:rounded-lg">
                <div className="border-b border-white/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-primary">User Details</p>
                            <h2 className="mt-1 truncate text-2xl font-bold text-white">{user.name}</h2>
                            <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
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
                    <div className="flex flex-wrap gap-2">
                        <Badge className={statusBadgeClass(user.status)}>{statusLabel(user.status)}</Badge>
                        <Badge className={methodBadgeClass(user.paymentMethod.id)}>{user.paymentMethod.label}</Badge>
                        <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">{user.plan}</Badge>
                    </div>

                    <DetailSection title="Profile">
                        <DetailRow label="Name" value={user.name} />
                        <DetailRow label="Phone number" value={user.phone} />
                        <DetailRow label="Email" value={user.email} />
                        <DetailRow label="Business" value={user.businessName || 'Not recorded'} />
                        <DetailRow label="Country" value={user.country || 'Not recorded'} />
                        <DetailRow label="User ID" value={user.userId || 'Not recorded'} />
                    </DetailSection>

                    <DetailSection title="Subscription">
                        <DetailRow label="Paid status" value={statusLabel(user.status)} />
                        <DetailRow label="Plan" value={user.plan} />
                        <DetailRow label="Activation date" value={formatDate(user.activationMillis, true)} />
                        <DetailRow label="End date" value={formatDate(user.endMillis, true)} />
                        <DetailRow label="Account state" value={user.accountState || 'Not recorded'} />
                        <DetailRow
                            label="Activated by"
                            value={user.activatedByName || user.activatedByEmail || (user.activatedByRole ? user.activatedByRole.toUpperCase() : 'Not recorded')}
                        />
                        <DetailRow
                            label="Manager owner"
                            value={user.managerName || user.managerEmail || 'Not assigned'}
                        />
                    </DetailSection>

                    <DetailSection title="Payment">
                        <DetailRow label="Activated from" value={user.paymentMethod.label} />
                        <DetailRow label="Razorpay payment ID" value={user.lastPaymentId || 'Not recorded'} />
                        <DetailRow label="Google order ID" value={user.lastOrderId || 'Not recorded'} />
                        <DetailRow label="Purchase token" value={shortToken(user.lastPurchaseToken) || 'Not recorded'} />
                        <DetailRow
                            label="Admin receipt"
                            value={user.paymentMethod.id === 'manager_panel'
                                ? user.adminPaymentReceived
                                    ? `Received on ${formatDate(user.adminPaymentReceivedMillis, true)}`
                                    : user.adminReceiptStatus === 'pending'
                                        ? 'Pending receipt from admin'
                                        : 'Not recorded'
                                : 'Not applicable'}
                        />
                    </DetailSection>

                    <DetailSection title="Usage">
                        <DetailRow
                            label="Contacts"
                            value={`${formatCount(user.contactsUsed)} / ${formatCount(user.contactsLimit)}`}
                        />
                        <DetailRow
                            label="Groups"
                            value={`${formatCount(user.groupsUsed)} / ${formatCount(user.groupsLimit)}`}
                        />
                        <DetailRow label="Joined" value={formatDate(user.joinedMillis, true)} />
                        <DetailRow label="Last seen" value={formatDate(user.lastSeenMillis, true)} />
                        <DetailRow label="Source collections" value={user.sourceCollections || 'Not recorded'} />
                    </DetailSection>

                    <DetailSection title="Plan Controls">
                        <div className="space-y-4">
                            <ControlField label="Plan type">
                                <select
                                    value={planType}
                                    onChange={(event) => setPlanType(event.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition focus:border-primary"
                                >
                                    {PLAN_OPTIONS.map((plan) => (
                                        <option key={plan.id} value={plan.id} className="bg-slate-950">
                                            {plan.label}
                                        </option>
                                    ))}
                                </select>
                            </ControlField>

                            <ControlField label="Activation source">
                                <select
                                    value={paymentMethod}
                                    onChange={(event) => setPaymentMethod(event.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition focus:border-primary"
                                >
                                    {PAYMENT_SOURCE_OPTIONS.map((source) => (
                                        <option key={source.id} value={source.id} className="bg-slate-950">
                                            {source.label}
                                        </option>
                                    ))}
                                </select>
                            </ControlField>

                            <ControlField label={referenceLabel}>
                                <input
                                    value={reference}
                                    onChange={(event) => setReference(event.target.value)}
                                    placeholder="Optional reference"
                                    className="w-full rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-primary"
                                />
                            </ControlField>

                            <div className="rounded-lg border border-white/10 bg-dark-900 p-4 text-sm text-slate-300">
                                <p className="font-semibold text-white">Manual activation preview</p>
                                <p className="mt-2">
                                    This will grant unlimited contacts and groups, set the plan to <span className="font-semibold text-primary">{getPlanLabel(planType)}</span>,
                                    and expire it on {nextEndDate}.
                                </p>
                                <p className="mt-2 text-xs text-slate-500">
                                    Writes to the available `email_data` and `userDetails` documents for this user.
                                </p>
                            </div>

                            {feedback.message && (
                                <div className={`rounded-lg border p-3 text-sm ${feedback.type === 'error'
                                    ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                                    : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                                    }`}
                                >
                                    {feedback.message}
                                </div>
                            )}

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={handleActivate}
                                    disabled={isSaving}
                                    className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving ? 'Saving...' : activateLabel}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeactivate}
                                    disabled={isSaving}
                                    className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving ? 'Saving...' : 'Deactivate Plan'}
                                </button>
                            </div>
                        </div>
                    </DetailSection>
                </div>
            </aside>
        </div>
    );
}

function DetailSection({ title, children }) {
    return (
        <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-primary">{title}</h3>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="grid gap-1 border-b border-white/5 pb-3 last:border-0 last:pb-0 sm:grid-cols-[160px_1fr]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
            <div className="break-words text-sm text-slate-100">{value}</div>
        </div>
    );
}

function ControlField({ label, children }) {
    return (
        <label className="block">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
            {children}
        </label>
    );
}

function getInitialPlan(user) {
    return isKnownPlan(user.rawPlan) ? user.rawPlan : 'monthly';
}

function getInitialPaymentMethod(user) {
    return user.paymentMethod.id !== 'unknown' ? user.paymentMethod.id : 'admin_panel';
}

function getInitialReference(user) {
    const paymentMethod = getInitialPaymentMethod(user);
    if (paymentMethod === 'google_play') {
        return user.lastOrderId || user.lastPurchaseToken || '';
    }

    return user.lastPaymentId || '';
}
