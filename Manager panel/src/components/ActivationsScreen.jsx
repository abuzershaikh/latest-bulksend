import { EmptyState, ScreenTitle, StatCard } from './AdminUi';
import { ActivationRow } from './UserDisplay';

export default function ActivationsScreen({ customers, isLoading, onOpenUser }) {
    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="My customers"
                title="Activated By You"
                description="This list comes from the secure worker and only includes customers currently attributed to your manager account."
            />

            <section className="grid gap-3 md:grid-cols-4">
                <StatCard label="Customers" value={customers.length} helper="Your total list" />
                <StatCard
                    label="Active"
                    value={customers.filter((user) => user.status === 'paid').length}
                    helper="Premium users"
                    tone="success"
                />
                <StatCard
                    label="Expired"
                    value={customers.filter((user) => user.status === 'expired').length}
                    helper="Need renewal"
                    tone="warning"
                />
                <StatCard
                    label="Free"
                    value={customers.filter((user) => user.status === 'free').length}
                    helper="No active plan"
                    tone="primary"
                />
            </section>

            <section className="rounded-[28px] border border-white/10 bg-dark-800 p-4">
                {isLoading ? (
                    <EmptyState message="Loading your customers..." />
                ) : customers.length ? (
                    <div className="space-y-3">
                        {customers.map((user) => (
                            <ActivationRow key={user.id} user={user} onOpenUser={onOpenUser} detailed />
                        ))}
                    </div>
                ) : (
                    <EmptyState message="You have not activated any customers yet." />
                )}
            </section>
        </div>
    );
}
