import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { PREMIUM_LIMITS, getPlanDays } from './planConfig';

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

function buildManagerMeta(manager, actionTimestamp) {
    return {
        activatedByRole: 'manager',
        activatedByName: cleanValue(manager.name) || 'Manager',
        activatedByEmail: cleanValue(manager.email).toLowerCase(),
        activatedByUid: cleanValue(manager.uid),
        activationPanel: 'manager_panel',
        managerName: cleanValue(manager.name) || 'Manager',
        managerEmail: cleanValue(manager.email).toLowerCase(),
        managerUid: cleanValue(manager.uid),
        managerActivatedAt: actionTimestamp,
        lastPlanAction: 'activate',
        lastPlanActionAt: actionTimestamp,
    };
}

export async function activateUserPlan(user, { planType, paymentMethod, reference, manager }) {
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
        paymentMethod: paymentMethod || 'manager_panel',
        userStatus: 'purchased',
        isActive: true,
        ...buildReferenceFields(paymentMethod || 'manager_panel', reference),
        ...buildManagerMeta(manager, startTimestamp),
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
