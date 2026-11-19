import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv, pbkdf2Sync } from "crypto";
import fs from "fs/promises";
import express from "express";
import { db, seedDatabase } from "../models/store.js";
import {
  closeDB,
  connectDB,
  getPersistenceStatus,
  migrateLegacyDemoData,
  persistCollections
} from "../config/db.js";
import { User } from "../models/User.js";
import { Restaurant } from "../models/Restaurant.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { Coupon } from "../models/Coupon.js";
import { DeliveryAssignment } from "../models/DeliveryAssignment.js";
import { Settlement } from "../models/Settlement.js";
import { runInMemoryTransaction } from "../repositories/unitOfWork.js";
import { login, register } from "../controllers/authController.js";
import {
  getAdminAccounts,
  setAccountActive,
  setAccountApproval
} from "../controllers/adminController.js";
import { ensurePlatformAdmin } from "../security/platformAdmin.js";
import { createOrder, updateOrderStatus } from "../controllers/orderController.js";
import { acceptDelivery, updateRiderAvailability } from "../controllers/deliveryController.js";
import { addMenuItem, getMenuByRestaurant } from "../controllers/menuController.js";
import {
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant
} from "../controllers/restaurantController.js";
import { processPayment } from "../controllers/paymentController.js";
import { stepSimulation } from "../controllers/trackingController.js";
import {
  getSettlementOverview,
  processSettlement
} from "../controllers/settlementController.js";
import { recordCartTransaction } from "../controllers/cartController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { findOrderById, updateOrderById } from "../repositories/orderRepository.js";
import { listAvailableRiders } from "../repositories/userRepository.js";
import {
  featureTransactionIdFields,
  featureTransactionModels,
  createFeatureTransaction
} from "../models/FeatureTransaction.js";
import { verifyToken, generateToken } from "../middleware/authMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { sanitizeRequest } from "../middleware/sanitizeInput.js";
import { transactionalAction } from "../middleware/transactionalAction.js";
import { securityHeaders } from "../middleware/securityHeaders.js";
import { hashPassword, verifyPassword } from "../security/passwords.js";
import { removeSensitiveTimelineEntries } from "../security/orderTimeline.js";
import restaurantRoutes from "../routes/restaurantRoutes.js";
import menusRoutes from "../routes/menusRoutes.js";
import cartRoutes from "../routes/cartRoutes.js";
import orderRoutes from "../routes/orderRoutes.js";

const response = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  setHeader(name, value) {
    this.headers[name] = value;
  }
});

const customer = () => db.users.find((user) => user.role === "customer");
const restaurantOwner = () => db.users.find((user) => user.role === "restaurant");
const orderPayload = (overrides = {}) => ({
  restaurantId: db.restaurants[0]._id,
  items: [{ menuItemId: db.menuItems[0]._id, quantity: 1, price: 0 }],
  deliveryAddress: {
    street: "1 Test Street",
    city: "New Delhi",
    lat: 28.6,
    lng: 77.2
  },
  paymentMethod: "UPI",
  ...overrides
});

beforeEach(() => seedDatabase());

test("a new customer can register and then sign in with their own credentials", async () => {
  const credentials = {
    name: "New FDS Customer",
    email: "new.customer@example.com",
    password: "secure-password-123",
    role: "customer",
    phone: ""
  };
  const registrationRes = response();
  await register({ body: credentials }, registrationRes);

  assert.equal(registrationRes.statusCode, 201);
  assert.equal(registrationRes.body.data.user.email, credentials.email);
  assert.equal("password" in registrationRes.body.data.user, false);
  assert.ok(registrationRes.body.data.token);
  const storedUser = db.users.find((user) => user.email === credentials.email);
  assert.match(storedUser.password, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword(credentials.password, storedUser.password), true);
  assert.equal(await verifyPassword("incorrect-password", storedUser.password), false);

  const loginRes = response();
  await login({ body: { email: credentials.email, password: credentials.password } }, loginRes);
  assert.equal(loginRes.statusCode, 200);
  assert.equal(loginRes.body.data.user._id, registrationRes.body.data.user._id);
  assert.ok(loginRes.body.data.token);

  const duplicateRes = response();
  await register({ body: credentials }, duplicateRes);
  assert.equal(duplicateRes.statusCode, 409);
});

test("restaurant registration does not invent payout banking details", async () => {
  const res = response();
  await register({
    body: {
      name: "New Restaurant Owner",
      email: "new.restaurant@example.com",
      password: "secure-password-123",
      role: "restaurant",
      phone: "+1 555 010 2041",
      restaurantName: "New Restaurant",
      restaurantStreet: "1 Test Street",
      restaurantCity: "Test City"
    }
  }, res);

  const restaurant = db.restaurants.find((item) => item.ownerId === res.body.data.user._id);
  assert.ok(restaurant);
  assert.equal(restaurant.bankDetails, undefined);
  assert.equal(restaurant.isApproved, false);
  assert.equal(restaurant.isOpen, false);
  assert.equal(res.body.data.user.isApproved, false);
});

