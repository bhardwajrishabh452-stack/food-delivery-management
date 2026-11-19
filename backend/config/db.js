import fs from "fs/promises";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { db } from "../models/store.js";
import { User } from "../models/User.js";
import { Restaurant } from "../models/Restaurant.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { Coupon } from "../models/Coupon.js";
import { DeliveryAssignment } from "../models/DeliveryAssignment.js";
import { Settlement } from "../models/Settlement.js";
import { featureTransactionModels } from "../models/FeatureTransaction.js";
import { removeSensitiveTimelineEntries } from "../security/orderTimeline.js";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backupPath = path.join(backendDirectory, "data", "fds.json");
const persistenceModels = {
  users: User,
  restaurants: Restaurant,
  menuItems: MenuItem,
  orders: Order,
  coupons: Coupon,
  deliveries: DeliveryAssignment,
  settlements: Settlement,
  ...featureTransactionModels
};

const requiredSnapshotCollections = [
  "users",
  "restaurants",
  "menuItems",
  "orders",
  "coupons",
  "deliveries",
  "settlements"
];

let isMongoConnected = false;
let mongoConfigured = false;
let initializationComplete = false;
let connectionListenersConfigured = false;
let lastBackupError = null;
let pendingMongoChanges = [];
let pendingMongoSync = Promise.resolve();

const getSnapshotEncryptionKey = () => {
  const encodedKey = process.env.DATA_ENCRYPTION_KEY;
  if (!encodedKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_ENCRYPTION_KEY must be configured in production");
    }
    return null;
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new Error("DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return key;
};

const encryptSnapshot = (snapshot, key) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(snapshot, "utf8"), cipher.final()]);
  return JSON.stringify({
    format: "fds-encrypted-v1",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  });
};

const decryptSnapshot = (envelope, key) => {
  if (
    typeof envelope.iv !== "string" ||
    typeof envelope.authTag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("Local snapshot encryption envelope is invalid");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
};

const toPlainValue = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlainValue);
  if (value && typeof value.toHexString === "function") return value.toHexString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "__v")
        .map(([key, nestedValue]) => [key, toPlainValue(nestedValue)])
    );
  }
  return value;
};

const normalizeDocument = (document) => {
  const plain = toPlainValue(document);
  return { ...plain, _id: String(plain._id) };
};

const writeLocalSnapshot = async () => {
  const directory = path.dirname(backupPath);
  const temporaryPath = `${backupPath}.${process.pid}.tmp`;
  try {
    await fs.mkdir(directory, { recursive: true });
    const snapshot = JSON.stringify({ ...db, _pendingMongoChanges: pendingMongoChanges }, null, 2);
    const key = getSnapshotEncryptionKey();
    await fs.writeFile(
      temporaryPath,
      key ? encryptSnapshot(snapshot, key) : snapshot,
      "utf8"
    );
    await fs.rename(temporaryPath, backupPath);
    lastBackupError = null;
  } catch (error) {
    lastBackupError = error.message;
    throw error;
  }
};

