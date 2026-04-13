export const MANAGER_COLLECTION = "affiliateManagers";
const MANAGER_ACTIVATION_COLLECTION = "managerActivations";

const MAX_SEARCH_RESULTS = 25;
const MAX_CUSTOMER_DOCS = 250;
const MAX_MANAGER_AFFILIATE_USERS = 100;
const MAX_MANAGER_AFFILIATE_INSTALLS = 100;
const MAX_TOPUP_AMOUNT_PAISE = 5e6;
const MIN_TOPUP_AMOUNT_PAISE = 1e4;
const WALLET_CURRENCY = "INR";

const PREMIUM_LIMITS = {
  contacts: -1,
  groups: -1
};

const PLAN_DAYS = {
  monthly: 30,
  yearly: 365,
  lifetime: 36500,
  aiagent499: 30,
  ai_monthly: 30,
  ai_yearly: 365
};

const PLAN_PRICES_PAISE = {
  monthly: 29900,
  yearly: 149900,
  lifetime: 299900,
  aiagent499: 49900,
  ai_monthly: 19900,
  ai_yearly: 89900
};

const ALLOWED_PAYMENT_METHODS = /* @__PURE__ */ new Set([
  "manager_panel"
]);

const PHONE_FIELDS = [
  "phoneNumber",
  "mobileNumber",
  "phone"
];

const NAME_FIELDS = [
  "displayName",
  "fullName",
  "name",
  "businessName"
];

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function toInt(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function clampNonNegativePaise(value) {
  return Math.max(0, toInt(value));
}

function paiseToRupees(value) {
  return clampNonNegativePaise(value) / 100;
}

function getPlanPricePaise(planType) {
  return PLAN_PRICES_PAISE[planType] || 0;
}

function getPlanActivationCostPaise(planType) {
  const planPricePaise = getPlanPricePaise(planType);
  return planPricePaise > 0 ? Math.round(planPricePaise / 2) : 0;
}

function formatPlanLabel(planType) {
  const normalizedPlan = cleanText(planType).toLowerCase();
  if (!normalizedPlan) return "Plan";

  const labels = {
    monthly: "Monthly",
    yearly: "Yearly",
    lifetime: "Lifetime",
    aiagent499: "AI Agent 499",
    ai_monthly: "AI Monthly",
    ai_yearly: "AI Yearly"
  };

  return labels[normalizedPlan] || normalizedPlan;
}

function buildManagerSummary(managerDoc, auth = {}) {
  const normalizedEmail = normalizeEmail(managerDoc?.email || auth.email);
  const fallbackName = cleanText(managerDoc?.name) || cleanText(auth.name) || normalizedEmail.split("@")[0] || "Manager";
  const walletBalancePaise = clampNonNegativePaise(managerDoc?.walletBalancePaise);
  const walletTotalTopupPaise = clampNonNegativePaise(managerDoc?.walletTotalTopupPaise);
  const walletTotalSpentPaise = clampNonNegativePaise(managerDoc?.walletTotalSpentPaise);
  const walletLastTopupAmountPaise = clampNonNegativePaise(managerDoc?.walletLastTopupAmountPaise);
  const walletLastDebitAmountPaise = clampNonNegativePaise(managerDoc?.walletLastDebitAmountPaise);
  const pendingAdminReceiptCount = Math.max(0, toInt(managerDoc?.pendingAdminReceiptCount));

  return {
    id: managerDoc?.id || normalizedEmail,
    email: normalizedEmail,
    name: fallbackName,
    enabled: managerDoc?.enabled !== false,
    exists: true,
    walletBalancePaise,
    walletBalance: paiseToRupees(walletBalancePaise),
    walletCurrency: cleanText(managerDoc?.walletCurrency) || WALLET_CURRENCY,
    walletTotalTopupPaise,
    walletTotalTopup: paiseToRupees(walletTotalTopupPaise),
    walletTotalSpentPaise,
    walletTotalSpent: paiseToRupees(walletTotalSpentPaise),
    walletLastTopupAt: managerDoc?.walletLastTopupAt || null,
    walletLastTopupAmountPaise,
    walletLastTopupAmount: paiseToRupees(walletLastTopupAmountPaise),
    walletLastDebitAt: managerDoc?.walletLastDebitAt || null,
    walletLastDebitAmountPaise,
    walletLastDebitAmount: paiseToRupees(walletLastDebitAmountPaise),
    walletUpdatedAt: managerDoc?.walletUpdatedAt || null,
    pendingAdminReceiptCount,
    canActivate: pendingAdminReceiptCount === 0,
    latestPendingActivationId: cleanText(managerDoc?.latestPendingActivationId),
    latestPendingActivationAt: managerDoc?.latestPendingActivationAt || null,
    latestPendingActivationUserName: cleanText(managerDoc?.latestPendingActivationUserName),
    latestPendingActivationUserEmail: normalizeEmail(managerDoc?.latestPendingActivationUserEmail),
    latestPendingPlanType: cleanText(managerDoc?.latestPendingPlanType),
    latestPendingPlanLabel: cleanText(managerDoc?.latestPendingPlanLabel),
    totalManagerActivations: Math.max(0, toInt(managerDoc?.totalManagerActivations)),
    lastManagerActivationAt: managerDoc?.lastManagerActivationAt || null,
    referralCode: cleanText(
      managerDoc?.affiliateReferralCode ||
      managerDoc?.myReferralCode ||
      managerDoc?.referralCode ||
      managerDoc?.managerReferralCode
    ),
    referralLink: cleanText(managerDoc?.referralLink)
  };
}

function buildManagerPath(manager) {
  const managerId = cleanText(manager?.id) || normalizeEmail(manager?.email);
  return managerId ? `${MANAGER_COLLECTION}/${managerId}` : "";
}

function buildWalletOrderPath(manager, orderId) {
  return `${buildManagerPath(manager)}/walletOrders/${orderId}`;
}

function buildWalletTransactionPath(manager, transactionId) {
  return `${buildManagerPath(manager)}/walletTransactions/${transactionId}`;
}

function buildManagerActivationPath(activationId) {
  return `${MANAGER_ACTIVATION_COLLECTION}/${activationId}`;
}

function createReceiptId(manager, planType = "") {
  const managerPart = normalizeEmail(manager?.email).replace(/[^a-z0-9]/g, "").slice(0, 10) || "manager";
  const planPart = cleanText(planType).replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8) || "wallet";
  return `mgr_${managerPart}_${planPart}_${Date.now()}`.slice(0, 40);
}