test("restaurant and rider access remains pending until administrator approval", async () => {
  const admin = db.users.find((user) => user.role === "admin");
  const restaurantRegistration = response();
  await register({
    body: {
      name: "Pending Restaurant Owner",
      email: "pending.restaurant@example.com",
      password: "secure-password-123",
      phone: "+1 555 010 2042",
      role: "restaurant",
      restaurantName: "Pending Restaurant",
      restaurantStreet: "2 Test Street",
      restaurantCity: "Test City"
    }
  }, restaurantRegistration);

  const owner = db.users.find((user) => user._id === restaurantRegistration.body.data.user._id);
  const restaurant = db.restaurants.find((item) => item.ownerId === owner._id);
  const blockedResponse = response();
  let restaurantAccessGranted = false;
  requireRole("restaurant")({ user: owner }, blockedResponse, () => {
    restaurantAccessGranted = true;
  });
  assert.equal(restaurantAccessGranted, false);
  assert.equal(blockedResponse.statusCode, 403);
  const publicRestaurants = response();
  getAllRestaurants({ query: {} }, publicRestaurants);
  assert.equal(publicRestaurants.body.data.some((item) => item._id === restaurant._id), false);
  const pendingRestaurantDetails = response();
  getRestaurantById({ params: { id: restaurant._id } }, pendingRestaurantDetails);
  assert.equal(pendingRestaurantDetails.statusCode, 404);
  const pendingRestaurantMenu = response();
  getMenuByRestaurant({ params: { restaurantId: restaurant._id } }, pendingRestaurantMenu);
  assert.equal(pendingRestaurantMenu.statusCode, 404);
  const pendingRestaurantOrder = response();
  await createOrder({
    body: {
      restaurantId: restaurant._id,
      items: [{ menuItemId: db.menuItems[0]._id, quantity: 1 }]
    },
    user: customer()
  }, pendingRestaurantOrder);
  assert.equal(pendingRestaurantOrder.statusCode, 404);

  const accountList = response();
  getAdminAccounts({}, accountList);
  const listedOwner = accountList.body.data.find((account) => account._id === owner._id);
  assert.equal(listedOwner.isApproved, false);
  assert.equal("password" in listedOwner, false);

  const restaurantApproval = response();
  await setAccountApproval({
    params: { id: owner._id },
    body: { isApproved: true },
    user: admin
  }, restaurantApproval);
  assert.equal(restaurantApproval.statusCode, 200);
  assert.equal(restaurantApproval.body.data.isApproved, true);
  assert.equal(db.restaurants.find((item) => item._id === restaurant._id).isApproved, true);

  const approvedOwner = db.users.find((user) => user._id === owner._id);
  restaurantAccessGranted = false;
  requireRole("restaurant")({ user: approvedOwner }, response(), () => {
    restaurantAccessGranted = true;
  });
  assert.equal(restaurantAccessGranted, true);

  const restaurantRevocation = response();
  await setAccountApproval({
    params: { id: owner._id },
    body: { isApproved: false },
    user: admin
  }, restaurantRevocation);
  assert.equal(restaurantRevocation.statusCode, 200);
  assert.equal(restaurantRevocation.body.data.isApproved, false);
  assert.equal(db.restaurants.find((item) => item._id === restaurant._id).isOpen, false);

  const riderRegistration = response();
  await register({
    body: {
      name: "Pending Rider",
      email: "pending.rider@example.com",
      password: "secure-password-123",
      phone: "+1 555 010 2043",
      role: "rider",
      vehicleType: "Bicycle",
      vehicleNumber: "RIDER-2043"
    }
  }, riderRegistration);
  const rider = db.users.find((user) => user._id === riderRegistration.body.data.user._id);
  rider.isAvailable = true;
  assert.equal(listAvailableRiders().some((entry) => entry._id === rider._id), false);
  const pendingRiderAccess = response();
  let riderAccessGranted = false;
  requireRole("rider")({ user: rider }, pendingRiderAccess, () => {
    riderAccessGranted = true;
  });
  assert.equal(riderAccessGranted, false);
  assert.equal(pendingRiderAccess.statusCode, 403);

  const riderApproval = response();
  await setAccountApproval({
    params: { id: rider._id },
    body: { isApproved: true },
    user: admin
  }, riderApproval);
  assert.equal(riderApproval.statusCode, 200);
  assert.equal(listAvailableRiders().some((entry) => entry._id === rider._id), true);
  riderAccessGranted = false;
  const approvedRider = db.users.find((user) => user._id === rider._id);
  requireRole("rider")({ user: approvedRider }, response(), () => {
    riderAccessGranted = true;
  });
  assert.equal(riderAccessGranted, true);

  const invalidApproval = response();
  await setAccountApproval({
    params: { id: customer()._id },
    body: { isApproved: true },
    user: admin
  }, invalidApproval);
  assert.equal(invalidApproval.statusCode, 400);
});

test("disabled accounts cannot sign in or use existing bearer tokens", async () => {
  const account = customer();
  const admin = db.users.find((user) => user.role === "admin");
  const token = generateToken(account);
  const disableResponse = response();
  await setAccountActive({
    params: { id: account._id },
    body: { isActive: false },
    user: admin
  }, disableResponse);
  assert.equal(disableResponse.statusCode, 200);
  assert.equal(disableResponse.body.data.isActive, false);

  const loginResponse = response();
  await login({ body: { email: account.email, password: "password123" } }, loginResponse);
  assert.equal(loginResponse.statusCode, 403);

  const protectedResponse = response();
  let continued = false;
  await protect({
    headers: { authorization: `Bearer ${token}` }
  }, protectedResponse, () => {
    continued = true;
  });
  assert.equal(continued, false);
  assert.equal(protectedResponse.statusCode, 403);

  const enableResponse = response();
  await setAccountActive({
    params: { id: account._id },
    body: { isActive: true },
    user: admin
  }, enableResponse);
  assert.equal(enableResponse.body.data.isActive, true);

  const disabledAdmin = response();
  await setAccountActive({
    params: { id: admin._id },
    body: { isActive: false },
    user: admin
  }, disabledAdmin);
  assert.equal(disabledAdmin.statusCode, 400);
});

test("legacy PBKDF2 passwords are upgraded to bcrypt after successful login", async () => {
  const user = customer();
  const salt = Buffer.from("0123456789abcdef");
  const derivedKey = pbkdf2Sync("legacy-password", salt, 600000, 32, "sha256");
  user.password = `pbkdf2-sha256$600000$${salt.toString("hex")}$${derivedKey.toString("hex")}`;

  const res = response();
  await login({ body: { email: user.email, password: "legacy-password" } }, res);

  assert.equal(res.statusCode, 200);
  const upgradedUser = db.users.find((entry) => entry._id === user._id);
  assert.match(upgradedUser.password, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword("legacy-password", upgradedUser.password), true);
});