const readLocalSnapshot = async () => {
  try {
    const content = await fs.readFile(backupPath, "utf8");
    const parsedContent = JSON.parse(content);
    const encrypted = parsedContent.format === "fds-encrypted-v1";
    let snapshot;
    if (encrypted) {
      const key = getSnapshotEncryptionKey();
      if (!key) throw new Error("DATA_ENCRYPTION_KEY is required to read the encrypted local snapshot");
      snapshot = JSON.parse(decryptSnapshot(parsedContent, key));
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Production local snapshots must be encrypted");
      }
      snapshot = parsedContent;
    }
    for (const collectionName of requiredSnapshotCollections) {
      if (!Array.isArray(snapshot[collectionName])) {
        throw new Error(`Local snapshot collection '${collectionName}' is invalid`);
      }
    }
    for (const collectionName of Object.keys(persistenceModels)) {
      const documents = snapshot[collectionName];
      if (documents !== undefined && !Array.isArray(documents)) {
        throw new Error(`Local snapshot collection '${collectionName}' is invalid`);
      }
      db[collectionName] = documents || [];
    }
    pendingMongoChanges = Array.isArray(snapshot._pendingMongoChanges)
      ? snapshot._pendingMongoChanges
      : [];
    if (!encrypted && process.env.DATA_ENCRYPTION_KEY) await writeLocalSnapshot();
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

const modelOperationsForCollection = (collectionName, before, after) => {
  const oldDocuments = new Map(before.map((document) => [String(document._id), document]));
  const newDocuments = new Map(after.map((document) => [String(document._id), document]));
  const operations = [];

  for (const [id] of oldDocuments) {
    if (!newDocuments.has(id)) operations.push({ deleteOne: { filter: { _id: id } } });
  }

  for (const [id, document] of newDocuments) {
    const oldDocument = oldDocuments.get(id);
    if (!oldDocument || JSON.stringify(oldDocument) !== JSON.stringify(document)) {
      operations.push({
        replaceOne: {
          filter: { _id: id },
          replacement: document,
          upsert: true
        }
      });
    }
  }

  return operations;
};

const persistMongoChanges = async (collectionNames, snapshots, after) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const collectionName of collectionNames) {
        const operations = modelOperationsForCollection(
          collectionName,
          snapshots[collectionName],
          after[collectionName]
        );
        if (operations.length > 0) {
          await persistenceModels[collectionName].bulkWrite(operations, {
            session,
            ordered: true
          });
        }
      }
    });
  } finally {
    await session.endSession();
  }
};

