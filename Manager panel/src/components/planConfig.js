export const FREE_LIMITS = {
    contacts: 10,
    groups: 1,
};

export const PREMIUM_LIMITS = {
    contacts: -1,
    groups: -1,
};

export const PLAN_OPTIONS = [
    { id: 'monthly', label: 'Monthly', days: 30 },
    { id: 'yearly', label: 'Yearly', days: 365 },
    { id: 'lifetime', label: 'Lifetime', days: 36500 },
    { id: 'aiagent499', label: 'AI Agent 499', days: 30 },
    { id: 'ai_monthly', label: 'AI Monthly', days: 30 },
    { id: 'ai_yearly', label: 'AI Yearly', days: 365 },
];

export const PAYMENT_SOURCE_OPTIONS = [
    { id: 'admin_panel', label: 'Admin Panel' },
    { id: 'razorpay', label: 'Razorpay' },
    { id: 'google_play', label: 'Google Play' },
];

const planLookup = Object.fromEntries(PLAN_OPTIONS.map((plan) => [plan.id, plan]));
const paymentLookup = Object.fromEntries(PAYMENT_SOURCE_OPTIONS.map((source) => [source.id, source]));

export function isKnownPlan(planType) {
    return Boolean(planLookup[planType]);
}

export function getPlanDays(planType) {
    return planLookup[planType]?.days || 30;
}

export function getPlanLabel(planType) {
    return planLookup[planType]?.label || planType;
}

export function getPaymentSourceLabel(paymentMethod) {
    return paymentLookup[paymentMethod]?.label || paymentMethod;
}

export function getPlanEndMillis(planType, startMillis = Date.now()) {
    return startMillis + (getPlanDays(planType) * 24 * 60 * 60 * 1000);
}
