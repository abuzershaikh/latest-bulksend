import { useMemo, useState } from 'react';
import {
    formatCount,
    formatDate,
    methodBadgeClass,
    shortToken,
    statusBadgeClass,
    statusLabel,
} from './adminData';
import { Badge } from './AdminUi';
import { activateUserPlan } from './planActions';
import {
    PLAN_OPTIONS,
    getPlanEndMillis,
    getPlanLabel,
    isKnownPlan,
} from './planConfig';

export default function UserDetailPanel({
    user,
    manager,
    onClose,
    onUserUpdated,
    onManagerUpdated,
    onAccessRevoked,
}) {
    const [planType, setPlanType] = useState(() => getInitialPlan(user));
    const [reference, setReference] = useState('');
    const [customerPaymentReceived, setCustomerPaymentReceived] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const nextEndDate = useMemo(() => formatDate(getPlanEndMillis(planType), true), [planType]);
    const activateLabel = 'Activate Plan';
    const pendingAdminReceiptCount = Number(manager?.pendingAdminReceiptCount) || 0;
    const hasPendingAdminDue = pendingAdminReceiptCount > 0;
    const pendingDueLabel = manager?.latestPendingActivationUserName
        ? `${manager.latestPendingActivationUserName}${manager.latestPendingPlanLabel ? ` - ${manager.latestPendingPlanLabel}` : ''}`
        : '';

    const handleActivate = async () => {
        if (hasPendingAdminDue) {
            setFeedback({
                type: 'error',
                message: 'Clear your dues to admin before the next activation.',
            });
            return;
        }

        if (!customerPaymentReceived) {
            setFeedback({
                type: 'error',
                message: 'Confirm that customer payment has been received before activating this plan.',
            });
            return;
        }

        setIsSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const result = await activateUserPlan(user, {
                planType,
                paymentMethod: 'manager_panel',
                reference,
                customerPaymentReceived,
            });

            if (result.user) {
                onUserUpdated?.(result.user);
            }

            if (result.manager) {
                onManagerUpdated?.(result.manager);
            }

            setFeedback({
                type: 'success',
                message: `${activateLabel} successful. Ends on ${formatDate(result.endTimestamp, true)}. Admin receipt is now pending for this activation.`,
            });
            setCustomerPaymentReceived(false);
        } catch (error) {
            console.error('Failed to activate plan:', error);

            if (error?.status === 401 || error?.status === 403) {
                onAccessRevoked?.(error);
            }

            const dueMessage = error?.details?.code === 'clear_admin_dues_required'
                ? `${error.message}${error.details?.latestPendingActivation?.userName
                    ? ` Pending: ${error.details.latestPendingActivation.userName}${error.details.latestPendingActivation.planLabel
                        ? ` - ${error.details.latestPendingActivation.planLabel}`
                        : ''}.`
                    : ''
                }`
                : '';

            setFeedback({
                type: 'error',
                message: dueMessage || error.message || 'Failed to update the user plan.',
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
                            <p className="text-sm font-semibold text-cyan-300">Customer Details</p>
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
                        <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">{user.plan}</Badge>
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
                        <DetailRow label="Current owner" value={user.managerName || user.managerEmail || 'Not assigned'} />
                        <DetailRow
                            label="Admin receipt"
                            value={user.adminPaymentReceived
                                ? `Received on ${formatDate(user.adminPaymentReceivedMillis, true)}`
                                : user.adminReceiptStatus === 'pending'
                                    ? 'Pending with admin'
                                    : 'Not recorded'}
                        />
                    </DetailSection>

                    <DetailSection title="Payment">
                        <DetailRow label="Activated from" value={user.paymentMethod.label} />
                        <DetailRow label="Razorpay payment ID" value={user.lastPaymentId || 'Not recorded'} />
                        <DetailRow label="Google order ID" value={user.lastOrderId || 'Not recorded'} />
                        <DetailRow label="Purchase token" value={shortToken(user.lastPurchaseToken) || 'Not recorded'} />
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
                    </DetailSection>

                    <DetailSection title="Activate Plan">
                        <div className="space-y-4">
                            {hasPendingAdminDue && (
                                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-50">
                                    <p className="font-semibold text-white">Clear your dues to admin</p>
                                    <p className="mt-2">
                                        Another activation will unlock after admin marks your previous payment as received.
                                        {pendingDueLabel ? ` Pending: ${pendingDueLabel}.` : ''}
                                    </p>
                                </div>
                            )}

                            <ControlField label="Plan type">
                                <select
                                    value={planType}
                                    onChange={(event) => setPlanType(event.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300"
                                >
                                    {PLAN_OPTIONS.map((plan) => (
                                        <option key={plan.id} value={plan.id} className="bg-slate-950">
                                            {plan.label}
                                        </option>
                                    ))}
                                </select>
                            </ControlField>

                            <ControlField label="Reference note">
                                <input
                                    value={reference}
                                    onChange={(event) => setReference(event.target.value)}
                                    placeholder="Optional internal note"
                                    className="w-full rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                                />
                            </ControlField>

                            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-dark-900 p-4">
                                <input
                                    type="checkbox"
                                    checked={customerPaymentReceived}
                                    onChange={(event) => setCustomerPaymentReceived(event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-white/20 bg-dark-900 text-cyan-300 focus:ring-cyan-300"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-white">Payment received from customer</p>
                                    <p className="mt-1 text-sm text-slate-400">
                                        Tick yes only after you have received the customer payment for this activation.
                                    </p>
                                </div>
                            </label>

                            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                                <p className="font-semibold text-white">Activation preview</p>
                                <p className="mt-2">
                                    You are activating <span className="font-semibold text-cyan-100">{getPlanLabel(planType)}</span> for this customer.
                                    It will expire on {nextEndDate}.
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

                            <button
                                type="button"
                                onClick={handleActivate}
                                disabled={isSaving || hasPendingAdminDue || !customerPaymentReceived}
                                className="w-full rounded-full bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? 'Saving...' : activateLabel}
                            </button>
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
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-cyan-200">{title}</h3>
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