export const migrateLegacyDemoData = async () => {
  const legacyDemoEmails = new Set([
    "customer@fds.com",
    "owner@fds.com",
    "rider@fds.com",
    "admin@fds.com"
  ]);
  const legacyDemoUserIds = new Set(
    Array.from({ length: 4 }, (_, index) => `65b${String(index + 1).padStart(21, "0")}`)
  );
  const legacyRestaurantIds = new Set(
    Array.from({ length: 6 }, (_, index) => `65c${String(index + 1).padStart(21, "0")}`)
  );
  const legacyCouponIds = new Set(
    Array.from({ length: 3 }, (_, index) => `65e${String(index + 1).padStart(21, "0")}`)
  );
  const legacyCouponCodes = new Set(["FDSFIRST", "TASTY30", "FLAT50"]);
  const legacySampleOrderIds = new Set(["65f000000000000000000001"]);
  const legacyDeliveryIds = new Set(["65a000000000000000000001"]);
  const legacySettlementIds = new Set(["658000000000000000000001"]);
  const demoUsers = db.users.filter((user) =>
    user.isDemo === true || legacyDemoEmails.has(user.email?.toLowerCase())
  );
  const demoUserIds = new Set([
    ...legacyDemoUserIds,
    ...demoUsers.map((user) => String(user._id))
  ]);
  const legacyEntityIds = new Set([
    ...demoUserIds,
    ...legacyRestaurantIds,
    ...legacyCouponIds,
    ...legacySampleOrderIds,
    ...legacyDeliveryIds,
    ...legacySettlementIds
  ]);
  const auditCollections = [
    "restaurantTransactions",
    "menuTransactions",
    "cartTransactions",
    "orderTransactions",
    "restaurantPanelTransactions",
    "deliveryTransactions",
    "trackingTransactions",
    "couponTransactions",
    "paymentTransactions",
    "settlementTransactions"
  ];
  const referencesLegacyData = (record) => {
    const details = record.details || {};
    const values = details.values || {};
    const referencedIds = [
      details.entityId,
      details.orderId,
      details.restaurantId,
      details.couponId,
      values.entityId,
      values.restaurantId,
      values.orderId,
      ...(Array.isArray(details.orderIds) ? details.orderIds : []),
      ...(Array.isArray(values.orderIds) ? values.orderIds : [])
    ];
    return demoUserIds.has(String(details.actor?.id)) ||
      referencedIds.some((id) => legacyEntityIds.has(String(id)));
  };
  const hasLegacyBusinessData = [
    db.users.some((user) => demoUserIds.has(String(user._id))),
    db.restaurants.some((restaurant) =>
      legacyRestaurantIds.has(String(restaurant._id)) && restaurant.ownerId != null
    ),
    db.orders.some((order) =>
      demoUserIds.has(String(order.customerId)) || demoUserIds.has(String(order.riderId))
    ),
    db.deliveries.some((delivery) => demoUserIds.has(String(delivery.riderId))),
    db.coupons.some((coupon) =>
      legacyCouponIds.has(String(coupon._id)) || legacyCouponCodes.has(coupon.code)
    ),
    db.orders.some((order) => legacySampleOrderIds.has(String(order._id))),
    db.deliveries.some((delivery) => legacyDeliveryIds.has(String(delivery._id))),
    db.settlements.some((settlement) =>
      legacySettlementIds.has(String(settlement._id)) ||
      legacyRestaurantIds.has(String(settlement.entityId))
    ),
    auditCollections.some((collectionName) => db[collectionName].some(referencesLegacyData))
  ].some(Boolean);
  if (demoUsers.length === 0 && !hasLegacyBusinessData) return;

  const demoOrders = db.orders.filter((order) =>
    demoUserIds.has(String(order.customerId)) ||
    demoUserIds.has(String(order.riderId)) ||
    legacySampleOrderIds.has(String(order._id))
  );
  const demoOrderIds = new Set(demoOrders.map((order) => String(order._id)));
  const affectedCollections = [
    "users",
    "orders",
    "coupons",
    "deliveries",
    "settlements",
    ...auditCollections
  ];
  const legacyRestaurantsWithOwners = db.restaurants.filter((restaurant) =>
    legacyRestaurantIds.has(String(restaurant._id)) && restaurant.ownerId != null
  );
  if (legacyRestaurantsWithOwners.length > 0) affectedCollections.push("restaurants");
  const snapshots = Object.fromEntries(
    affectedCollections.map((collectionName) => [collectionName, structuredClone(db[collectionName])])
  );

  db.users = db.users.filter((user) => !demoUserIds.has(String(user._id)));
  for (const restaurant of legacyRestaurantsWithOwners) restaurant.ownerId = null;
  db.orders = db.orders.filter((order) => !demoOrderIds.has(String(order._id)));
  db.coupons = db.coupons.filter((coupon) =>
    !legacyCouponIds.has(String(coupon._id)) &&
    !legacyCouponCodes.has(coupon.code)
  );
  db.deliveries = db.deliveries.filter((delivery) =>
    !demoUserIds.has(String(delivery.riderId)) &&
    !demoOrderIds.has(String(delivery.orderId)) &&
    !legacyDeliveryIds.has(String(delivery._id))
  );
  db.settlements = db.settlements.filter((settlement) =>
    !legacySettlementIds.has(String(settlement._id)) &&
    !legacyRestaurantIds.has(String(settlement.entityId)) &&
    !(Array.isArray(settlement.orderIds) && settlement.orderIds.some((orderId) => demoOrderIds.has(String(orderId))))
  );
  for (const collectionName of auditCollections) {
    db[collectionName] = db[collectionName].filter((record) => !referencesLegacyData(record));
  }

  await persistCollections(affectedCollections, snapshots);
};

const migrateSensitiveOrderTimelineEntries = async () => {
  const snapshots = { orders: structuredClone(db.orders) };
  let changed = false;
  for (const order of db.orders) {
    const timeline = removeSensitiveTimelineEntries(order.timeline);
    if (!Array.isArray(order.timeline) || timeline.length !== order.timeline.length) {
      order.timeline = timeline;
      changed = true;
    }
  }
  if (!changed) return;

  const after = { orders: structuredClone(db.orders) };
  if (isMongoConnected) {
    await persistMongoChanges(["orders"], snapshots, after);
  } else if (mongoConfigured) {
    pendingMongoChanges.push({ collectionNames: ["orders"], snapshots, after });
  }
  await writeLocalSnapshot();
};

export const persistCollections = async (collectionNames, snapshots) => {
  const after = Object.fromEntries(
    collectionNames.map((collectionName) => [collectionName, structuredClone(db[collectionName])])
  );
  const queueChange = () => {
    pendingMongoChanges.push({ collectionNames, snapshots, after });
  };
  if (!isMongoConnected && mongoConfigured) queueChange();
  await writeLocalSnapshot();
  if (isMongoConnected) {
    await pendingMongoSync;
    if (isMongoConnected) {
      await persistMongoChanges(collectionNames, snapshots, after).catch((error) => {
        throw new Error(`MongoDB transaction failed: ${error.message}`);
      });
    } else if (mongoConfigured) {
      queueChange();
      await writeLocalSnapshot();
    }
  }
};

