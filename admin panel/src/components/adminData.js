import { getPlanLabel, isKnownPlan } from './planConfig';

export const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'activations', label: 'Activations' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'managers', label: 'Managers' },
    { id: 'balances', label: 'Balances' },
];

const numberFormatter = new Intl.NumberFormat('en-IN');
const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export function toMillis(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return null;
}

export function formatDate(value, withTime = false) {
    const millis = typeof value === 'number' ? value : toMillis(value);
    if (!millis) return 'Not recorded';
    return (withTime ? dateTimeFormatter : dateFormatter).format(new Date(millis));
}

export function formatCount(value) {
    if (value === undefined || value === null || value === '') return '-';
    if (Number(value) >= 999999) return 'Unlimited';
    return numberFormatter.format(Number(value));
}

export function formatCurrency(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return currencyFormatter.format(0);
    return currencyFormatter.format(amount);
}

export function formatCurrencyFromPaise(value) {
    return formatCurrency((Number(value) || 0) / 100);
}

export function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function shortToken(value) {
    const token = cleanText(value);
    if (!token) return '';
    if (token.length <= 18) return token;
    return `${token.slice(0, 9)}...${token.slice(-6)}`;
}

function normalizeEmail(value) {
    return cleanText(value).toLowerCase();
}

function formatPlan(value) {
    const cleanValue = cleanText(value).toLowerCase();
    if (!cleanValue) return 'Free';
    if (isKnownPlan(cleanValue)) return getPlanLabel(cleanValue);

    return cleanValue
        .replace(/^aiagent/i, 'AI Agent ')
        .replace(/\bai\b/g, 'AI')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolvePaymentMethod(data) {
    const method = cleanText(data.paymentMethod || data.lastPaymentMethod).toLowerCase();

    if (method.includes('razor')) return { id: 'razorpay', label: 'Razorpay' };
    if (method.includes('google') || method.includes('play')) {
        return { id: 'google_play', label: 'Google Play' };
    }
    if (method.includes('manager')) {
        return { id: 'manager_panel', label: 'Manager Panel' };
    }
    if (method.includes('admin') || method.includes('manual')) {
        return { id: 'admin_panel', label: 'Admin Panel' };
    }
    if (data.lastPaymentId) return { id: 'razorpay', label: 'Razorpay' };
    if (data.lastOrderId || data.lastPurchaseToken) {
        return { id: 'google_play', label: 'Google Play' };
    }

    return { id: 'unknown', label: 'Not recorded' };
}

function resolveStatus(data) {
    const type = cleanText(data.subscriptionType).toLowerCase();
    const userStatus = cleanText(data.userStatus).toLowerCase();
    const plan = cleanText(data.planType || data.purchasedPlanType).toLowerCase();
    const hasPremiumClaim = type === 'premium' || userStatus === 'purchased';
    const endMillis = toMillis(data.subscriptionEndDate);
    const isLifetime = plan.includes('lifetime');
    const isExpired = hasPremiumClaim && !isLifetime && endMillis && endMillis < Date.now();

    if (isExpired) return 'expired';
    if (hasPremiumClaim) return 'paid';
    return 'free';
}

export function isToday(value) {
    const millis = toMillis(value);
    if (!millis) return false;

    const date = new Date(millis);
    const today = new Date();
    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    );
}

export function buildUsers(emailDocs, detailDocs) {
    const records = new Map();
    const keyByUserId = new Map();
    const keyByEmail = new Map();

    emailDocs.forEach(({ id, data }) => {
        const email = normalizeEmail(data.email || id);
        const userId = cleanText(data.userId);
        const key = userId || email || id;
        const previous = records.get(key) || {};

        records.set(key, { ...previous, emailDocId: id, emailData: data });
        if (userId) keyByUserId.set(userId, key);
        if (email) keyByEmail.set(email, key);
    });

    detailDocs.forEach(({ id, data }) => {
        const email = normalizeEmail(data.email);
        const userId = cleanText(data.userId || id);
        const key = keyByUserId.get(userId) || keyByEmail.get(email) || userId || email || id;
        const previous = records.get(key) || {};

        records.set(key, { ...previous, detailDocId: id, detailData: data });
        if (userId) keyByUserId.set(userId, key);
        if (email) keyByEmail.set(email, key);
    });

    return Array.from(records.entries()).map(([key, record]) => normalizeUser(key, record))
        .sort((a, b) => {
            const bDate = b.activationMillis || b.joinedMillis || 0;
            const aDate = a.activationMillis || a.joinedMillis || 0;
            return bDate - aDate;
        });
}