test("bcrypt passwords are not accepted after the 72-byte input limit", async () => {
  const password = "x".repeat(72);
  const hash = await hashPassword(password);

  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword(`${password}x`, hash), false);
});

test("test fixture passwords are stored as unique bcrypt hashes", async () => {
  const demoUsers = db.users.filter((user) => user.isDemo);
  const hashes = demoUsers.map((user) => user.password);

  assert.equal(hashes.length, 4);
  assert.ok(hashes.every((hash) => /^\$2[aby]\$12\$/.test(hash)));
  assert.equal(new Set(hashes).size, hashes.length);
  assert.equal(await verifyPassword("password123", hashes[0]), true);
});

test("legacy demo accounts and activity are removed while the public catalog remains", async () => {
  const demoUserIds = new Set(db.users.filter((user) => user.isDemo).map((user) => String(user._id)));
  assert.ok(demoUserIds.size > 0);
  db.settlements.push({
    ...db.settlements[0],
    _id: "legacy-demo-settlement-with-generated-id"
  });
  db.settlementTransactions.push({
    _id: "legacy-demo-settlement-audit",
    status: "SETTLED",
    details: {
      values: { entityId: db.restaurants[0]._id },
      actor: { id: String(db.users.find((user) => user.role === "admin")._id) }
    }
  });

  await migrateLegacyDemoData();

  assert.equal(db.users.some((user) => user.isDemo), false);
  assert.equal(
    db.orders.some((order) => demoUserIds.has(String(order.customerId)) || demoUserIds.has(String(order.riderId))),
    false
  );
  assert.equal(db.deliveries.some((delivery) => demoUserIds.has(String(delivery.riderId))), false);
  assert.equal(db.restaurants.some((restaurant) => demoUserIds.has(String(restaurant.ownerId))), false);
  assert.equal(db.restaurants.length, 6);
  assert.equal(db.menuItems.length, 15);
  assert.equal(db.restaurants.every((restaurant) => restaurant.ownerId == null), true);
  assert.equal(db.coupons.length, 0);
  assert.equal(db.orders.length, 0);
  assert.equal(db.deliveries.length, 0);
  assert.equal(db.settlements.length, 0);
  assert.equal(db.settlementTransactions.length, 0);
});

test("a delivery rider can register, sign in, and start offline", async () => {
  const credentials = {
    name: "New Delivery Rider",
    email: "new.rider@example.com",
    password: "secure-password-123",
    phone: "+1 555 010 2040",
    role: "rider",
    vehicleType: "Bicycle",
    vehicleNumber: "RIDER-2040",
    vehicleModel: "City bike"
  };
  const registrationRes = response();
  await register({ body: credentials }, registrationRes);

  assert.equal(registrationRes.statusCode, 201);
  assert.equal(registrationRes.body.data.user.role, "rider");
  assert.equal(registrationRes.body.data.user.isAvailable, false);
  assert.equal(registrationRes.body.data.user.vehicleDetails.number, credentials.vehicleNumber);
  assert.equal("password" in registrationRes.body.data.user, false);

  const loginRes = response();
  await login({ body: { email: credentials.email, password: credentials.password } }, loginRes);
  assert.equal(loginRes.statusCode, 200);
  assert.equal(loginRes.body.data.user._id, registrationRes.body.data.user._id);
});