function createActivationEventId(manager, user, planType = "") {
  const managerPart = normalizeEmail(manager?.email).replace(/[^a-z0-9]/g, "").slice(0, 10) || "manager";
  const userPart = cleanText(
    user?.userId ||
    user?.detailDocId ||
    user?.emailDocId ||
    user?.email
  ).replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12) || "user";
  const planPart = cleanText(planType).replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8) || "plan";
  return `act_${managerPart}_${userPart}_${planPart}_${Date.now()}`.slice(0, 96);
}

function sanitizeDocId(value, label, HttpError) {
  const cleanValue = cleanText(value);
  if (!cleanValue || cleanValue === "No email") {
    return "";
  }
  if (cleanValue.includes("/")) {
    throw new HttpError(400, `Invalid ${label} document id`);
  }
  return cleanValue;
}

function buildDocPath(collectionName, docId, label, HttpError) {
  const safeDocId = sanitizeDocId(docId, label, HttpError);
  return safeDocId ? `${collectionName}/${safeDocId}` : "";
}

function serializeDocs(docs) {
  return docs.filter(Boolean).map((document) => {
    const {
      id,
      path,
      createTime,
      updateTime,
      ...data
    } = document;

    return {
      id,
      data
    };
  });
}

function addUniqueDoc(target, document) {
  if (!document?.id) {
    return;
  }
  target.set(document.id, document);
}

function buildReferenceFields(paymentMethod, reference) {
  const cleanReference = cleanText(reference);

  if (paymentMethod === "google_play") {
    return {
      lastPaymentId: "",
      lastOrderId: cleanReference,
      lastPurchaseToken: cleanReference,
      activationReference: cleanReference
    };
  }

  if (paymentMethod === "razorpay") {
    return {
      lastPaymentId: cleanReference,
      lastOrderId: "",
      lastPurchaseToken: "",
      activationReference: cleanReference
    };
  }

  return {
    lastPaymentId: "",
    lastOrderId: "",
    lastPurchaseToken: "",
    activationReference: cleanReference
  };
}

function buildManagerMeta(manager, auth, actionDate, activationCostPaise, planPricePaise, balanceAfterPaise) {
  return {
    activatedByRole: "manager",
    activatedByName: manager.name,
    activatedByEmail: manager.email,
    activatedByUid: cleanText(auth.uid),
    activationPanel: "manager_panel",
    managerName: manager.name,
    managerEmail: manager.email,
    managerUid: cleanText(auth.uid),
    managerActivatedAt: actionDate,
    lastPlanAction: "activate",
    lastPlanActionAt: actionDate,
    planPricePaise,
    planPrice: paiseToRupees(planPricePaise),
    managerWalletDebitPaise: activationCostPaise,
    managerWalletDebitAmount: paiseToRupees(activationCostPaise),
    managerWalletBalanceAfterPaise: balanceAfterPaise,
    managerWalletBalanceAfter: paiseToRupees(balanceAfterPaise)
  };
}

function buildPendingActivationSummary(managerDoc) {
  const latestPendingActivationId = cleanText(managerDoc?.latestPendingActivationId);
  if (!latestPendingActivationId) {
    return null;
  }

  const latestPendingPlanType = cleanText(managerDoc?.latestPendingPlanType);

  return {
    id: latestPendingActivationId,
    userName: cleanText(managerDoc?.latestPendingActivationUserName),
    userEmail: normalizeEmail(managerDoc?.latestPendingActivationUserEmail),
    planType: latestPendingPlanType,
    planLabel: cleanText(managerDoc?.latestPendingPlanLabel) || formatPlanLabel(latestPendingPlanType),
    activatedAt: managerDoc?.latestPendingActivationAt || null
  };
}

function getPlanDays(planType) {
  return PLAN_DAYS[planType] || 30;
}

function buildSearchVariants(query) {
  const raw = cleanText(query);
  const lower = raw.toLowerCase();
  const digits = raw.replace(/\D+/g, "");
  const phoneCandidates = /* @__PURE__ */ new Set();

  if (digits.length >= 5) {
    phoneCandidates.add(raw);
    phoneCandidates.add(digits);
    phoneCandidates.add(`+${digits}`);

    if (digits.length > 10) {
      phoneCandidates.add(digits.slice(-10));
      phoneCandidates.add(`+${digits.slice(-10)}`);
    }

    if (digits.length === 10) {
      phoneCandidates.add(`+91${digits}`);
    }
  } else if (raw) {
    phoneCandidates.add(raw);
  }

  return {
    raw,
    lower,
    isEmail: lower.includes("@"),
    phoneCandidates: Array.from(phoneCandidates).filter(Boolean)
  };
}

function normalizeNotes(notes) {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) {
    return {};
  }

  const entries = Object.entries(notes)
    .filter(([key, value]) => cleanText(key) && cleanText(value))
    .slice(0, 15)
    .map(([key, value]) => [cleanText(key), cleanText(value).slice(0, 256)]);

  return Object.fromEntries(entries);
}