function normalizeUser(key, record) {
    const data = { ...(record.emailData || {}), ...(record.detailData || {}) };
    const emailData = record.emailData || {};
    const detailData = record.detailData || {};
    const paymentMethod = resolvePaymentMethod(data);
    const status = resolveStatus(data);
    const email = cleanText(detailData.email || emailData.email || record.emailDocId);
    const fallbackName = email ? email.split('@')[0] : 'User';

    return {
        id: key,
        userId: cleanText(data.userId || record.detailDocId),
        emailDocId: cleanText(record.emailDocId || email),
        detailDocId: cleanText(record.detailDocId || data.userId),
        name: cleanText(detailData.fullName || emailData.displayName || data.name) || fallbackName,
        email: email || 'No email',
        phone: cleanText(detailData.phoneNumber || data.phoneNumber || data.mobileNumber || data.phone) || 'No number',
        businessName: cleanText(detailData.businessName || data.businessName),
        country: cleanText(detailData.country || data.country),
        status,
        plan: formatPlan(data.planType || data.purchasedPlanType),
        rawPlan: cleanText(data.planType || data.purchasedPlanType),
        paymentMethod,
        activationMillis: toMillis(data.lastPaymentDate || data.subscriptionStartDate),
        joinedMillis: toMillis(data.firstSignupDate || data.timestamp || data.createdAt),
        endMillis: toMillis(data.subscriptionEndDate),
        lastSeenMillis: toMillis(data.lastSeen || data.lastLoginDate),
        accountState: cleanText(data.accountState || data.userStatus || 'active'),
        isActive: data.isActive !== false && data.accountState !== 'suspended',
        contactsUsed: data.currentContactsCount,
        contactsLimit: data.contactsLimit,
        groupsUsed: data.currentGroupsCount,
        groupsLimit: data.groupsLimit,
        lastOrderId: cleanText(data.lastOrderId),
        lastPaymentId: cleanText(data.lastPaymentId),
        lastPurchaseToken: cleanText(data.lastPurchaseToken),
        activatedByRole: cleanText(data.activatedByRole),
        activatedByName: cleanText(data.activatedByName),
        activatedByEmail: cleanText(data.activatedByEmail),
        managerName: cleanText(data.managerName),
        managerEmail: normalizeEmail(data.managerEmail),
        managerUid: cleanText(data.managerUid),
        managerActivatedMillis: toMillis(data.managerActivatedAt),
        managerActivationEventId: cleanText(data.managerActivationEventId),
        customerPaymentReceived: data.customerPaymentReceived === true,
        customerPaymentReceivedMillis: toMillis(data.customerPaymentReceivedAt),
        adminReceiptStatus: cleanText(data.adminReceiptStatus),
        adminPaymentReceived: data.adminPaymentReceived === true,
        adminPaymentReceivedMillis: toMillis(data.adminPaymentReceivedAt),
        adminPaymentReceivedByName: cleanText(data.adminPaymentReceivedByName),
        adminPaymentReceivedByEmail: cleanText(data.adminPaymentReceivedByEmail),
        sourceCollections: [
            record.emailData ? 'email_data' : '',
            record.detailData ? 'userDetails' : '',
        ].filter(Boolean).join(' + '),
    };
}