test("administrator registration is private and the configured bootstrap creates only one administrator", async () => {
  const publicRegistration = response();
  await register({
    body: {
      name: "Unapproved Admin",
      email: "unapproved.admin@example.com",
      password: "secure-password-123",
      role: "admin"
    }
  }, publicRegistration);
  assert.equal(publicRegistration.statusCode, 400);

  db.users = db.users.filter((user) => !user.isDemo);
  const previousEnvironment = {
    email: process.env.PLATFORM_ADMIN_EMAIL,
    password: process.env.PLATFORM_ADMIN_PASSWORD,
    name: process.env.PLATFORM_ADMIN_NAME,
    nodeEnv: process.env.NODE_ENV
  };

  try {
    delete process.env.PLATFORM_ADMIN_EMAIL;
    delete process.env.PLATFORM_ADMIN_PASSWORD;
    delete process.env.PLATFORM_ADMIN_NAME;
    process.env.NODE_ENV = "development";
    assert.equal(await ensurePlatformAdmin(), null);

    process.env.NODE_ENV = "production";
    await assert.rejects(ensurePlatformAdmin(), /PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are required/);

    process.env.NODE_ENV = "development";
    process.env.PLATFORM_ADMIN_EMAIL = "platform.admin@example.com";
    process.env.PLATFORM_ADMIN_PASSWORD = "bootstrap-secret-123";
    delete process.env.PLATFORM_ADMIN_NAME;

    const administrator = await ensurePlatformAdmin();
    const secondBootstrap = await ensurePlatformAdmin();
    assert.equal(administrator._id, secondBootstrap._id);
    assert.equal(db.users.filter((user) => user.role === "admin").length, 1);
    assert.equal(await verifyPassword("bootstrap-secret-123", administrator.password), true);

    const loginRes = response();
    await login({ body: { email: administrator.email, password: "bootstrap-secret-123" } }, loginRes);
    assert.equal(loginRes.statusCode, 200);
    assert.equal(loginRes.body.data.user.role, "admin");
  } finally {
    if (previousEnvironment.email === undefined) delete process.env.PLATFORM_ADMIN_EMAIL;
    else process.env.PLATFORM_ADMIN_EMAIL = previousEnvironment.email;
    if (previousEnvironment.password === undefined) delete process.env.PLATFORM_ADMIN_PASSWORD;
    else process.env.PLATFORM_ADMIN_PASSWORD = previousEnvironment.password;
    if (previousEnvironment.name === undefined) delete process.env.PLATFORM_ADMIN_NAME;
    else process.env.PLATFORM_ADMIN_NAME = previousEnvironment.name;
    if (previousEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment.nodeEnv;
  }
});

test("public restaurant responses omit owner identifiers and bank details", () => {
  const listResponse = response();
  getAllRestaurants({ query: {} }, listResponse);
  assert.ok(listResponse.body.data.length > 0);
  assert.equal("bankDetails" in listResponse.body.data[0], false);
  assert.equal("ownerId" in listResponse.body.data[0], false);

  const detailResponse = response();
  getRestaurantById({ params: { id: db.restaurants[0]._id } }, detailResponse);
  assert.equal("bankDetails" in detailResponse.body.data, false);
  assert.equal("ownerId" in detailResponse.body.data, false);
});

test("restaurant search also matches dish names", () => {
  const menuItem = db.menuItems[0];
  const res = response();
  getAllRestaurants({ query: { search: menuItem.name } }, res);

  assert.ok(res.body.data.some((restaurant) => restaurant._id === menuItem.restaurantId));
});

test("settlement overview exposes only masked payout account details", () => {
  const res = response();
  getSettlementOverview({}, res);

  const restaurant = res.body.data.restaurants.find((item) => item.restaurantId === db.restaurants[0]._id);
  assert.equal("accountNumber" in restaurant.bankDetails, false);
  assert.equal(
    restaurant.bankDetails.accountLast4,
    String(db.restaurants[0].bankDetails.accountNumber).slice(-4)
  );
  assert.equal(JSON.stringify(res.body).includes(db.restaurants[0].bankDetails.accountNumber), false);
});

test("GPS simulation is unavailable in production, including for admins", async () => {
  const order = db.orders[0];
  order.status = "OUT_FOR_DELIVERY";
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const res = response();
    await stepSimulation({
      params: { orderId: order._id },
      user: db.users.find((user) => user.role === "admin")
    }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, "GPS simulation is unavailable in production");
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("legacy malformed timeline entries containing user credentials are removed", () => {
  const timeline = removeSensitiveTimelineEntries([
    { status: "PLACED", actorRole: "customer" },
    { _id: "user-id", password: "sensitive-hash", role: "customer" },
    { status: "UPDATED", password: "sensitive-hash" },
    null
  ]);

  assert.deepEqual(timeline, [{ status: "PLACED", actorRole: "customer" }]);
});

test("transactional module actions validate envelopes and execute their real operations", async () => {
  const runAction = async (moduleName, req, handler) => {
    const res = response();
    let handlerPromise;
    transactionalAction(moduleName)(req, res, () => {
      handlerPromise = handler(req, res);
    });
    await handlerPromise;
    return res;
  };

  const owner = restaurantOwner();
  const restaurantRes = await runAction("Restaurants", {
    body: {
      action: "execute",
      projectId: "food-delivery",
      data: { restaurantId: owner.restaurantId, name: "Transactional Restaurant Name" }
    },
    params: {},
    user: owner
  }, updateRestaurant);
  assert.equal(restaurantRes.statusCode, 200);
  assert.equal(restaurantRes.body.message, "Restaurants updated successfully in Food Delivery & Restaurant Management");
  assert.equal(db.restaurants.find((entry) => entry._id === owner.restaurantId).name, "Transactional Restaurant Name");

  const menuRes = await runAction("Menus", {
    body: {
      action: "execute",
      projectId: "food-delivery",
      data: {
        restaurantId: owner.restaurantId,
        name: "Transactional Test Dish",
        category: "Main Course",
        price: 250
      }
    },
    user: owner
  }, addMenuItem);
  assert.equal(menuRes.statusCode, 200);
  assert.equal(menuRes.body.message, "Menus updated successfully in Food Delivery & Restaurant Management");
  assert.ok(db.menuItems.some((item) => item.name === "Transactional Test Dish"));

  const cartUser = customer();
  const cartRes = await runAction("Cart", {
    body: {
      action: "execute",
      projectId: "food-delivery",
      data: {
        restaurantId: db.restaurants[0]._id,
        items: [{ menuItemId: db.menuItems[0]._id, quantity: 1 }]
      }
    },
    user: cartUser
  }, recordCartTransaction);
  assert.equal(cartRes.statusCode, 200);
  assert.equal(cartRes.body.message, "Cart updated successfully in Food Delivery & Restaurant Management");

  const orderRes = await runAction("Orders", {
    body: {
      action: "execute",
      projectId: "food-delivery",
      data: orderPayload()
    },
    user: cartUser,
    app: { get: () => null }
  }, createOrder);
  assert.equal(orderRes.statusCode, 200);
  assert.equal(orderRes.body.message, "Orders updated successfully in Food Delivery & Restaurant Management");
  assert.ok(orderRes.body.data._id);
});

test("transactional module actions reject malformed project envelopes", () => {
  const res = response();
  transactionalAction("Menus")({
    body: { action: "execute", projectId: "other-project", data: {} },
    user: restaurantOwner()
  }, res, () => assert.fail("invalid project should be rejected"));

  assert.equal(res.statusCode, 400);
  assert.equal(
    res.body.error,
    "Validation failed for Food Delivery & Restaurant Management Menus"
  );
});

test("order creation uses server menu prices instead of client-provided prices", async () => {
  const res = response();
  await createOrder({
    body: orderPayload(),
    user: customer(),
    app: { get: () => null }
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.items[0].price, db.menuItems[0].price);
  assert.equal(res.body.data.payment.status, "COMPLETED");
  assert.equal(res.body.data.pricing.deliveryFee, 45);
  assert.equal(
    res.body.data.pricing.total,
    Math.round((
      res.body.data.pricing.subtotal +
      res.body.data.pricing.tax +
      res.body.data.pricing.deliveryFee +
      res.body.data.pricing.packagingFee -
      res.body.data.pricing.discount
    ) * 100) / 100
  );
});

test("order creation rejects invalid quantities and unavailable menu items", async () => {
  const badQuantity = response();
  await createOrder({
    body: orderPayload({ items: [{ menuItemId: db.menuItems[0]._id, quantity: 0 }] }),
    user: customer(),
    app: { get: () => null }
  }, badQuantity);
  assert.equal(badQuantity.statusCode, 400);

  db.menuItems[0].isAvailable = false;
  const unavailable = response();
  await createOrder({
    body: orderPayload(),
    user: customer(),
    app: { get: () => null }
  }, unavailable);
  assert.equal(unavailable.statusCode, 400);
});

test("order endpoints reject missing and null payload fields with bad requests", async () => {
  const invalidBodies = [
    undefined,
    null,
    {},
    { restaurantId: db.restaurants[0]._id, items: null },
    orderPayload({ deliveryAddress: null })
  ];

  for (const body of invalidBodies) {
    const res = response();
    await createOrder({ body, user: customer(), app: { get: () => null } }, res);
    assert.equal(res.statusCode, 400);
  }

  const statusRes = response();
  await updateOrderStatus({
    params: { id: db.orders[0]._id },
    body: null,
    user: db.users.find((user) => user.role === "admin"),
    app: { get: () => null }
  }, statusRes);
  assert.equal(statusRes.statusCode, 400);
});

test("restaurant users cannot manage another restaurant's menu", () => {
  const res = response();
  addMenuItem({
    body: {
      restaurantId: db.restaurants[1]._id,
      name: "Unauthorized dish",
      category: "Main Course",
      price: 100,
      isVeg: true
    },
    user: restaurantOwner()
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(db.menuItems.some((item) => item.name === "Unauthorized dish"), false);
});

test("customers cannot change order lifecycle status", async () => {
  const order = db.orders[0];
  const res = response();
  await updateOrderStatus({
    params: { id: order._id },
    body: { status: "DELIVERED" },
    user: customer(),
    app: { get: () => null }
  }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(order.status, "OUT_FOR_DELIVERY");
});

test("order status updates and delivery acceptance add only timeline events", async () => {
  const admin = db.users.find((user) => user.role === "admin");
  const order = db.orders[0];
  const updateRes = response();
  await updateOrderStatus({
    params: { id: order._id },
    body: { status: "DELIVERED", note: "Completed successfully" },
    user: admin,
    app: { get: () => null }
  }, updateRes);

  assert.equal(updateRes.statusCode, 200);
  const updatedOrder = findOrderById(order._id);
  assert.equal(updatedOrder.timeline.at(-1).actorId, String(admin._id));
  assert.equal(updatedOrder.timeline.at(-1).actorRole, "admin");
  assert.ok(updatedOrder.timeline.every((entry) => typeof entry.status === "string"));
  assert.equal(updatedOrder.timeline.some((entry) => "password" in entry), false);
  assert.equal(db.orderTransactions.at(-1).details.actor.id, String(admin._id));

  const rider = db.users.find((user) => user.role === "rider");
  const availableOrder = db.orders[0];
  availableOrder.status = "READY_FOR_PICKUP";
  const acceptRes = response();
  await acceptDelivery({
    params: { orderId: availableOrder._id },
    user: rider,
    app: { get: () => null }
  }, acceptRes);

  assert.equal(acceptRes.statusCode, 200);
  const acceptedOrder = findOrderById(availableOrder._id);
  assert.equal(acceptedOrder.timeline.at(-1).actorId, String(rider._id));
  assert.equal(acceptedOrder.timeline.at(-1).actorRole, "rider");
  assert.ok(acceptedOrder.timeline.every((entry) => typeof entry.status === "string"));
  assert.equal(acceptedOrder.timeline.some((entry) => "password" in entry), false);
  assert.equal(db.orderTransactions.at(-1).details.actor.id, String(rider._id));
});

test("concurrent rider acceptance creates a single delivery transition", async () => {
  const rider = db.users.find((user) => user.role === "rider");
  const order = db.orders[0];
  order.status = "READY_FOR_PICKUP";
  order.riderId = rider._id;
  const initialTimelineLength = order.timeline.length;
  const firstResponse = response();
  const secondResponse = response();
  const request = {
    params: { orderId: order._id },
    user: rider,
    app: { get: () => null }
  };

  await Promise.all([
    acceptDelivery(request, firstResponse),
    acceptDelivery(request, secondResponse)
  ]);

  assert.deepEqual(
    [firstResponse.statusCode, secondResponse.statusCode].sort(),
    [200, 409]
  );
  assert.equal(findOrderById(order._id).timeline.length, initialTimelineLength + 1);
});

test("rider availability persists to dispatch and offline riders cannot accept trips", async () => {
  const rider = db.users.find((user) => user.role === "rider");
  const availabilityRes = response();
  await updateRiderAvailability({
    body: { isAvailable: false },
    user: rider
  }, availabilityRes);

  assert.equal(availabilityRes.statusCode, 200);
  assert.equal(db.users.find((user) => user._id === rider._id).isAvailable, false);
  assert.equal(db.deliveryTransactions.at(-1).status, "offline");
  assert.equal(db.deliveryTransactions.at(-1).details.actor.id, String(rider._id));

  const order = db.orders[0];
  order.status = "READY_FOR_PICKUP";
  order.riderId = rider._id;
  const initialTimelineLength = order.timeline.length;
  const acceptRes = response();
  await acceptDelivery({
    params: { orderId: order._id },
    user: rider,
    app: { get: () => null }
  }, acceptRes);

  assert.equal(acceptRes.statusCode, 409);
  assert.equal(findOrderById(order._id).timeline.length, initialTimelineLength);
});

test("concurrent order status requests cannot apply the same transition twice", async () => {
  const admin = db.users.find((user) => user.role === "admin");
  const order = db.orders[0];
  const initialTimelineLength = order.timeline.length;
  const request = {
    params: { id: order._id },
    body: { status: "DELIVERED" },
    user: admin,
    app: { get: () => null }
  };
  const firstResponse = response();
  const secondResponse = response();

  await Promise.all([
    updateOrderStatus(request, firstResponse),
    updateOrderStatus(request, secondResponse)
  ]);

  assert.deepEqual(
    [firstResponse.statusCode, secondResponse.statusCode].sort(),
    [200, 400]
  );
  assert.equal(findOrderById(order._id).timeline.length, initialTimelineLength + 1);
});

test("payment amount must match the server-calculated order total", async () => {
  const orderRes = response();
  await createOrder({
    body: orderPayload({ paymentMethod: "COD" }),
    user: customer(),
    app: { get: () => null }
  }, orderRes);
  const order = orderRes.body.data;

  const res = response();
  await processPayment({
    body: { orderId: order._id, amount: order.pricing.total + 1, method: "UPI" },
    user: customer()
  }, res);

  assert.equal(res.statusCode, 400);
  assert.equal(order.payment.status, "PENDING");
});

test("valid payment is attached to the matching order and cannot be replayed", async () => {
  const orderRes = response();
  await createOrder({
    body: orderPayload({ paymentMethod: "COD" }),
    user: customer(),
    app: { get: () => null }
  }, orderRes);
  const order = orderRes.body.data;
  const req = {
    body: { orderId: order._id, amount: order.pricing.total, method: "COD" },
    user: customer()
  };
  const paymentRes = response();
  await processPayment(req, paymentRes);
  assert.equal(paymentRes.statusCode, 200);
  const updatedOrder = findOrderById(order._id);
  assert.equal(updatedOrder.payment.status, "PENDING");
  assert.ok(updatedOrder.payment.transactionId);
  assert.equal(updatedOrder.timeline.at(-1).actorId, String(customer()._id));
  assert.equal(updatedOrder.timeline.at(-1).actorRole, "customer");
  assert.ok(updatedOrder.timeline.every((entry) => typeof entry.status === "string"));
  assert.equal(updatedOrder.timeline.some((entry) => "password" in entry), false);

  const replayRes = response();
  await processPayment(req, replayRes);
  assert.equal(replayRes.statusCode, 409);
});

test("concurrent payment attempts can only produce one payment result", async () => {
  const orderRes = response();
  await createOrder({
    body: orderPayload({ paymentMethod: "COD" }),
    user: customer(),
    app: { get: () => null }
  }, orderRes);
  const order = orderRes.body.data;
  const request = {
    body: { orderId: order._id, amount: order.pricing.total, method: "COD" },
    user: customer()
  };
  const firstResponse = response();
  const secondResponse = response();

  await Promise.all([
    processPayment(request, firstResponse),
    processPayment(request, secondResponse)
  ]);

  assert.deepEqual(
    [firstResponse.statusCode, secondResponse.statusCode].sort(),
    [200, 409]
  );
  assert.equal(findOrderById(order._id).timeline.length, order.timeline.length + 1);
});

test("transactions roll back related collections on exceptions", async () => {
  const initialOrderCount = db.orders.length;
  const initialDeliveryCount = db.deliveries.length;
  await assert.rejects(runInMemoryTransaction(["orders", "deliveries"], () => {
    db.orders.push({ _id: "partial-order" });
    db.deliveries.push({ _id: "partial-delivery" });
    throw new Error("simulated commit failure");
  }), /simulated commit failure/);

  assert.equal(db.orders.length, initialOrderCount);
  assert.equal(db.deliveries.length, initialDeliveryCount);
});

test("successful transactions are written to the local JSON snapshot", async () => {
  const orderId = db.orders[0]._id;
  await runInMemoryTransaction(["orders"], () => {
    db.orders[0].status = "PREPARING";
  });

  const snapshot = JSON.parse(await fs.readFile(getPersistenceStatus().backupPath, "utf8"));
  assert.equal(snapshot.orders.find((order) => order._id === orderId).status, "PREPARING");
});

test("Mongoose schemas preserve repository record fields", () => {
  const publicRestaurant = new Restaurant({ name: "Public Catalog Restaurant" });
  const ownerRestaurant = new Restaurant({
    name: "Pending Restaurant",
    ownerId: "65b000000000000000000002"
  });
  assert.equal(publicRestaurant.isApproved, true);
  assert.equal(ownerRestaurant.isApproved, false);

  const models = [
    new User(db.users[0]),
    new Restaurant(db.restaurants[0]),
    new MenuItem(db.menuItems[0]),
    new Order({ ...db.orders[0], splits: { platformCommission: 12 } }),
    new Coupon(db.coupons[0]),
    new DeliveryAssignment({
      ...db.deliveries[0],
      acceptedAt: new Date().toISOString()
    }),
    new Settlement({
      ...db.settlements[0],
      orderIds: [db.orders[0]._id],
      notes: "Processed",
      processedBy: db.users[3]._id
    })
  ];
  const documents = models.map((model) => model.toObject());

  assert.ok(models.every((model) => model.validateSync() === undefined));
  assert.equal(documents[0].isDemo, true);
  assert.equal(documents[3].status, db.orders[0].status);
  assert.deepEqual(documents[3].splits, { platformCommission: 12 });
  assert.ok(documents[5].acceptedAt instanceof Date);
  assert.deepEqual(documents[6].orderIds, [db.orders[0]._id]);
  assert.equal(documents[6].processedBy, db.users[3]._id);

  const invalidStatus = new Order({ ...db.orders[0], status: "UNKNOWN" });
  assert.equal(invalidStatus.validateSync().errors.status.kind, "enum");
  const missingCustomer = new Order({ ...db.orders[0], customerId: null });
  assert.equal(missingCustomer.validateSync().errors.customerId.kind, "required");
});

test("feature transaction schemas use UUID keys and indexed timestamps", () => {
  for (const [collectionName, Model] of Object.entries(featureTransactionModels)) {
    const transaction = createFeatureTransaction(collectionName, "active", { source: "test" });
    const document = new Model(transaction);

    assert.match(transaction[featureTransactionIdFields[collectionName]], /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(transaction._id, transaction[featureTransactionIdFields[collectionName]]);
    assert.equal(document.validateSync(), undefined);
    assert.equal(Model.schema.path(featureTransactionIdFields[collectionName]).options.unique, true);
    assert.equal(Model.schema.path("createdAt").options.index, true);
  }
});

test("restaurant changes create transaction and panel audit records", async () => {
  const owner = restaurantOwner();
  await runInMemoryTransaction(["restaurants"], () => {
    db.restaurants[0].isOpen = false;
  }, owner);

  assert.equal(db.restaurantTransactions.length, 1);
  assert.equal(db.restaurantTransactions[0].status, "inactive");
  assert.equal(db.restaurantTransactions[0].details.actor.id, owner._id);
  assert.equal(db.restaurantPanelTransactions.length, 1);
});

test("order payment and tracking changes create their own transaction records", async () => {
  const order = db.orders[0];
  await runInMemoryTransaction(["orders"], () => {
    order.payment.status = "FAILED";
    order.currentLocation = { lat: 28.62, lng: 77.21 };
  }, customer());

  assert.equal(db.orderTransactions.length, 1);
  assert.equal(db.paymentTransactions[0].status, "FAILED");
  assert.equal(db.paymentTransactions[0].details.orderId, order._id);
  assert.equal(db.trackingTransactions[0].details.currentLocation.lat, 28.62);
});

test("authenticated cart snapshots are validated and recorded without client prices", async () => {
  const res = response();
  await recordCartTransaction({
    user: customer(),
    body: {
      restaurantId: db.restaurants[0]._id,
      items: [{ menuItemId: db.menuItems[0]._id, quantity: 2, price: 0.01 }]
    }
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(db.cartTransactions[0].status, "active");
  assert.equal(db.cartTransactions[0].details.userId, customer()._id);
  assert.equal(db.cartTransactions[0].details.items[0].quantity, 2);
  assert.equal("price" in db.cartTransactions[0].details.items[0], false);
});

test("repository reads are isolated until an explicit update", () => {
  const storedOrder = db.orders[0];
  const order = findOrderById(storedOrder._id);
  order.status = "DELIVERED";
  assert.equal(storedOrder.status, "OUT_FOR_DELIVERY");

  updateOrderById(order._id, order);
  assert.equal(db.orders[0].status, "DELIVERED");
});

test("settlement amount must match actual outstanding orders and cannot be paid twice", async () => {
  const restaurant = db.restaurants[0];
  const order = db.orders[0];
  order.status = "DELIVERED";
  order.deliveredAt = new Date().toISOString();
  const expectedPayout = order.pricing.subtotal + order.pricing.tax -
    order.pricing.subtotal * (restaurant.commissionRate / 100);
  const req = {
    body: { entityType: "restaurant", entityId: restaurant._id, amount: expectedPayout },
    user: db.users.find((user) => user.role === "admin")
  };
  const firstRes = response();
  await processSettlement(req, firstRes);
  assert.equal(firstRes.statusCode, 201);

  const replayRes = response();
  await processSettlement(req, replayRes);
  assert.equal(replayRes.statusCode, 409);
});

test("concurrent settlement attempts cannot include the same orders twice", async () => {
  const initialSettlementCount = db.settlements.length;
  const restaurant = db.restaurants[0];
  const order = db.orders[0];
  order.status = "DELIVERED";
  order.deliveredAt = new Date().toISOString();
  const expectedPayout = order.pricing.subtotal + order.pricing.tax -
    order.pricing.subtotal * (restaurant.commissionRate / 100);
  const request = {
    body: { entityType: "restaurant", entityId: restaurant._id, amount: expectedPayout },
    user: db.users.find((user) => user.role === "admin")
  };
  const firstResponse = response();
  const secondResponse = response();

  await Promise.all([
    processSettlement(request, firstResponse),
    processSettlement(request, secondResponse)
  ]);

  assert.deepEqual(
    [firstResponse.statusCode, secondResponse.statusCode].sort(),
    [201, 409]
  );
  assert.equal(db.settlements.length, initialSettlementCount + 1);
});

test("demo headers without a bearer token do not authenticate a request", async () => {
  const res = response();
  let continued = false;
  await protect({
    headers: { "x-demo-role": "admin" }
  }, res, () => {
    continued = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(continued, false);
});

test("protected API routes reject requests without bearer authentication", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/restaurants", restaurantRoutes);
  app.use("/api/menus", menusRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  try {
    const { port } = server.address();
    const paths = ["/api/restaurants", "/api/menus", "/api/cart", "/api/orders"];
    for (const path of paths) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", connection: "close" },
        body: JSON.stringify({})
      });
      assert.equal(response.status, 401, `${path} should require authentication`);
      assert.equal((await response.json()).success, false);
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("authenticated requests refresh JWTs with a 24-hour expiry", async () => {
  const user = customer();
  const initialToken = generateToken(user);
  const res = response();
  let continued = false;
  await protect({
    headers: { authorization: `Bearer ${initialToken}` },
    ip: "127.0.0.1",
    method: "GET"
  }, res, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.match(res.headers.Authorization, /^Bearer /);
  const claims = verifyToken(res.headers.Authorization.slice("Bearer ".length));
  assert.equal(claims.exp - claims.iat, 24 * 60 * 60);
});

test("rate limiters reject requests after the configured client quota", () => {
  const limiter = createRateLimiter({
    windowMs: 60000,
    max: 1,
    message: "Too many requests"
  });
  let continued = 0;
  const firstResponse = response();
  limiter({ ip: "192.0.2.10", socket: {}, method: "POST" }, firstResponse, () => {
    continued += 1;
  });

  const blockedResponse = response();
  limiter({ ip: "192.0.2.10", socket: {}, method: "POST" }, blockedResponse, () => {
    continued += 1;
  });

  assert.equal(continued, 1);
  assert.equal(blockedResponse.statusCode, 429);
  assert.equal(blockedResponse.headers["Retry-After"], "60");
});

test("request sanitization rejects unsafe object keys without mutating valid values", () => {
  const validReq = {
    body: { name: "A & B", nested: [{ value: 1 }] },
    query: { search: "noodles" },
    ip: "192.0.2.11",
    method: "POST"
  };
  const validResponse = response();
  let continued = false;
  sanitizeRequest(validReq, validResponse, () => {
    continued = true;
  });
  assert.equal(continued, true);
  assert.equal(validReq.body.name, "A & B");

  const unsafeResponse = response();
  sanitizeRequest({
    body: JSON.parse('{"profile":{"$where":"malicious"}}'),
    query: {},
    ip: "192.0.2.12",
    method: "POST"
  }, unsafeResponse, () => {
    assert.fail("unsafe properties must be rejected");
  });
  assert.equal(unsafeResponse.statusCode, 400);
});

test("security headers apply CSP and only enable HSTS on secure production requests", () => {
  const secureResponse = response();
  let continued = false;
  securityHeaders({ production: true })({ secure: true }, secureResponse, () => {
    continued = true;
  });

  assert.equal(continued, true);
  assert.match(secureResponse.headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.equal(secureResponse.headers["X-Content-Type-Options"], "nosniff");
  assert.equal(secureResponse.headers["X-Frame-Options"], "DENY");
  assert.equal(
    secureResponse.headers["Strict-Transport-Security"],
    "max-age=31536000; includeSubDomains"
  );

  const localResponse = response();
  securityHeaders({ production: true })({ secure: false }, localResponse, () => {});
  assert.equal(localResponse.headers["Strict-Transport-Security"], undefined);
});

test("configured local snapshot keys encrypt snapshot contents at rest", async () => {
  const previousKey = process.env.DATA_ENCRYPTION_KEY;
  const snapshotPath = getPersistenceStatus().backupPath;
  let previousSnapshot;
  try {
    previousSnapshot = await fs.readFile(snapshotPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const key = Buffer.alloc(32, 7);
  process.env.DATA_ENCRYPTION_KEY = key.toString("base64");
  try {
    await runInMemoryTransaction(["orders"], () => {
      db.orders[0].status = "PREPARING";
    });
    const snapshot = await fs.readFile(getPersistenceStatus().backupPath, "utf8");
    const envelope = JSON.parse(snapshot);
    assert.equal(envelope.format, "fds-encrypted-v1");
    assert.equal(snapshot.includes(db.orders[0]._id), false);
    assert.equal(snapshot.includes("customer@fds.com"), false);

    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final()
    ]).toString("utf8");
    assert.equal(JSON.parse(plaintext).orders[0].status, "PREPARING");
  } finally {
    if (previousKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
    else process.env.DATA_ENCRYPTION_KEY = previousKey;
    if (previousSnapshot !== undefined) {
      await fs.writeFile(snapshotPath, previousSnapshot, "utf8");
    } else {
      try {
        await fs.unlink(snapshotPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
});

test("MongoDB outages queue writes in the local snapshot", async () => {
  const previousMongoUri = process.env.MONGODB_URI;
  const snapshotPath = getPersistenceStatus().backupPath;
  const previousDatabase = structuredClone(db);
  let previousSnapshot;
  try {
    previousSnapshot = await fs.readFile(snapshotPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  process.env.MONGODB_URI = "mongodb://127.0.0.1:1/fds-outage-test";
  try {
    await connectDB();
    assert.equal(getPersistenceStatus().mongoConnected, false);
    assert.equal(getPersistenceStatus().primary, "local-json");

    const restaurantId = db.restaurants[0]._id;
    const snapshots = { restaurants: structuredClone(db.restaurants) };
    db.restaurants[0].isOpen = !db.restaurants[0].isOpen;
    const updatedRestaurantStatus = db.restaurants[0].isOpen;
    await persistCollections(["restaurants"], snapshots);

    const stored = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
    let snapshot = stored;
    if (stored.format === "fds-encrypted-v1") {
      const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY, "base64");
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64"));
      decipher.setAuthTag(Buffer.from(stored.authTag, "base64"));
      snapshot = JSON.parse(Buffer.concat([
        decipher.update(Buffer.from(stored.ciphertext, "base64")),
        decipher.final()
      ]).toString("utf8"));
    }

    assert.ok(snapshot._pendingMongoChanges.some((change) =>
      change.collectionNames.includes("restaurants") &&
      change.after.restaurants.some((restaurant) =>
        restaurant._id === restaurantId && restaurant.isOpen === updatedRestaurantStatus
      )
    ));
  } finally {
    await closeDB();
    if (previousMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousMongoUri;
    Object.assign(db, previousDatabase);
    if (previousSnapshot !== undefined) {
      await fs.writeFile(snapshotPath, previousSnapshot, "utf8");
    } else {
      try {
        await fs.unlink(snapshotPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
});
