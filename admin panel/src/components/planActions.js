import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { FREE_LIMITS, PREMIUM_LIMITS, getPlanDays } from './planConfig';

function cleanValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function resolveDocRefs(user) {
    const emailDocId = cleanValue(user.emailDocId || user.email);
    const detailDocId = cleanValue(user.detailDocId || user.userId);
    const refs = [];

    if (emailDocId && emailDocId !== 'No email') {
        refs.push(doc(db, 'email_data', emailDocId));
    }

    if (detailDocId) {
        refs.push(doc(db, 'userDetails', detailDocId));
    }

    if (!refs.length) {
        throw new Error('No Firestore document key found for this user.');
    }

    return refs;
}

function buildEndTimestamp(planType, startTimestamp) {
    const daysToAdd = getPlanDays(planType);
    return new Timestamp(startTimestamp.seconds + (daysToAdd * 24 * 60 * 60), 0);
}

function buildReferenceFields(paymentMethod, reference) {
    const cleanReference = cleanValue(reference);

    return {
        lastPaymentId: paymentMethod === 'google_play' ? '' : cleanReference,
        lastOrderId: paymentMethod === 'google_play' ? cleanReference : '',
        lastPurchaseToken: paymentMethod === 'google_play' ? cleanReference : '',
    };
}

function buildAdminActivationMeta() {
    return {
        activatedByRole: 'admin',
        activatedByName: cleanValue(auth.currentUser?.displayName) || 'Admin',
        activatedByEmail: cleanValue(auth.currentUser?.email).toLowerCase(),
        activatedByUid: cleanValue(auth.currentUser?.uid),
        activationPanel: 'admin_panel',
        managerName: '',
        managerEmail: '',
        managerUid: '',
        managerActivatedAt: null,
        lastPlanAction: 'activate',
        lastPlanActionAt: Timestamp.now(),
    };
}

function buildAdminDeactivationMeta() {
    return {
        deactivatedByRole: 'admin',
        deactivatedByName: cleanValue(auth.currentUser?.displayName) || 'Admin',
        deactivatedByEmail: cleanValue(auth.currentUser?.email).toLowerCase(),
        deactivatedByUid: cleanValue(auth.currentUser?.uid),
        lastPlanAction: 'deactivate',
        lastPlanActionAt: Timestamp.now(),
    };
}

export async function activateUserPlan(user, { planType, paymentMethod, reference }) {
    const refs = resolveDocRefs(user);
    const startTimestamp = Timestamp.now();
    const endTimestamp = buildEndTimestamp(planType, startTimestamp);
    const payload = {
        subscriptionType: 'premium',
        planType,
        purchasedPlanType: planType,
        subscriptionStartDate: startTimestamp,
        subscriptionEndDate: endTimestamp,
        contactsLimit: PREMIUM_LIMITS.contacts,
        groupsLimit: PREMIUM_LIMITS.groups,
        lastPaymentDate: startTimestamp,
        paymentMethod,
        userStatus: 'purchased',
        isActive: true,
        ...buildReferenceFields(paymentMethod, reference),
        ...buildAdminActivationMeta(),
    };

    const batch = writeBatch(db);
    refs.forEach((ref) => {
        batch.set(ref, payload, { merge: true });
    });
    await batch.commit();

    return {
        startTimestamp,
        endTimestamp,
    };
}

export async function deactivateUserPlan(user) {
    const refs = resolveDocRefs(user);
    const payload = {
        subscriptionType: 'free',
        planType: '',
        purchasedPlanType: '',
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        contactsLimit: FREE_LIMITS.contacts,
        groupsLimit: FREE_LIMITS.groups,
        userStatus: 'registered',
        isActive: false,
        ...buildAdminDeactivationMeta(),
    };

    const batch = writeBatch(db);
    refs.forEach((ref) => {
        batch.set(ref, payload, { merge: true });
    });
    await batch.commit();
}