export const restoreLocalSnapshot = writeLocalSnapshot;

const flushPendingMongoChanges = async () => {
  while (pendingMongoChanges.length > 0) {
    const change = pendingMongoChanges[0];
    await persistMongoChanges(change.collectionNames, change.snapshots, change.after);
    pendingMongoChanges.shift();
  }
};

const replaceMemoryWithMongo = async () => {
  let totalDocuments = 0;
  const loaded = {};
  for (const [collectionName, Model] of Object.entries(persistenceModels)) {
    loaded[collectionName] = (await Model.find({}).lean().exec()).map(normalizeDocument);
    totalDocuments += loaded[collectionName].length;
  }
  if (totalDocuments === 0) return false;
  for (const [collectionName, documents] of Object.entries(loaded)) {
    db[collectionName] = documents;
  }
  return true;
};

const persistSeedData = async () => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const [collectionName, Model] of Object.entries(persistenceModels)) {
        const documents = db[collectionName];
        if (documents.length > 0) {
          await Model.insertMany(documents, { session, ordered: true });
        }
      }
    });
  } finally {
    await session.endSession();
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    mongoConfigured = true;
    try {
      mongoose.set("strictQuery", false);
      if (!connectionListenersConfigured) {
        mongoose.connection.on("disconnected", () => {
          isMongoConnected = false;
          console.error("[Database] MongoDB disconnected; requests will use the local JSON snapshot.");
        });
        mongoose.connection.on("connected", () => {
          if (!initializationComplete) return;
          isMongoConnected = true;
          pendingMongoSync = flushPendingMongoChanges()
            .then(writeLocalSnapshot)
            .catch((error) => {
              isMongoConnected = false;
              console.error(`[Database] Failed to synchronize offline writes to MongoDB: ${error.message}`);
            });
        });
        connectionListenersConfigured = true;
      }
      const connectionOptions = { serverSelectionTimeoutMS: 5000 };
      if (process.env.NODE_ENV === "production") {
        connectionOptions.tls = true;
        connectionOptions.tlsAllowInvalidCertificates = false;
      }
      await mongoose.connect(uri, connectionOptions);
      isMongoConnected = true;
      await Promise.all(Object.values(featureTransactionModels).map((Model) => Model.init()));
      const hasLocalSnapshot = await readLocalSnapshot();
      const hasCloudData = await replaceMemoryWithMongo();
      if (hasCloudData) {
        await flushPendingMongoChanges();
        await replaceMemoryWithMongo();
      } else {
        if (!hasLocalSnapshot) pendingMongoChanges = [];
        await persistSeedData();
        pendingMongoChanges = [];
      }
      await migrateLegacyDemoData();
      await migrateSensitiveOrderTimelineEntries();
      await writeLocalSnapshot();
      initializationComplete = true;
      console.log(`[Database] MongoDB connected to ${mongoose.connection.host}; local JSON backup is enabled.`);
      return true;
    } catch (error) {
      isMongoConnected = false;
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect();
        } catch (disconnectError) {
          console.error(`[Database] Failed to close the unavailable MongoDB connection: ${disconnectError.message}`);
        }
      }
      console.error(`[Database] MongoDB unavailable (${error.name}: ${error.message}); loading local JSON backup.`);
    }
  }

  try {
    const restored = await readLocalSnapshot();
    if (!restored) await writeLocalSnapshot();
    await migrateLegacyDemoData();
    await migrateSensitiveOrderTimelineEntries();
    initializationComplete = true;
    console.warn("[Database] Running with local JSON persistence; configure MONGODB_URI for MongoDB primary storage.");
    return false;
  } catch (error) {
    throw new Error(`Unable to initialize local JSON persistence: ${error.message}`);
  }
};

export const getPersistenceStatus = () => ({
  primary: isMongoConnected ? "mongodb" : "local-json",
  mongoConnected: isMongoConnected,
  backupPath,
  backupError: lastBackupError
});

export const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  isMongoConnected = false;
  initializationComplete = false;
};
