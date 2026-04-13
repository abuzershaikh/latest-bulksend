import { Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { MANAGER_COLLECTION, normalizeManagerEmail } from './managerAccess';

export const MANAGER_ACTIVATION_COLLECTION = 'managerActivations';

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function toTimestamp(value) {
    if (!value) return null;
    if (value instanceof Timestamp) return value;
    if (value instanceof Date) return Timestamp.fromDate(value);
    if (typeof value === 'number' && Number.isFinite(value)) return Timestamp.fromMillis(value);
    return null;
}

export async function markManagerActivationReceived(activation, allActivations, actor = {}) {
    const activationId = cleanText(activation?.id);
    const managerEmail = normalizeManagerEmail(activation?.managerEmail);

    if (!activationId) {
        throw new Error('Activation notification id is missing.');
    }

    if (!managerEmail) {
        throw new Error('Manager email is missing on this activation.');
    }

    const now = Timestamp.now();
    const batch = writeBatch(db);
    const activationRef = doc(db, MANAGER_ACTIVATION_COLLECTION, activationId);
    const managerRef = doc(db, MANAGER_COLLECTION, managerEmail);
    const remainingPending = (Array.isArray(allActivations) ? allActivations : [])
        .filter((item) => item.id !== activationId && normalizeManagerEmail(item.managerEmail) === managerEmail && !item.adminPaymentReceived)
        .sort((a, b) => (b.activationMillis || 0) - (a.activationMillis || 0));
    const latestPending = remainingPending[0] || null;
    const receiptFields = {
        adminReceiptStatus: 'received',
        adminPaymentReceived: true,
        adminPaymentReceivedAt: now,
        adminPaymentReceivedByName: cleanText(actor.name),
        adminPaymentReceivedByEmail: normalizeManagerEmail(actor.email),
        adminPaymentReceivedByUid: cleanText(actor.uid),
        updatedAt: now,
    };

    batch.set(activationRef, receiptFields, { merge: true });

    if (cleanText(activation.emailDocId)) {
        batch.set(doc(db, 'email_data', activation.emailDocId), receiptFields, { merge: true });
    }

    if (cleanText(activation.detailDocId)) {
        batch.set(doc(db, 'userDetails', activation.detailDocId), receiptFields, { merge: true });
    }

    batch.set(managerRef, {
        email: managerEmail,
        name: cleanText(activation.managerName) || managerEmail.split('@')[0] || 'Manager',
        pendingAdminReceiptCount: remainingPending.length,
        latestPendingActivationId: latestPending?.id || '',
        latestPendingActivationAt: toTimestamp(latestPending?.activationMillis),
        latestPendingActivationUserName: cleanText(latestPending?.userName),
        latestPendingActivationUserEmail: normalizeManagerEmail(latestPending?.userEmail),
        latestPendingPlanType: cleanText(latestPending?.rawPlan),
        latestPendingPlanLabel: cleanText(latestPending?.plan),
        lastAdminReceiptReceivedAt: now,
        lastAdminReceiptActivationId: activationId,
        lastAdminReceiptUserName: cleanText(activation.userName),
        lastAdminReceiptUserEmail: normalizeManagerEmail(activation.userEmail),
        updatedAt: now,
        updatedByName: cleanText(actor.name),
        updatedByEmail: normalizeManagerEmail(actor.email),
        updatedByUid: cleanText(actor.uid),
    }, { merge: true });

    await batch.commit();
}
