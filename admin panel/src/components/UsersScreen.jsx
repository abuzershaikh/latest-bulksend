import { useMemo, useState } from 'react';
import { EmptyState, ScreenTitle } from './AdminUi';
import { LatestActivationCard, UserList } from './UserDisplay';

export default function UsersScreen({ users, isLoading, onOpenUser }) {
    const [queryText, setQueryText] = useState('');
    const [filter, setFilter] = useState('all');
    const latestActivation = users.find((user) => user.status === 'paid' && user.activationMillis);

    const filteredUsers = useMemo(() => {
        const cleanQuery = queryText.trim().toLowerCase();

        return users.filter((user) => {
            const matchesQuery = !cleanQuery || [
                user.name,
                user.email,
                user.phone,
                user.plan,
                user.paymentMethod.label,
            ].join(' ').toLowerCase().includes(cleanQuery);

            if (!matchesQuery) return false;
            if (filter === 'all') return true;
            if (filter === 'paid') return user.status === 'paid';
            if (filter === 'free') return user.status === 'free';
            if (filter === 'expired') return user.status === 'expired';
            if (filter === 'razorpay') return user.paymentMethod.id === 'razorpay';
            if (filter === 'google_play') return user.paymentMethod.id === 'google_play';
            return true;
        });
    }, [filter, queryText, users]);

    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="List view"
                title="All Users"
                description="Name, number, email, paid status, plan and activation source in one clean screen."
            />

            <LatestActivationCard user={latestActivation} onOpenUser={onOpenUser} />

            <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <input
                        value={queryText}
                        onChange={(event) => setQueryText(event.target.value)}
                        placeholder="Search name, phone, email, plan..."
                        className="w-full rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-primary lg:max-w-md"
                    />
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                            ['all', 'All'],
                            ['paid', 'Paid'],
                            ['free', 'Free'],
                            ['expired', 'Expired'],
                            ['razorpay', 'Razorpay'],
                            ['google_play', 'Google Play'],
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setFilter(id)}
                                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === id
                                    ? 'bg-primary text-slate-950'
                                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {isLoading ? (
                <EmptyState message="Loading users..." />
            ) : (
                <UserList users={filteredUsers} onOpenUser={onOpenUser} />
            )}
        </div>
    );
}