export function buildManagerActivations(activationDocs, users) {
    const usersByActivationId = new Map();
    const usersById = new Map();
    const usersByEmail = new Map();

    users.forEach((user) => {
        if (user.managerActivationEventId) {
            usersByActivationId.set(user.managerActivationEventId, user);
        }
        if (user.userId) {
            usersById.set(user.userId, user);
        }
        if (user.email) {
            usersByEmail.set(normalizeEmail(user.email), user);
        }
    });

    return activationDocs
        .map(({ id, data }) => {
            const matchedUser = usersByActivationId.get(id)
                || usersById.get(cleanText(data.userId))
                || usersByEmail.get(normalizeEmail(data.userEmail));
            const adminPaymentReceived = data.adminPaymentReceived === true;
            const rawPlan = cleanText(data.planType || matchedUser?.rawPlan);

            return {
                id,
                managerName: cleanText(data.managerName) || matchedUser?.managerName || 'Manager',
                managerEmail: normalizeEmail(data.managerEmail) || matchedUser?.managerEmail,
                managerUid: cleanText(data.managerUid) || matchedUser?.managerUid,
                userId: cleanText(data.userId) || matchedUser?.userId,
                userName: cleanText(data.userName) || matchedUser?.name || 'Customer',
                userEmail: normalizeEmail(data.userEmail) || normalizeEmail(matchedUser?.email),
                emailDocId: cleanText(data.emailDocId) || matchedUser?.emailDocId || '',
                detailDocId: cleanText(data.detailDocId) || matchedUser?.detailDocId || '',
                rawPlan,
                plan: cleanText(data.planLabel) || matchedUser?.plan || formatPlan(rawPlan),
                paymentMethod: resolvePaymentMethod(data),
                activationReference: cleanText(data.activationReference) || '',
                activationMillis: toMillis(data.activatedAt || data.createdAt || matchedUser?.managerActivatedMillis || matchedUser?.activationMillis),
                customerPaymentReceived: data.customerPaymentReceived === true || matchedUser?.customerPaymentReceived === true,
                customerPaymentReceivedMillis: toMillis(data.customerPaymentReceivedAt || matchedUser?.customerPaymentReceivedMillis),
                adminReceiptStatus: cleanText(data.adminReceiptStatus) || (adminPaymentReceived ? 'received' : 'pending'),
                adminPaymentReceived,
                adminPaymentReceivedMillis: toMillis(data.adminPaymentReceivedAt || matchedUser?.adminPaymentReceivedMillis),
                adminPaymentReceivedByName: cleanText(data.adminPaymentReceivedByName) || matchedUser?.adminPaymentReceivedByName || '',
                adminPaymentReceivedByEmail: cleanText(data.adminPaymentReceivedByEmail) || matchedUser?.adminPaymentReceivedByEmail || '',
                planPricePaise: Number(data.planPricePaise) || 0,
                user: matchedUser || null,
            };
        })
        .sort((a, b) => {
            if (a.adminPaymentReceived !== b.adminPaymentReceived) {
                return a.adminPaymentReceived ? 1 : -1;
            }

            return (b.activationMillis || 0) - (a.activationMillis || 0);
        });
}

