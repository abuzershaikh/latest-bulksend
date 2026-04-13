import { useState } from 'react';
import { Badge, EmptyState, ScreenTitle, StatCard } from './AdminUi';
import { formatDate } from './adminData';

export default function AffiliateScreen({
    manager,
    affiliate,
    referredUsers,
    installHistory,
    isLoading,
}) {
    const [copiedKey, setCopiedKey] = useState('');
    const referralCode = affiliate?.referralCode || manager?.referralCode || '';
    const referralLink = affiliate?.referralLink || manager?.referralLink || '';

    const handleCopy = async (key, value) => {
        if (!value) return;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                window.prompt('Copy this text', value);
            }

            setCopiedKey(key);
            window.setTimeout(() => {
                setCopiedKey((current) => (current === key ? '' : current));
            }, 1600);
        } catch {
            window.prompt('Copy this text', value);
        }
    };

    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="Affiliate link"
                title="Your Manager Referral Desk"
                description="Share your personal Play Store link. Every click, install, signup, and paid conversion tracked by the worker will reflect here under your manager account."
            />

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-[28px] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_42%),linear-gradient(180deg,_rgba(6,182,212,0.14),_rgba(15,23,42,0.96))] p-5 shadow-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Your code</p>
                    <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <h3 className="break-all text-3xl font-black tracking-[0.08em] text-white">
                                {referralCode || 'Generating...'}
                            </h3>
                            <p className="mt-2 text-sm text-cyan-50/80">
                                This code is embedded inside your Play Store referral link.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleCopy('code', referralCode)}
                            disabled={!referralCode}
                            className="rounded-full bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {copiedKey === 'code' ? 'Copied' : 'Copy Code'}
                        </button>
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Referral link</p>
                        <p className="mt-2 break-all text-sm leading-6 text-slate-100">
                            {referralLink || 'Your link will appear here after the worker confirms your code.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => handleCopy('link', referralLink)}
                                disabled={!referralLink}
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {copiedKey === 'link' ? 'Copied' : 'Copy Link'}
                            </button>
                            {referralLink && (
                                <a
                                    href={referralLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/15"
                                >
                                    Open Link
                                </a>
                            )}
                        </div>
                    </div>
                </article>

                <article className="rounded-[28px] border border-white/10 bg-dark-800 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">How it works</p>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                        <p>1. Share your referral link from WhatsApp, Telegram, Instagram, or ads.</p>
                        <p>2. The worker captures the click and sends the user to Play Store with your code.</p>
                        <p>3. App install, signup, and paid purchase events are attributed back to your manager account.</p>
                    </div>
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                        Installs can reflect before signup. Linked user details appear below after the user reaches app registration.
                    </div>
                </article>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <StatCard label="Clicks" value={affiliate?.referralLinkClicks ?? 0} helper="Link opens tracked" tone="primary" />
                <StatCard label="Installs" value={affiliate?.trackedInstalls ?? 0} helper="App installs tracked" tone="success" />
                <StatCard label="Signups" value={affiliate?.trackedRegistrations ?? 0} helper="Registered users" tone="default" />
                <StatCard label="Buyers" value={affiliate?.successfulReferrals ?? 0} helper="Paid conversions" tone="warning" />
                <StatCard label="Leads" value={affiliate?.referralCount ?? 0} helper="Unique linked users" tone="orange" />
                <StatCard label="Earnings" value={affiliate?.totalReferralEarnings ?? 0} helper="Tracked commission total" tone="success" />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <article className="rounded-[28px] border border-white/10 bg-dark-800 p-4">
                    <div className="mb-4">
                        <p className="text-sm font-semibold text-cyan-200">Referred users</p>
                        <h3 className="text-xl font-bold text-white">Signup and purchase trail</h3>
                    </div>

                    {isLoading ? (
                        <EmptyState message="Loading your affiliate users..." />
                    ) : referredUsers.length ? (
                        <div className="space-y-3">
                            {referredUsers.map((user) => (
                                <article key={user.id || user.referredUserId} className="rounded-2xl border border-white/10 bg-dark-900 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h4 className="truncate text-lg font-bold text-white">{user.fullName || 'Unknown user'}</h4>
                                            <p className="mt-1 truncate text-sm text-slate-400">{user.email} | {user.phoneNumber}</p>
                                        </div>
                                        <LeadStatusBadge status={user.userStatus} />
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                                        <InfoTile label="Installed" value={formatDate(user.installTrackedAt, true)} />
                                        <InfoTile label="Signed up" value={formatDate(user.registeredAt, true)} />
                                        <InfoTile label="Purchased" value={formatDate(user.purchasedAt, true)} />
                                        <InfoTile label="Source" value={user.installSource || 'Not recorded'} />
                                        <InfoTile label="Plan" value={user.purchasedPlanType || 'Not purchased'} />
                                        <InfoTile label="Commission" value={String(user.commissionEarned ?? 0)} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No signed-up users are linked to your referral yet." />
                    )}
                </article>

                <article className="rounded-[28px] border border-white/10 bg-dark-800 p-4">
                    <div className="mb-4">
                        <p className="text-sm font-semibold text-cyan-200">Install activity</p>
                        <h3 className="text-xl font-bold text-white">Recent app installs</h3>
                    </div>

                    {isLoading ? (
                        <EmptyState message="Loading install activity..." />
                    ) : installHistory.length ? (
                        <div className="space-y-3">
                            {installHistory.map((install) => (
                                <article key={install.id || install.installId} className="rounded-2xl border border-white/10 bg-dark-900 p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h4 className="truncate text-lg font-bold text-white">
                                                {install.installId || 'Install event'}
                                            </h4>
                                            <p className="mt-1 text-sm text-slate-400">
                                                {install.installSource || 'play_store_install'} on {formatDate(install.installTrackedAt, true)}
                                            </p>
                                        </div>
                                        <InstallBadge linkedUserId={install.linkedUserId} />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                        <InfoTile label="Referral code" value={install.referralCode || 'Not recorded'} />
                                        <InfoTile label="Linked user" value={install.linkedUserId || 'Waiting for signup'} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No install has been tracked from your referral link yet." />
                    )}
                </article>
            </section>
        </div>
    );
}

function LeadStatusBadge({ status }) {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : 'registered';
    const className = normalizedStatus === 'purchased'
        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
        : normalizedStatus === 'installed'
            ? 'border-sky-400/30 bg-sky-500/10 text-sky-100'
            : 'border-amber-400/30 bg-amber-500/10 text-amber-100';

    const label = normalizedStatus === 'purchased'
        ? 'Purchased'
        : normalizedStatus === 'installed'
            ? 'Installed'
            : 'Registered';

    return <Badge className={className}>{label}</Badge>;
}

function InstallBadge({ linkedUserId }) {
    const linked = Boolean(linkedUserId);

    return (
        <Badge
            className={linked
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-400/30 bg-slate-500/10 text-slate-200'}
        >
            {linked ? 'Linked user' : 'Install only'}
        </Badge>
    );
}

function InfoTile({ label, value }) {
    return (
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-100">{value}</p>
        </div>
    );
}
