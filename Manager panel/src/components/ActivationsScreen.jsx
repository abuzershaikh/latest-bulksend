import { EmptyState, ScreenTitle, StatCard } from './AdminUi';
import { ActivationRow } from './UserDisplay';

export default function ActivationsScreen({ users, isLoading, onOpenUser }) {
    const activations = users
        .filter((user) => user.status !== 'free')
        .sort((a, b) => (b.activationMillis || 0) - (a.activationMillis || 0));

    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="Activation audit"
                title="Paid Users"
                description="See who activated premium, from where, on which plan and with which payment reference."
            />

            <section className="grid gap-3 md:grid-cols-3">
                <StatCard label="Total Paid/Expired" value={activations.length} helper="Premium history" />
                <StatCard
                    label="Razorpay"
                    value={activations.filter((user) => user.paymentMethod.id === 'razorpay').length}
                    helper="Gateway activation"
                    tone="orange"
                />
                <StatCard
                    label="Google Play"
                    value={activations.filter((user) => user.paymentMethod.id === 'google_play').length}
                    helper="Store billing"
                    tone="success"
                />
            </section>

            <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
                {isLoading ? (
                    <EmptyState message="Loading activations..." />
                ) : activations.length ? (
                    <div className="space-y-3">
                        {activations.map((user) => (
                            <ActivationRow key={user.id} user={user} onOpenUser={onOpenUser} detailed />
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No premium activation data found." />
                )}
            </section>
        </div>
    );
}