export function buildManagers(managerDocs, users, managerActivations = []) {
    const customersByManager = new Map();
    const activationsByManager = new Map();

    users.forEach((user) => {
        const managerEmail = normalizeEmail(user.managerEmail);
        if (!managerEmail) return;

        const current = customersByManager.get(managerEmail) || [];
        current.push(user);
        customersByManager.set(managerEmail, current);
    });

    managerActivations.forEach((activation) => {
        const managerEmail = normalizeEmail(activation.managerEmail);
        if (!managerEmail) return;

        const current = activationsByManager.get(managerEmail) || [];
        current.push(activation);
        activationsByManager.set(managerEmail, current);
    });

    return managerDocs
        .map(({ id, data }) => {
            const email = normalizeEmail(data.email || id);
            const customers = [...(customersByManager.get(email) || [])]
                .sort((a, b) => (b.managerActivatedMillis || b.activationMillis || 0) - (a.managerActivatedMillis || a.activationMillis || 0));
            const activations = [...(activationsByManager.get(email) || [])]
                .sort((a, b) => (b.activationMillis || 0) - (a.activationMillis || 0));
            const pendingActivations = activations.filter((activation) => !activation.adminPaymentReceived);

            return {
                id,
                name: cleanText(data.name) || (email ? email.split('@')[0] : 'Manager'),
                email: email || id,
                enabled: data.enabled !== false,
                createdMillis: toMillis(data.createdAt),
                updatedMillis: toMillis(data.updatedAt),
                lastLoginMillis: toMillis(data.lastLoginAt),
                latestActivationMillis: activations[0]?.activationMillis || customers[0]?.managerActivatedMillis || customers[0]?.activationMillis || null,
                totalCustomers: customers.length,
                activeCustomers: customers.filter((user) => user.status === 'paid').length,
                expiredCustomers: customers.filter((user) => user.status === 'expired').length,
                freeCustomers: customers.filter((user) => user.status === 'free').length,
                totalManagerActivations: activations.length || Math.max(0, Number(data.totalManagerActivations) || 0),
                pendingAdminReceiptCount: pendingActivations.length || Math.max(0, Number(data.pendingAdminReceiptCount) || 0),
                latestPendingActivationMillis: pendingActivations[0]?.activationMillis || toMillis(data.latestPendingActivationAt),
                latestPendingActivationUserName: pendingActivations[0]?.userName || cleanText(data.latestPendingActivationUserName),
                latestPendingActivationUserEmail: pendingActivations[0]?.userEmail || normalizeEmail(data.latestPendingActivationUserEmail),
                latestPendingPlanLabel: pendingActivations[0]?.plan || cleanText(data.latestPendingPlanLabel),
                referralCode: cleanText(data.affiliateReferralCode || data.myReferralCode || data.referralCode),
                referralLink: cleanText(data.referralLink),
                referralCount: Number(data.referralCount) || 0,
                referralLinkClicks: Number(data.referralLinkClicks) || 0,
                trackedInstalls: Number(data.trackedInstalls) || 0,
                trackedRegistrations: Number(data.trackedRegistrations) || 0,
                successfulReferrals: Number(data.successfulReferrals) || 0,
                totalReferralEarnings: Number(data.totalReferralEarnings) || 0,
                pendingEarnings: Number(data.pendingEarnings) || 0,
                withdrawnEarnings: Number(data.withdrawnEarnings) || 0,
                affiliateUpdatedMillis: toMillis(data.affiliateUpdatedAt),
                walletCurrency: cleanText(data.walletCurrency) || 'INR',
                walletBalancePaise: Number(data.walletBalancePaise) || 0,
                walletBalance: (Number(data.walletBalancePaise) || 0) / 100,
                walletTotalTopupPaise: Number(data.walletTotalTopupPaise) || 0,
                walletTotalTopup: (Number(data.walletTotalTopupPaise) || 0) / 100,
                walletTotalSpentPaise: Number(data.walletTotalSpentPaise) || 0,
                walletTotalSpent: (Number(data.walletTotalSpentPaise) || 0) / 100,
                walletLastTopupMillis: toMillis(data.walletLastTopupAt),
                walletLastTopupAmountPaise: Number(data.walletLastTopupAmountPaise) || 0,
                walletLastDebitMillis: toMillis(data.walletLastDebitAt),
                walletLastDebitAmountPaise: Number(data.walletLastDebitAmountPaise) || 0,
                walletUpdatedMillis: toMillis(data.walletUpdatedAt),
                createdByName: cleanText(data.createdByName),
                createdByEmail: cleanText(data.createdByEmail),
                updatedByName: cleanText(data.updatedByName),
                updatedByEmail: cleanText(data.updatedByEmail),
                customers,
            };
        })
        .sort((a, b) => {
            const bDate = b.latestActivationMillis || b.createdMillis || 0;
            const aDate = a.latestActivationMillis || a.createdMillis || 0;
            return bDate - aDate;
        });
}

export function buildStats(users) {
    const paidUsers = users.filter((user) => user.status === 'paid');
    const expiredUsers = users.filter((user) => user.status === 'expired');
    const freeUsers = users.filter((user) => user.status === 'free');

    return {
        total: users.length,
        paid: paidUsers.length,
        free: freeUsers.length,
        expired: expiredUsers.length,
        active: users.filter((user) => user.isActive).length,
        today: users.filter((user) => isToday(user.joinedMillis)).length,
        razorpay: users.filter((user) => user.paymentMethod.id === 'razorpay' && user.status !== 'free').length,
        googlePlay: users.filter((user) => user.paymentMethod.id === 'google_play' && user.status !== 'free').length,
    };
}

export function statusLabel(status) {
    if (status === 'paid') return 'Paid';
    if (status === 'expired') return 'Expired';
    return 'Free';
}

export function statusBadgeClass(status) {
    if (status === 'paid') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40';
    if (status === 'expired') return 'bg-amber-500/15 text-amber-100 border-amber-400/40';
    return 'bg-slate-500/15 text-slate-200 border-slate-400/30';
}

export function methodBadgeClass(methodId) {
    if (methodId === 'razorpay') return 'bg-orange-500/15 text-orange-100 border-orange-400/40';
    if (methodId === 'google_play') return 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40';
    if (methodId === 'manager_panel') return 'bg-cyan-500/15 text-cyan-100 border-cyan-400/40';
    if (methodId === 'admin_panel') return 'bg-sky-500/15 text-sky-100 border-sky-400/40';
    return 'bg-slate-500/15 text-slate-200 border-slate-400/30';
}
