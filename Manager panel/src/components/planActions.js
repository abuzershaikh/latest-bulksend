import { activateManagerUserPlan } from './managerApi';

export async function activateUserPlan(user, { planType, paymentMethod, reference, customerPaymentReceived }) {
    const result = await activateManagerUserPlan(user, {
        planType,
        paymentMethod,
        reference,
        customerPaymentReceived,
    });

    return {
        manager: result.manager,
        user: result.user,
        startTimestamp: result.startMillis,
        endTimestamp: result.endMillis,
        planPricePaise: result.planPricePaise,
        activationCostPaise: result.activationCostPaise,
    };
}
