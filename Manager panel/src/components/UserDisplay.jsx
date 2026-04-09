import { formatDate, methodBadgeClass, shortToken, statusBadgeClass, statusLabel } from './adminData';
import { Badge, EmptyState } from './AdminUi';

export function LatestActivationCard({ user, onOpenUser }) {
    if (!user) {
        return (
            <section className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-5">
                <p className="text-sm font-semibold text-sky-100">Latest activation</p>
                <p className="mt-2 text-sm text-sky-50/80">No premium activation found yet.</p>
            </section>
        );
    }

    return (
        <section className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-100">Latest activation on top</p>
                    <h3 className="mt-1 truncate text-2xl font-bold text-white">{user.name}</h3>
                    <p className="mt-1 text-sm text-emerald-50/80">
                        {user.plan} via {user.paymentMethod.label} on {formatDate(user.activationMillis, true)}
                    </p>
                    <p className="mt-1 truncate text-sm text-emerald-50/70">{user.phone} | {user.email}</p>
                </div>
                <button
                    type="button"
                    onClick={() => onOpenUser(user)}
                    className="rounded-lg bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
                >
                    View User
                </button>
            </div>
        </section>
    );
}

export function UserList({ users, onOpenUser }) {
    if (!users.length) return <EmptyState message="No users match this filter." />;

    return (
        <section className="rounded-lg border border-white/10 bg-dark-800 p-3 md:p-4">
            <div className="space-y-3 md:hidden">
                {users.map((user) => (
                    <UserMobileCard key={user.id} user={user} onOpenUser={onOpenUser} />
                ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
                        <tr className="border-b border-white/10">
                            <th className="px-3 py-3">User</th>
                            <th className="px-3 py-3">Contact</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Plan</th>
                            <th className="px-3 py-3">Activation</th>
                            <th className="px-3 py-3">Source</th>
                            <th className="px-3 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <UserTableRow key={user.id} user={user} onOpenUser={onOpenUser} />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function UserTableRow({ user, onOpenUser }) {
    return (
        <tr className="border-b border-white/5 last:border-0">
            <td className="px-3 py-4">
                <div className="font-semibold text-white">{user.name}</div>
                <div className="text-xs text-slate-400">
                    {user.businessName || user.country || user.userId || 'Profile saved'}
                </div>
            </td>
            <td className="px-3 py-4">
                <div className="text-slate-100">{user.phone}</div>
                <div className="text-xs text-slate-400">{user.email}</div>
            </td>
            <td className="px-3 py-4">
                <Badge className={statusBadgeClass(user.status)}>{statusLabel(user.status)}</Badge>
            </td>
            <td className="px-3 py-4 text-slate-200">{user.plan}</td>
            <td className="px-3 py-4 text-slate-300">{formatDate(user.activationMillis, true)}</td>
            <td className="px-3 py-4">
                <Badge className={methodBadgeClass(user.paymentMethod.id)}>{user.paymentMethod.label}</Badge>
            </td>
            <td className="px-3 py-4 text-right">
                <button
                    type="button"
                    onClick={() => onOpenUser(user)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                >
                    Details
                </button>
            </td>
        </tr>
    );
}

function UserMobileCard({ user, onOpenUser }) {
    return (
        <article className="rounded-lg border border-white/10 bg-dark-900 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-white">{user.name}</h3>
                    <p className="truncate text-sm text-slate-400">{user.email}</p>
                </div>
                <Badge className={statusBadgeClass(user.status)}>{statusLabel(user.status)}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <InfoTile label="Number" value={user.phone} />
                <InfoTile label="Plan" value={user.plan} />
                <InfoTile label="Activated" value={formatDate(user.activationMillis)} />
                <InfoTile label="Source" value={user.paymentMethod.label} />
            </div>
            <button
                type="button"
                onClick={() => onOpenUser(user)}
                className="mt-4 w-full rounded-lg bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
                Open Details
            </button>
        </article>
    );
}

function InfoTile({ label, value }) {
    return (
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</p>
        </div>
    );
}

export function ActivationRow({ user, onOpenUser, detailed = false }) {
    return (
        <article className="rounded-lg border border-white/10 bg-dark-900 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold text-white">{user.name}</h4>
                        <Badge className={statusBadgeClass(user.status)}>{statusLabel(user.status)}</Badge>
                        <Badge className={methodBadgeClass(user.paymentMethod.id)}>{user.paymentMethod.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{user.email} | {user.phone}</p>
                    <p className="mt-1 text-sm text-slate-300">
                        {user.plan} activated on {formatDate(user.activationMillis, true)}
                    </p>
                    {detailed && (
                        <p className="mt-1 text-xs text-slate-500">
                            Ref: {user.lastPaymentId || user.lastOrderId || shortToken(user.lastPurchaseToken) || 'Not recorded'}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => onOpenUser(user)}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
                >
                    Details
                </button>
            </div>
        </article>
    );
}