function unixSecondsToDate(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1e3) : null;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeCompare(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

async function createHmacHex(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(signature);
}

function ensureRazorpayConfig(env, HttpError) {
  const keyId = cleanText(env?.RAZORPAY_KEY_ID);
  const keySecret = cleanText(env?.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    throw new HttpError(500, "Razorpay is not configured on the worker", {
      code: "razorpay_not_configured"
    });
  }

  return {
    keyId,
    keySecret
  };
}

async function razorpayRequest(env, path, HttpError, options = {}) {
  const { keyId, keySecret } = ensureRazorpayConfig(env, HttpError);
  const response = await fetch(`https://api.razorpay.com${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });

  let payload = null;
  let responseText = "";

  try {
    payload = await response.json();
  } catch {
    try {
      responseText = await response.text();
    } catch {
      responseText = "";
    }
  }

  if (!response.ok) {
    throw new HttpError(response.status, payload?.error?.description || payload?.description || responseText || "Razorpay request failed", {
      code: "razorpay_request_failed",
      razorpayPath: path,
      razorpayStatus: response.status
    });
  }

  return {
    keyId,
    payload: payload || {}
  };
}

async function findManagerDocument(firestore, normalizedEmail) {
  let managerDoc = null;

  try {
    managerDoc = await firestore.getDocument(`${MANAGER_COLLECTION}/${normalizedEmail}`);
  } catch (error) {
    console.error("Direct manager doc lookup failed, trying query fallback:", error);
  }

  if (!managerDoc) {
    try {
      const matches = await firestore.queryCollection(MANAGER_COLLECTION, {
        filters: [
          {
            fieldPath: "email",
            op: "EQUAL",
            value: normalizedEmail
          }
        ],
        limit: 1
      });
      managerDoc = matches[0] || null;
    } catch (error) {
      console.error("Manager query fallback failed:", error);
      throw error;
    }
  }

  return managerDoc;
}

async function loadEnabledManagerRecord({ firestore, auth, HttpError }) {
  const normalizedEmail = normalizeEmail(auth.email);

  if (!normalizedEmail) {
    throw new HttpError(403, "Signed in account does not expose an email address", {
      code: "manager_email_missing"
    });
  }

  const fallbackName = cleanText(auth.name) || normalizedEmail.split("@")[0] || "Manager";
  const managerDoc = await findManagerDocument(firestore, normalizedEmail);

  if (!managerDoc) {
    throw new HttpError(403, "Manager access not found", {
      code: "manager_not_found",
      email: normalizedEmail,
      name: fallbackName
    });
  }

  if (managerDoc.enabled === false) {
    throw new HttpError(403, "Manager access is disabled", {
      code: "manager_disabled",
      email: normalizedEmail,
      name: cleanText(managerDoc.name) || fallbackName
    });
  }

  const manager = buildManagerSummary({
    ...managerDoc,
    id: managerDoc.id || normalizedEmail,
    email: normalizedEmail,
    name: cleanText(managerDoc.name) || fallbackName,
    walletCurrency: cleanText(managerDoc.walletCurrency) || WALLET_CURRENCY
  }, auth);

  return {
    managerDoc,
    manager,
    managerPath: buildManagerPath(manager)
  };
}

export async function requireEnabledManager({ firestore, auth, HttpError }) {
  const { manager } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
  return manager;
}

async function touchManagerLogin(firestore, manager, auth) {
  const now = new Date();
  await firestore.setDocument(
    buildManagerPath(manager),
    {
      email: manager.email,
      name: manager.name,
      walletCurrency: manager.walletCurrency || WALLET_CURRENCY,
      lastLoginAt: now,
      lastLoginName: manager.name,
      lastLoginEmail: manager.email,
      lastLoginUid: cleanText(auth.uid),
      updatedAt: now
    },
    { merge: true }
  );
}

async function exactFieldQuery(firestore, collectionId, fieldPath, value, limit = 8) {
  if (!cleanText(value)) {
    return [];
  }

  return firestore.queryCollection(collectionId, {
    filters: [
      {
        fieldPath,
        op: "EQUAL",
        value
      }
    ],
    limit
  });
}

async function loadSearchResults(firestore, query, HttpError) {
  const variants = buildSearchVariants(query);

  if (variants.raw.length < 2) {
    throw new HttpError(400, "Search query must be at least 2 characters");
  }

  const emailDocs = /* @__PURE__ */ new Map();
  const detailDocs = /* @__PURE__ */ new Map();

  if (variants.isEmail) {
    addUniqueDoc(emailDocs, await firestore.getDocument(`email_data/${variants.lower}`));
    addUniqueDoc(detailDocs, await firestore.getDocument(`userDetails/${variants.lower}`));
  }

  addUniqueDoc(detailDocs, await firestore.getDocument(`userDetails/${variants.raw}`));

  const exactQueries = [
    exactFieldQuery(firestore, "email_data", "email", variants.lower),
    exactFieldQuery(firestore, "email_data", "userId", variants.raw),
    exactFieldQuery(firestore, "userDetails", "email", variants.lower),
    exactFieldQuery(firestore, "userDetails", "userId", variants.raw)
  ];

  for (const phoneCandidate of variants.phoneCandidates) {
    for (const fieldPath of PHONE_FIELDS) {
      exactQueries.push(exactFieldQuery(firestore, "email_data", fieldPath, phoneCandidate));
      exactQueries.push(exactFieldQuery(firestore, "userDetails", fieldPath, phoneCandidate));
    }
  }

  if (!variants.isEmail) {
    for (const fieldPath of NAME_FIELDS) {
      exactQueries.push(exactFieldQuery(firestore, "email_data", fieldPath, variants.raw, 4));
      exactQueries.push(exactFieldQuery(firestore, "userDetails", fieldPath, variants.raw, 4));
    }
  }

  const queryResponses = await Promise.all(exactQueries);

  for (const docs of queryResponses) {
    for (const document of docs) {
      const collectionName = document.path?.split("/").slice(-2, -1)[0];

      if (collectionName === "email_data") {
        addUniqueDoc(emailDocs, document);
      } else if (collectionName === "userDetails") {
        addUniqueDoc(detailDocs, document);
      }

      if (emailDocs.size + detailDocs.size >= MAX_SEARCH_RESULTS * 2) {
        break;
      }
    }
  }

  return {
    emailDocs: serializeDocs(Array.from(emailDocs.values()).slice(0, MAX_SEARCH_RESULTS)),
    detailDocs: serializeDocs(Array.from(detailDocs.values()).slice(0, MAX_SEARCH_RESULTS))
  };
}

function resolveUserDocPaths(user, HttpError) {
  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new HttpError(400, "A user object is required");
  }

  const emailDocPath = buildDocPath(
    "email_data",
    cleanText(user.emailDocId) || normalizeEmail(user.email),
    "email_data",
    HttpError
  );

  const detailDocPath = buildDocPath(
    "userDetails",
    cleanText(user.detailDocId) || cleanText(user.userId),
    "userDetails",
    HttpError
  );

  const paths = [
    emailDocPath,
    detailDocPath
  ].filter(Boolean);

  if (!paths.length) {
    throw new HttpError(400, "No Firestore document key found for this user");
  }

  return paths;
}

async function readUserDocsByPaths(firestore, paths) {
  const documents = await Promise.all(paths.map((path) => firestore.getDocument(path)));
  const emailDocs = [];
  const detailDocs = [];

  documents.forEach((document, index) => {
    const path = paths[index];
    if (!document || !path) {
      return;
    }

    if (path.startsWith("email_data/")) {
      emailDocs.push(document);
    } else if (path.startsWith("userDetails/")) {
      detailDocs.push(document);
    }
  });

  return {
    emailDocs: serializeDocs(emailDocs),
    detailDocs: serializeDocs(detailDocs)
  };
}

function buildWalletOrderResponse(order) {
  return {
    id: cleanText(order.id),
    amountPaise: clampNonNegativePaise(order.amount),
    amount: paiseToRupees(order.amount),
    currency: cleanText(order.currency) || WALLET_CURRENCY,
    receipt: cleanText(order.receipt),
    status: cleanText(order.status) || "created"
  };
}

async function applyWalletCredit({
  firestore,
  manager,
  auth,
  paymentId,
  orderId,
  amountPaise,
  currency,
  payment,
  orderDoc,
  HttpError
}) {
  const transactionId = paymentId;
  const transactionPath = buildWalletTransactionPath(manager, transactionId);
  const currentTransaction = await firestore.getDocument(transactionPath);

  if (currentTransaction?.status === "applied") {
    const { manager: refreshedManager } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
    return {
      manager: refreshedManager,
      transactionId,
      duplicate: true
    };
  }

  if (currentTransaction && currentTransaction.status !== "applied") {
    throw new HttpError(409, "Payment is already being processed. Please refresh once.", {
      code: "payment_processing",
      orderId,
      paymentId
    });
  }

  const now = new Date();
  const created = await firestore.createDocumentIfMissing(transactionPath, {
    id: transactionId,
    type: "credit",
    source: "razorpay",
    status: "pending",
    amountPaise,
    amount: paiseToRupees(amountPaise),
    currency,
    orderId,
    paymentId,
    createdAt: now,
    managerEmail: manager.email,
    managerName: manager.name,
    managerUid: cleanText(auth.uid),
    note: cleanText(orderDoc?.note),
    planType: cleanText(orderDoc?.planType),
    planLabel: cleanText(orderDoc?.planLabel)
  });

  if (!created) {
    const existingTransaction = await firestore.getDocument(transactionPath);

    if (existingTransaction?.status === "applied") {
      const { manager: refreshedManager } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
      return {
        manager: refreshedManager,
        transactionId,
        duplicate: true
      };
    }

    throw new HttpError(409, "Payment is already being processed. Please refresh once.", {
      code: "payment_processing",
      orderId,
      paymentId
    });
  }

  const { managerDoc, managerPath } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
  const walletBalanceBeforePaise = clampNonNegativePaise(managerDoc?.walletBalancePaise);
  const walletBalanceAfterPaise = walletBalanceBeforePaise + amountPaise;
  const walletTotalTopupPaise = clampNonNegativePaise(managerDoc?.walletTotalTopupPaise) + amountPaise;
  const capturedAt = unixSecondsToDate(payment?.captured_at) || now;

  const managerUpdates = {
    walletBalancePaise: walletBalanceAfterPaise,
    walletCurrency: currency || WALLET_CURRENCY,
    walletTotalTopupPaise,
    walletLastTopupAt: capturedAt,
    walletLastTopupAmountPaise: amountPaise,
    walletUpdatedAt: now,
    updatedAt: now,
    updatedByName: manager.name,
    updatedByEmail: manager.email,
    updatedByUid: cleanText(auth.uid)
  };

  await firestore.setDocument(managerPath, managerUpdates, { merge: true });
  await firestore.setDocument(transactionPath, {
    status: "applied",
    appliedAt: capturedAt,
    updatedAt: now,
    gatewayStatus: cleanText(payment?.status) || "captured",
    gatewayMethod: cleanText(payment?.method),
    gatewayContact: cleanText(payment?.contact),
    gatewayEmail: cleanText(payment?.email),
    walletBalanceBeforePaise,
    walletBalanceAfterPaise,
    walletBalanceBefore: paiseToRupees(walletBalanceBeforePaise),
    walletBalanceAfter: paiseToRupees(walletBalanceAfterPaise)
  }, { merge: true });

  await firestore.setDocument(buildWalletOrderPath(manager, orderId), {
    status: "paid",
    paymentId,
    gatewayStatus: cleanText(payment?.status) || "captured",
    gatewayMethod: cleanText(payment?.method),
    amountPaidPaise: amountPaise,
    amountDuePaise: 0,
    attempts: Math.max(1, toInt(orderDoc?.attempts)),
    verifiedAt: now,
    creditedAt: capturedAt,
    transactionId,
    walletBalanceAfterPaise,
    updatedAt: now
  }, { merge: true });

  return {
    manager: buildManagerSummary({
      ...managerDoc,
      ...managerUpdates,
      id: manager.id,
      email: manager.email,
      name: manager.name
    }, auth),
    transactionId,
    duplicate: false
  };
}

function getExistingManagerReferralCode(managerDoc, sanitizeReferralCode) {
  return sanitizeReferralCode(
    managerDoc?.affiliateReferralCode ||
    managerDoc?.myReferralCode ||
    managerDoc?.referralCode ||
    managerDoc?.managerReferralCode
  );
}

function normalizeManagerAffiliateUser(document, toNumber) {
  return {
    id: cleanText(document.id || document.referredUserId || document.oderId),
    referredUserId: cleanText(document.referredUserId || document.oderId || document.id),
    fullName: cleanText(document.fullName) || "Unknown",
    email: cleanText(document.email) || "N/A",
    phoneNumber: cleanText(document.phoneNumber) || "N/A",
    userStatus: cleanText(document.userStatus).toLowerCase() || "registered",
    referredAt: document.referredAt || null,
    installTrackedAt: document.installTrackedAt || null,
    registeredAt: document.registeredAt || null,
    purchasedAt: document.purchasedAt || null,
    installSource: cleanText(document.installSource) || null,
    hasPurchased: Boolean(document.hasPurchased),
    purchasedPlanType: cleanText(document.purchasedPlanType) || null,
    purchaseAmount: toNumber(document.purchaseAmount),
    commissionEarned: toNumber(document.commissionEarned)
  };
}

function normalizeManagerAffiliateInstall(document) {
  return {
    id: cleanText(document.id || document.installId),
    installId: cleanText(document.installId || document.id),
    referralCode: cleanText(document.referralCode) || null,
    installTrackedAt: document.installTrackedAt || null,
    installSource: cleanText(document.installSource) || null,
    linkedUserId: cleanText(document.linkedUserId) || null,
    linkedAt: document.linkedAt || null,
    managerEmail: normalizeEmail(document.managerEmail),
    managerName: cleanText(document.managerName),
    referralOwnerType: cleanText(document.referralOwnerType || document.ownerType).toLowerCase() || "manager"
  };
}

function sortAffiliateUsers(users) {
  return [...users].sort((left, right) => {
    const leftTime = Date.parse(
      left.purchasedAt ||
      left.registeredAt ||
      left.installTrackedAt ||
      left.referredAt ||
      ""
    ) || 0;
    const rightTime = Date.parse(
      right.purchasedAt ||
      right.registeredAt ||
      right.installTrackedAt ||
      right.referredAt ||
      ""
    ) || 0;

    return rightTime - leftTime;
  });
}

function sortAffiliateInstalls(installs) {
  return [...installs].sort((left, right) => {
    const leftTime = Date.parse(left.installTrackedAt || left.linkedAt || "") || 0;
    const rightTime = Date.parse(right.installTrackedAt || right.linkedAt || "") || 0;
    return rightTime - leftTime;
  });
}

export async function handleManagerAccess({ firestore, auth, json, HttpError }) {
  const { manager } = await loadEnabledManagerRecord({ firestore, auth, HttpError });

  try {
    await touchManagerLogin(firestore, manager, auth);
  } catch (error) {
    console.error("Failed to update manager last login:", error);
  }

  return json({
    success: true,
    manager
  });
}

export async function handleManagerSearch({ request, firestore, auth, json, HttpError }) {
  await requireEnabledManager({ firestore, auth, HttpError });
  const url = new URL(request.url);
  const query = cleanText(url.searchParams.get("q"));
  const payload = await loadSearchResults(firestore, query, HttpError);

  return json({
    success: true,
    query,
    ...payload
  });
}

export async function handleManagerCustomers({ firestore, auth, json, HttpError }) {
  const { manager } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
  const [emailDocs, detailDocs] = await Promise.all([
    firestore.queryCollection("email_data", {
      filters: [
        {
          fieldPath: "managerEmail",
          op: "EQUAL",
          value: manager.email
        }
      ],
      limit: MAX_CUSTOMER_DOCS
    }),
    firestore.queryCollection("userDetails", {
      filters: [
        {
          fieldPath: "managerEmail",
          op: "EQUAL",
          value: manager.email
        }
      ],
      limit: MAX_CUSTOMER_DOCS
    })
  ]);

  return json({
    success: true,
    manager,
    emailDocs: serializeDocs(emailDocs),
    detailDocs: serializeDocs(detailDocs)
  });
}

export async function handleManagerWalletOrder({
  request,
  env,
  firestore,
  auth,
  parseBody,
  json,
  HttpError
}) {
  const { manager, managerPath } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
  const body = await parseBody(request);
  const planType = cleanText(body.planType).toLowerCase();
  const requestedAmountPaise = clampNonNegativePaise(body.amountPaise || body.amount);
  const recommendedAmountPaise = getPlanActivationCostPaise(planType);
  const minimumAmountPaise = Math.max(MIN_TOPUP_AMOUNT_PAISE, clampNonNegativePaise(body.minimumAmountPaise));
  const amountPaise = requestedAmountPaise || recommendedAmountPaise || minimumAmountPaise;

  if (amountPaise < minimumAmountPaise) {
    throw new HttpError(400, "Topup amount is below the minimum allowed amount", {
      code: "topup_amount_too_low",
      minimumAmountPaise
    });
  }

  if (amountPaise > MAX_TOPUP_AMOUNT_PAISE) {
    throw new HttpError(400, "Topup amount exceeds the maximum allowed amount", {
      code: "topup_amount_too_high",
      maximumAmountPaise: MAX_TOPUP_AMOUNT_PAISE
    });
  }

  const note = cleanText(body.note || body.reference || body.description);
  const receipt = createReceiptId(manager, planType || "wallet");
  const { keyId, payload: razorpayOrder } = await razorpayRequest(env, "/v1/orders", HttpError, {
    method: "POST",
    body: {
      amount: amountPaise,
      currency: WALLET_CURRENCY,
      receipt,
      notes: normalizeNotes({
        flow: "manager_wallet_topup",
        managerEmail: manager.email,
        managerName: manager.name,
        planType,
        note
      })
    }
  });

  const now = new Date();
  const orderPath = buildWalletOrderPath(manager, cleanText(razorpayOrder.id));

  await firestore.setDocument(orderPath, {
    orderId: cleanText(razorpayOrder.id),
    receipt: cleanText(razorpayOrder.receipt) || receipt,
    status: cleanText(razorpayOrder.status) || "created",
    amountPaise: clampNonNegativePaise(razorpayOrder.amount),
    amount: paiseToRupees(razorpayOrder.amount),
    amountDuePaise: clampNonNegativePaise(razorpayOrder.amount_due),
    amountPaidPaise: clampNonNegativePaise(razorpayOrder.amount_paid),
    currency: cleanText(razorpayOrder.currency) || WALLET_CURRENCY,
    attempts: toInt(razorpayOrder.attempts),
    notes: normalizeNotes(razorpayOrder.notes),
    requestedAt: now,
    createdAt: unixSecondsToDate(razorpayOrder.created_at) || now,
    updatedAt: now,
    requestedByName: manager.name,
    requestedByEmail: manager.email,
    requestedByUid: cleanText(auth.uid),
    managerEmail: manager.email,
    managerName: manager.name,
    managerUid: cleanText(auth.uid),
    note,
    planType: planType || null,
    planLabel: planType ? formatPlanLabel(planType) : "Wallet Topup",
    recommendedAmountPaise,
    recommendedAmount: paiseToRupees(recommendedAmountPaise),
    minimumAmountPaise,
    managerWalletBalanceBeforePaise: manager.walletBalancePaise
  }, { merge: true });

  await firestore.setDocument(managerPath, {
    walletCurrency: WALLET_CURRENCY,
    walletUpdatedAt: now,
    updatedAt: now
  }, { merge: true });

  return json({
    success: true,
    manager,
    razorpay: {
      keyId
    },
    order: buildWalletOrderResponse(razorpayOrder)
  });
}

export async function handleManagerWalletVerify({
  request,
  env,
  firestore,
  auth,
  parseBody,
  json,
  HttpError
}) {
  const { manager } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
  const body = await parseBody(request);
  const orderId = cleanText(body.orderId || body.razorpayOrderId);
  const paymentId = cleanText(body.paymentId || body.razorpayPaymentId);
  const signature = cleanText(body.signature || body.razorpaySignature);

  if (!orderId || !paymentId || !signature) {
    throw new HttpError(400, "Order, payment, and signature are required", {
      code: "wallet_verify_missing_fields"
    });
  }

  const orderPath = buildWalletOrderPath(manager, orderId);
  const orderDoc = await firestore.getDocument(orderPath);

  if (!orderDoc) {
    throw new HttpError(404, "Wallet order not found", {
      code: "wallet_order_not_found",
      orderId
    });
  }

  if (orderDoc.creditedAt || cleanText(orderDoc.status).toLowerCase() === "paid") {
    const { manager: refreshedManager } = await loadEnabledManagerRecord({ firestore, auth, HttpError });

    return json({
      success: true,
      manager: refreshedManager,
      order: {
        id: orderId,
        amountPaise: clampNonNegativePaise(orderDoc.amountPaise),
        amount: paiseToRupees(orderDoc.amountPaise),
        currency: cleanText(orderDoc.currency) || WALLET_CURRENCY,
        status: "paid"
      }
    });
  }

  const { keySecret } = ensureRazorpayConfig(env, HttpError);
  const expectedSignature = await createHmacHex(`${orderId}|${paymentId}`, keySecret);

  if (!safeCompare(expectedSignature, signature)) {
    throw new HttpError(400, "Payment signature verification failed", {
      code: "wallet_signature_invalid",
      orderId,
      paymentId
    });
  }

  const { payload: payment } = await razorpayRequest(env, `/v1/payments/${paymentId}`, HttpError);
  const paymentStatus = cleanText(payment.status).toLowerCase();
  const paymentOrderId = cleanText(payment.order_id);
  const paymentAmountPaise = clampNonNegativePaise(payment.amount);
  const orderAmountPaise = clampNonNegativePaise(orderDoc.amountPaise);

  if (!paymentOrderId || paymentOrderId !== orderId) {
    throw new HttpError(400, "Payment does not belong to this order", {
      code: "wallet_payment_order_mismatch",
      orderId,
      paymentId
    });
  }

  if (paymentAmountPaise !== orderAmountPaise) {
    throw new HttpError(400, "Payment amount does not match the wallet topup order", {
      code: "wallet_payment_amount_mismatch",
      orderId,
      paymentId
    });
  }

  if (paymentStatus !== "captured") {
    throw new HttpError(409, "Payment is not captured yet. Please retry once the payment is captured.", {
      code: "wallet_payment_not_captured",
      orderId,
      paymentId,
      paymentStatus
    });
  }

  const { manager: updatedManager, transactionId, duplicate } = await applyWalletCredit({
    firestore,
    manager,
    auth,
    paymentId,
    orderId,
    amountPaise: paymentAmountPaise,
    currency: cleanText(payment.currency) || WALLET_CURRENCY,
    payment,
    orderDoc,
    HttpError
  });

  const now = new Date();
  await firestore.setDocument(orderPath, {
    verifiedAt: now,
    updatedAt: now,
    paymentId,
    signature,
    gatewayStatus: paymentStatus,
    gatewayMethod: cleanText(payment.method),
    gatewayEmail: cleanText(payment.email),
    gatewayContact: cleanText(payment.contact),
    duplicateVerification: duplicate
  }, { merge: true });

  return json({
    success: true,
    manager: updatedManager,
    order: {
      id: orderId,
      amountPaise: paymentAmountPaise,
      amount: paiseToRupees(paymentAmountPaise),
      currency: cleanText(payment.currency) || WALLET_CURRENCY,
      status: "paid"
    },
    transaction: {
      id: transactionId,
      duplicate
    }
  });
}

export async function handleManagerActivate({
  request,
  firestore,
  auth,
  parseBody,
  json,
  HttpError
}) {
  const { manager, managerDoc, managerPath } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
  const body = await parseBody(request);
  const planType = cleanText(body.planType).toLowerCase();
  const pendingAdminReceiptCount = Math.max(0, toInt(managerDoc?.pendingAdminReceiptCount));

  if (pendingAdminReceiptCount > 0) {
    throw new HttpError(409, "Clear your dues to admin before the next activation.", {
      code: "clear_admin_dues_required",
      pendingAdminReceiptCount,
      latestPendingActivation: buildPendingActivationSummary(managerDoc)
    });
  }

  if (!PLAN_DAYS[planType]) {
    throw new HttpError(400, "Unsupported plan type", {
      code: "invalid_plan_type",
      planType
    });
  }

  const paymentMethod = cleanText(body.paymentMethod).toLowerCase() || "manager_panel";
  if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
    throw new HttpError(400, "Unsupported payment method", {
      code: "invalid_payment_method",
      paymentMethod
    });
  }

  if (body.customerPaymentReceived !== true) {
    throw new HttpError(400, "Confirm customer payment before activating this plan.", {
      code: "customer_payment_confirmation_required"
    });
  }

  const planPricePaise = getPlanPricePaise(planType);
  if (planPricePaise <= 0) {
    throw new HttpError(400, "Plan pricing is not configured for this activation", {
      code: "plan_pricing_missing",
      planType
    });
  }

  const reference = cleanText(body.reference);
  const userName = cleanText(body.user?.name) || cleanText(body.user?.email) || "Customer";
  const userEmail = normalizeEmail(body.user?.email);
  const activationEventId = createActivationEventId(manager, body.user, planType);
  const paths = resolveUserDocPaths(body.user, HttpError);
  const emailDocId = paths.find((path) => path.startsWith("email_data/"))?.split("/").pop() || cleanText(body.user?.emailDocId);
  const detailDocId = paths.find((path) => path.startsWith("userDetails/"))?.split("/").pop() || cleanText(body.user?.detailDocId);
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + getPlanDays(planType) * 24 * 60 * 60 * 1e3);
  const planLabel = formatPlanLabel(planType);

  const payload = {
    subscriptionType: "premium",
    planType,
    purchasedPlanType: planType,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    contactsLimit: PREMIUM_LIMITS.contacts,
    groupsLimit: PREMIUM_LIMITS.groups,
    lastPaymentDate: startDate,
    paymentMethod,
    userStatus: "purchased",
    isActive: true,
    ...buildReferenceFields(paymentMethod, reference),
    activatedByRole: "manager",
    activatedByName: manager.name,
    activatedByEmail: manager.email,
    activatedByUid: cleanText(auth.uid),
    activationPanel: "manager_panel",
    managerName: manager.name,
    managerEmail: manager.email,
    managerUid: cleanText(auth.uid),
    managerActivatedAt: startDate,
    managerActivationEventId: activationEventId,
    customerPaymentReceived: true,
    customerPaymentReceivedAt: startDate,
    customerPaymentConfirmedByName: manager.name,
    customerPaymentConfirmedByEmail: manager.email,
    customerPaymentConfirmedByUid: cleanText(auth.uid),
    adminReceiptStatus: "pending",
    adminPaymentReceived: false,
    adminPaymentReceivedAt: null,
    adminPaymentReceivedByName: "",
    adminPaymentReceivedByEmail: "",
    adminPaymentReceivedByUid: "",
    lastPlanAction: "activate",
    lastPlanActionAt: startDate,
    planPricePaise,
    planPrice: paiseToRupees(planPricePaise)
  };

  const managerUpdates = {
    pendingAdminReceiptCount: pendingAdminReceiptCount + 1,
    latestPendingActivationId: activationEventId,
    latestPendingActivationAt: startDate,
    latestPendingActivationUserName: userName,
    latestPendingActivationUserEmail: userEmail,
    latestPendingPlanType: planType,
    latestPendingPlanLabel: planLabel,
    totalManagerActivations: Math.max(0, toInt(managerDoc?.totalManagerActivations)) + 1,
    lastManagerActivationAt: startDate,
    updatedAt: startDate,
    updatedByName: manager.name,
    updatedByEmail: manager.email,
    updatedByUid: cleanText(auth.uid)
  };
  const activationLogPayload = {
    id: activationEventId,
    managerEmail: manager.email,
    managerName: manager.name,
    managerUid: cleanText(auth.uid),
    userId: cleanText(body.user?.userId),
    userName,
    userEmail,
    emailDocId,
    detailDocId,
    paymentMethod,
    activationReference: reference,
    planType,
    planLabel,
    planPricePaise,
    planPrice: paiseToRupees(planPricePaise),
    activationPanel: "manager_panel",
    customerPaymentReceived: true,
    customerPaymentReceivedAt: startDate,
    customerPaymentConfirmedByName: manager.name,
    customerPaymentConfirmedByEmail: manager.email,
    customerPaymentConfirmedByUid: cleanText(auth.uid),
    adminReceiptStatus: "pending",
    adminPaymentReceived: false,
    adminPaymentReceivedAt: null,
    adminPaymentReceivedByName: "",
    adminPaymentReceivedByEmail: "",
    adminPaymentReceivedByUid: "",
    activatedAt: startDate,
    createdAt: startDate,
    updatedAt: startDate
  };

  await Promise.all([
    ...paths.map((path) => firestore.setDocument(path, payload, { merge: true })),
    firestore.setDocument(buildManagerActivationPath(activationEventId), activationLogPayload, { merge: true }),
    firestore.setDocument(managerPath, managerUpdates, { merge: true })
  ]);
  const userDocs = await readUserDocsByPaths(firestore, paths);

  return json({
    success: true,
    startMillis: startDate.getTime(),
    endMillis: endDate.getTime(),
    planPricePaise,
    manager: buildManagerSummary({
      ...managerDoc,
      ...managerUpdates,
      id: manager.id,
      email: manager.email,
      name: manager.name
    }, auth),
    activationId: activationEventId,
    ...userDocs
  });
}

export async function handleManagerAffiliate({
  request,
  env,
  firestore,
  auth,
  json,
  HttpError,
  buildReferralLink,
  sanitizeReferralCode,
  generateUniqueReferralCode,
  pickFirstNonEmpty,
  toInt: externalToInt
}) {
  const { manager, managerDoc, managerPath } = await loadEnabledManagerRecord({ firestore, auth, HttpError });
  const managerName = pickFirstNonEmpty(
    managerDoc.name,
    manager.name,
    auth.name,
    manager.email,
    auth.uid
  );

  let referralCode = getExistingManagerReferralCode(managerDoc, sanitizeReferralCode);
  if (!referralCode) {
    referralCode = await generateUniqueReferralCode(firestore, managerName, manager.id || auth.uid);
  }

  const referralLink = buildReferralLink(env, request, referralCode);
  const now = new Date();
  const managerUpdates = {};
  const statFields = [
    "referralLinkClicks",
    "trackedInstalls",
    "trackedRegistrations",
    "successfulReferrals",
    "totalReferralEarnings",
    "pendingEarnings",
    "withdrawnEarnings",
    "referralCount"
  ];

  for (const fieldName of statFields) {
    if (typeof managerDoc[fieldName] === "undefined") {
      managerUpdates[fieldName] = 0;
    }
  }

  if (cleanText(managerDoc.name) !== managerName) {
    managerUpdates.name = managerName;
  }

  if (normalizeEmail(managerDoc.email) !== manager.email) {
    managerUpdates.email = manager.email;
  }

  if (!cleanText(managerDoc.walletCurrency)) {
    managerUpdates.walletCurrency = WALLET_CURRENCY;
  }

  if (getExistingManagerReferralCode(managerDoc, sanitizeReferralCode) !== referralCode) {
    managerUpdates.affiliateReferralCode = referralCode;
    managerUpdates.myReferralCode = referralCode;
  }

  if (cleanText(managerDoc.referralLink) !== referralLink) {
    managerUpdates.referralLink = referralLink;
  }

  if (!managerDoc.createdAt) {
    managerUpdates.createdAt = now;
  }

  if (Object.keys(managerUpdates).length > 0) {
    managerUpdates.updatedAt = now;
    managerUpdates.affiliateUpdatedAt = now;
    await firestore.setDocument(managerPath, managerUpdates, { merge: true });
  }

  await firestore.setDocument(`referralCodes/${referralCode}`, {
    referralCode,
    ownerType: "manager",
    managerEmail: manager.email,
    managerName,
    managerUid: cleanText(auth.uid),
    referrerName: managerName,
    referrerEmail: manager.email,
    active: true,
    createdAt: managerDoc.createdAt || now,
    updatedAt: now
  }, { merge: true });

  const [referredUserDocs, installDocs] = await Promise.all([
    firestore.listDocuments(`${managerPath}/referredUsers`),
    firestore.queryCollection("referralInstalls", {
      filters: [
        {
          fieldPath: "managerEmail",
          op: "EQUAL",
          value: manager.email
        }
      ],
      limit: MAX_MANAGER_AFFILIATE_INSTALLS
    })
  ]);

  const referredUsers = sortAffiliateUsers(
    referredUserDocs
      .map((document) => normalizeManagerAffiliateUser(document, externalToInt))
      .slice(0, MAX_MANAGER_AFFILIATE_USERS)
  );

  const installHistory = sortAffiliateInstalls(
    installDocs.map(normalizeManagerAffiliateInstall)
  );

  const resolvedManagerDoc = {
    ...managerDoc,
    ...managerUpdates,
    id: manager.id,
    email: manager.email,
    name: managerName,
    affiliateReferralCode: referralCode,
    myReferralCode: referralCode,
    referralLink
  };

  const affiliateStats = {
    referralCode,
    referralLink,
    referralCount: externalToInt(resolvedManagerDoc.referralCount),
    referralLinkClicks: externalToInt(resolvedManagerDoc.referralLinkClicks),
    trackedInstalls: externalToInt(resolvedManagerDoc.trackedInstalls),
    trackedRegistrations: externalToInt(resolvedManagerDoc.trackedRegistrations),
    successfulReferrals: externalToInt(resolvedManagerDoc.successfulReferrals),
    totalReferralEarnings: externalToInt(resolvedManagerDoc.totalReferralEarnings),
    pendingEarnings: externalToInt(resolvedManagerDoc.pendingEarnings),
    withdrawnEarnings: externalToInt(resolvedManagerDoc.withdrawnEarnings)
  };

  return json({
    success: true,
    manager: buildManagerSummary(resolvedManagerDoc, auth),
    affiliate: affiliateStats,
    referredUsers,
    installHistory
  });
}
