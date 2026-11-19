import { persistCollections, restoreLocalSnapshot } from "../config/db.js";
import { db, generateId } from "../models/store.js";
import { createFeatureTransaction } from "../models/FeatureTransaction.js";

let transactionTail = Promise.resolve();

export const createId = generateId;

const clone = (value) => structuredClone(value);

const auditTargets = {
  restaurants: "restaurantTransactions",
  menuItems: "menuTransactions",
  orders: "orderTransactions",
  deliveries: "deliveryTransactions",
  coupons: "couponTransactions",
  settlements: "settlementTransactions"
};

const auditFields = {
  restaurants: ["name", "isOpen", "isApproved", "deliveryTimeMinutes", "minOrderAmount", "commissionRate"],
  menuItems: ["restaurantId", "name", "category", "price", "isAvailable"],
  orders: ["orderNumber", "restaurantId", "status", "pricing"],
  deliveries: ["orderId", "riderId", "status", "deliveryFeeEarning", "assignedAt", "acceptedAt", "deliveredAt"],
  coupons: ["code", "discountType", "discountValue", "minOrderAmount", "maxDiscountAmount", "validUntil", "isActive", "usageCount"],
  settlements: ["entityType", "entityId", "totalOrders", "grossAmount", "commissionAmount", "taxAmount", "payoutAmount", "status", "orderIds", "payoutReference", "settledAt"]
};

const changedFields = (before, after) => {
  if (!before) return Object.keys(after).filter((field) => !["_id", "createdAt", "updatedAt"].includes(field));
  const allFields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...allFields].filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
};

const getAuditValues = (collectionName, entity) => {
  const values = Object.fromEntries(
    auditFields[collectionName]
      .filter((field) => entity[field] !== undefined)
      .map((field) => [field, entity[field]])
  );
  if (collectionName === "orders" && entity.payment) {
    values.payment = {
      method: entity.payment.method,
      status: entity.payment.status
    };
  }
  return values;
};

const recordTransactionAudits = (collectionNames, snapshots, actor) => {
  const persistedCollectionNames = new Set(collectionNames);
  const actorDetails = actor
    ? { id: String(actor._id || actor.id), role: actor.role }
    : null;

  const append = (auditCollection, status, details) => {
    if (!snapshots[auditCollection]) snapshots[auditCollection] = clone(db[auditCollection]);
    db[auditCollection].push(createFeatureTransaction(auditCollection, status, details));
    persistedCollectionNames.add(auditCollection);
  };

  for (const collectionName of collectionNames) {
    const auditCollection = auditTargets[collectionName];
    if (!auditCollection) continue;

    const before = snapshots[collectionName];
    const after = db[collectionName];
    const beforeById = new Map(before.map((document) => [String(document._id), document]));
    const afterById = new Map(after.map((document) => [String(document._id), document]));
    const entityIds = new Set([...beforeById.keys(), ...afterById.keys()]);

    for (const entityId of entityIds) {
      const previous = beforeById.get(entityId);
      const current = afterById.get(entityId);
      const action = !previous ? "created" : !current ? "deleted" : "updated";
      if (previous && current && changedFields(previous, current).length === 0) continue;

      const fields = current ? changedFields(previous, current) : Object.keys(previous);
      const status = !current
        ? "deleted"
        : typeof current.status === "string"
          ? current.status
          : typeof current.isOpen === "boolean"
            ? current.isOpen ? "active" : "inactive"
            : typeof current.isAvailable === "boolean"
              ? current.isAvailable ? "active" : "inactive"
              : typeof current.isActive === "boolean"
                ? current.isActive ? "active" : "inactive"
                : action;
      const details = {
        entityId,
        sourceCollection: collectionName,
        action,
        changedFields: fields,
        values: getAuditValues(collectionName, current || previous),
        actor: actorDetails
      };
      append(auditCollection, status, details);

      if (
        actor?.role === "restaurant" &&
        ["restaurants", "menuItems", "orders"].includes(collectionName)
      ) {
        append("restaurantPanelTransactions", status, details);
      }

      if (collectionName === "orders") {
        const previousPayment = previous?.payment || null;
        const currentPayment = current?.payment || null;
        if (JSON.stringify(previousPayment) !== JSON.stringify(currentPayment)) {
          append("paymentTransactions",
            currentPayment?.status || "removed",
            {
              orderId: entityId,
              action,
              method: currentPayment?.method || null,
              paymentStatus: currentPayment?.status || null,
              actor: actorDetails
            }
          );
        }

        const trackingFields = fields.filter((field) =>
          ["currentLocation", "simulationStep", "estimatedDeliveryMinutes", "status"].includes(field)
        );
        if (trackingFields.length > 0) {
          append("trackingTransactions", current?.status || "deleted", {
            orderId: entityId,
            changedFields: trackingFields,
            currentLocation: current?.currentLocation || null,
            estimatedDeliveryMinutes: current?.estimatedDeliveryMinutes ?? null,
            actor: actorDetails
          });
        }
      }
    }
  }

  return [...persistedCollectionNames];
};

const executeTransaction = async (collectionNames, operation, actor) => {
  const snapshots = {};
  for (const collectionName of collectionNames) {
    if (!Array.isArray(db[collectionName])) {
      throw new Error(`Unknown transaction collection: ${collectionName}`);
    }
    snapshots[collectionName] = clone(db[collectionName]);
  }

  try {
    const result = await operation();
    const collectionsToPersist = recordTransactionAudits(collectionNames, snapshots, actor);
    await persistCollections(collectionsToPersist, snapshots);
    return result;
  } catch (error) {
    for (const collectionName of Object.keys(snapshots)) {
      db[collectionName] = snapshots[collectionName];
    }
    try {
      await restoreLocalSnapshot();
    } catch (backupError) {
      throw new AggregateError(
        [error, backupError],
        `Transaction failed and the local snapshot could not be restored: ${error.message}`
      );
    }
    throw error;
  }
};

export const runInMemoryTransaction = (collectionNames, operation, actor = null) => {
  const transaction = () => executeTransaction(collectionNames, operation, actor);
  const current = transactionTail.then(transaction);
  transactionTail = current.catch(() => undefined);
  return current;
};
