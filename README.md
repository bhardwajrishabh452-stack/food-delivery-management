# Food Delivery & Restaurant Management (FDS)

An enterprise-grade, end-to-end food delivery and restaurant management platform engineered on **React, Node.js, Express, MongoDB, and Leaflet Maps**.

The platform automates multi-vendor food ordering, dynamic geo-tracking, automated delivery rider dispatching, and vendor commission settlements.

---

## 🌟 Key Verified Outputs & Capabilities

| Capability | Module Description |
| :--- | :--- |
| 📍 **Geo-Tracking** | Interactive Leaflet/OpenStreetMap interface with real-time waypoint interpolation, simulated GPS rider movement, route polylines, and dynamic ETA estimation. |
| 🛵 **Order Dispatch** | Haversine distance-based proximity ranking that matches incoming orders to active online riders with real-time state handoffs. |
| 💰 **Commission Engine** | Calculates platform commission, order tax, and delivery partner payouts, then records simulated settlements. No bank transfer or external payment is initiated. |
| 🍳 **Kitchen Order Panel** | Real-time queue for restaurant cooks to accept orders, manage dish preparation states, and toggle stock availability switches. |
| 🛡️ **Role-Based Access** | Authenticated customer, restaurant, rider, and provisioned administrator accounts access only their authorized dashboards. |

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, Vite, Leaflet Maps, React-Leaflet, Lucide Icons, Modern Responsive CSS System
- **Backend**: Node.js 24, Express, Socket.IO, JWT Authentication, Crypto
- **Data Store**: MongoDB is primary when `MONGODB_URI` is configured, with an atomic local JSON snapshot for backup and offline startup; otherwise, the snapshot is the local source of truth
- **Maps & Geolocation**: Leaflet + OpenStreetMap (No API keys required, works seamlessly worldwide)

### Backend module boundaries

The backend follows `routes → controllers → domain repositories → persistence unit of work`. Controllers coordinate validations and business flow; repositories own collection lookup and writes for users, restaurants, menus, orders, delivery, coupons, and settlements. Dispatch and tracking services depend on repositories rather than reaching into the store. The cart remains a frontend context backed by local storage, with authenticated snapshots recorded in its transaction collection; payments remain part of an order with separate payment history. Mutations are serialized in-process, persisted as a unit, and rolled back in memory if persistence fails.

### Feature transaction collections

Feature history is stored separately from operational records so these audit schemas do not replace or disrupt the application's existing domain documents. The collections are `restaurant_transactions`, `menu_transactions`, `cart_transactions`, `order_transactions`, `restaurant_panel_transactions`, `delivery_transactions`, `tracking_transactions`, `coupon_transactions`, `payment_transactions`, and `settlement_transactions`. Each record has a UUID `_id` and matching module key (for example `restaurants_id`), a string `status`, JSON `details`, and indexed `createdAt` plus `updatedAt` timestamps. Operational updates write the relevant history record in the same unit of work; authenticated cart snapshots are recorded at `/api/cart/transactions`.

### Persistence configuration

- Set `MONGODB_URI` in the server environment to use MongoDB as the primary store. Use a MongoDB replica set deployment (including MongoDB Atlas) so multi-collection transactions are supported.
- Production MongoDB connections require TLS with certificate verification. Configure disk encryption/TDE through the MongoDB hosting provider; the application cannot enable a provider's storage encryption setting.
- On startup, the server hydrates from MongoDB. If MongoDB is unavailable, it loads `backend/data/fds.json`; a fresh installation starts without pre-created users or sample business data.
- Successful local/offline writes update the JSON snapshot and are queued for MongoDB synchronization when the connection returns. The snapshot is runtime data and is excluded from version control.
- Without `MONGODB_URI`, the app runs entirely with local JSON persistence. The local transaction queue is process-local, so run a single backend instance when operating in local-only/offline mode.
- On startup, legacy demo accounts and their sample orders, coupons, deliveries, settlements, and audit entries are removed while restaurant/menu listings and unrelated user-created records are retained. Before moving an existing plaintext local snapshot to production, start the updated app once with `DATA_ENCRYPTION_KEY` configured; it will encrypt the snapshot. Production intentionally refuses plaintext snapshots.

---

## 👥 Accounts & Authentication

The application does not create demo users or provide role-switching shortcuts. Customers, restaurant owners, and delivery riders register their own accounts and sign in to access the matching dashboard. Restaurant registration creates an owner-linked restaurant profile, and rider registration collects vehicle information. New restaurant and rider accounts remain pending until the platform administrator approves them; pending accounts cannot manage restaurants, go online, or receive delivery assignments. Public customers can browse only approved restaurants without signing in.

Platform administrator registration is never public. In development, the backend can run without an administrator, but the admin panel stays unavailable until one is provisioned. To enable it, copy `backend/.env.example` to `backend/.env` and set your own administrator email and password:

```text
PLATFORM_ADMIN_EMAIL=your-admin-email
PLATFORM_ADMIN_PASSWORD=your-own-unique-password-of-at-least-12-characters
PLATFORM_ADMIN_NAME=Platform Administrator
```

The password must be 12-72 UTF-8 bytes. The first startup creates the administrator if that email is not already registered. Keep the password secret; `backend/.env` is ignored by Git. Production requires these administrator variables and refuses startup if they are missing or conflict with an existing administrator account.

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+

### 2. Start the Full Application
In the project root folder (`c:\Users\risha\Desktop\FDS`), run:

```bash
# Start the full-stack server (serves both API and Frontend at http://localhost:5000)
node backend/server.js
```

Or run via npm:
```bash
npm start
```

Open your browser at:
👉 **[http://localhost:5000](http://localhost:5000)**

No users are seeded on startup. For local development, the backend starts without an administrator; configure the administrator credentials above if you need to use the admin panel. Production deployments must configure the administrator, a random `JWT_SECRET` of at least 32 bytes, `DATA_ENCRYPTION_KEY`, and HTTPS (direct TLS certificates or a specifically trusted TLS-terminating proxy).

### Create an account and sign in

Use **Create Account** to register as a customer, restaurant partner, or delivery rider. Registration signs the new account in and opens the corresponding dashboard. To return later, use **Sign In** with that account. The platform administrator signs in through the same secure form but is created only from the server-side environment configuration.

### Operational dashboards

- **Customer**: restaurant discovery and menu search, cart/coupon checkout, order history, and per-order tracking.
- **Restaurant partner**: incoming order queue, order-state actions, menu availability and inventory, and earnings summary.
- **Delivery rider**: online availability, nearby delivery requests, active route, and opt-in browser location sharing.
- **Platform admin**: order and payment monitoring, restaurant service status, restaurant menu management, coupons, and settlement records.

Dashboard routes require a signed-in account with the matching role, and the backend independently enforces permissions. Dashboard lists include responsive search/filter controls, status summaries, and visible loading/error/action feedback. The app keeps the existing customer, restaurant, rider, and admin roles; it does not define a separate operator role. Cart contents remain user-local rather than being exposed to administrators. Payment and settlement screens are prototype ledgers and do not connect to a real payment gateway or bank.

### 3. Optional: Running with Vite Dev Server (Hot Module Reload)
If you wish to edit frontend code with instant Vite HMR:
```bash
# Terminal 1 (Backend API & Sockets)
cd backend && node server.js

# Terminal 2 (Vite Frontend Dev Server)
cd frontend && npm run dev
```
Access the Vite dev server at **http://localhost:3000** (automatically proxies API requests to port 5000).

---

## 🔄 End-to-End Workflow Demonstration

To test the complete lifecycle:

1. **Step 1: Place an Order (Customer)**
   - Register a customer account and sign in.
   - Browse a restaurant and its menu, add items, then place an order.

2. **Step 2: Live Geo-Tracking (Real-time GPS)**
   - Open the order tracking view to follow fulfillment status and the delivery route.

3. **Step 3: Kitchen Fulfillment (Restaurant Partner)**
   - Register a restaurant partner account and add menu items.
   - Accept the new order and advance it through preparation.

4. **Step 4: Rider Delivery (Delivery Partner)**
   - Register a rider account, go online, and accept an available delivery.
   - Share location if desired and mark the order delivered.

5. **Step 5: Commission Settlement (Platform Admin)**
   - Provision the administrator using the backend environment variables and sign in.
   - Review order activity and record simulated settlements. This prototype does not initiate a bank transfer.

---

## 📡 REST API Endpoints Specification

### Authentication & Roles
- `POST /api/auth/register` - Register a customer, restaurant, or rider; administrator self-registration is rejected
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/me` - Current authenticated profile
- `GET /api/admin/accounts` - Administrator-only account list
- `PATCH /api/admin/accounts/:id/status` - Administrator-only customer/restaurant/rider enable or disable
- `PATCH /api/admin/accounts/:id/approval` - Administrator-only restaurant/rider approval or revocation

### Transactional module actions
The following authenticated endpoints accept the shared envelope `{ "action": "execute", "data": { ... }, "projectId": "food-delivery" }`. Invalid envelopes return `400` with a module-specific validation error. Valid actions run the same ownership checks, business validation, and persistence/audit transactions as the corresponding resource operations.

- `POST /api/restaurants` - Restaurant partner or admin; `data` contains the restaurant fields to update and, for admins, `restaurantId` (or `id`). Restaurant partners update their linked restaurant.
- `POST /api/menus` - Restaurant partner or admin; `data` contains the new menu item's `restaurantId`, `name`, `category`, and `price`, plus supported optional fields.
- `POST /api/cart` - Customer; `data` contains `restaurantId`, `items` (menu item IDs and quantities), and optional `couponCode`.
- `POST /api/orders` - Customer; `data` contains the standard order fields (`restaurantId`, `items`, `deliveryAddress`, and optional `couponCode`/`paymentMethod`). The existing direct order payload remains supported.

### Restaurants & Menus
- `GET /api/restaurants` - List restaurants with cuisine, veg, search, and sort filters
- `GET /api/restaurants/:id` - Restaurant details with categorized menu
- `PUT /api/restaurants/:id` - Update restaurant info
- `GET /api/restaurants/:id/orders` - Incoming kitchen orders queue
- `GET /api/restaurants/:id/earnings` - Vendor revenue and commission split
- `GET /api/menu/:restaurantId` - Menu dishes list
- `POST /api/menu` - Create new dish
- `PATCH /api/menu/:id/toggle-availability` - Stock switch (In Stock / Sold Out)
- `DELETE /api/menu/:id` - Remove dish

### Orders & Dispatch
- `POST /api/orders` - Place food order & auto-dispatch rider
- `GET /api/orders/my-orders` - Customer order history
- `GET /api/orders/all` - Admin global orders feed
- `GET /api/orders/:id` - Detailed order metadata and timeline
- `PATCH /api/orders/:id/status` - Transition status (`CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, `DELIVERED`)

### Live Geo-Tracking
- `GET /api/tracking/:orderId` - Live coordinates, waypoints, and ETA
- `POST /api/tracking/:orderId/simulate-step` - Advances driver GPS waypoint forward

### Rider Fleet
- `GET /api/delivery/available` - Orders available for delivery
- `GET /api/delivery/my-deliveries` - Rider active trips
- `PATCH /api/delivery/availability` - Persist a rider's online/offline dispatch availability
- `POST /api/delivery/:orderId/accept` - Rider accepts trip
- `POST /api/delivery/:orderId/location` - Push rider GPS coordinates
- `GET /api/delivery/earnings` - Daily and weekly driver earnings

The rider dashboard now persists availability instead of changing only local UI state. Riders can explicitly share their browser GPS location during an active delivery; location access is requested by the browser and can be stopped by the rider. GPS simulation controls are development-only.

### Settlements
- `GET /api/settlements/overview` - Admin-only commission, settlement ledger, and masked payout account overview
- `POST /api/settlements/process` - Admin-only creation of a settlement record for eligible restaurant or rider balances; this prototype does not initiate bank transfers

### Coupons & Payments
- `GET /api/coupons` - List active discount codes
- `POST /api/coupons/validate` - Validate promo code with basket subtotal
- `POST /api/coupons` - Create promo code (Admin)
- `POST /api/payments/process` - Gateway simulation (UPI, Card, NetBanking, COD)
- `POST /api/payments/verify` - Verify transaction authenticity

### Commission Engine & Settlements
- `GET /api/settlements/overview` - Platform GMV, commission cut, pending payouts
- `POST /api/settlements/process` - Record a simulated settlement for eligible balances; no bank transfer is initiated

---

## 🔒 Production Security & Architecture Standards
- Bearer-token JWT authentication for protected API actions, with role and resource-ownership checks
- New account passwords are hashed with bcrypt; existing PBKDF2-SHA256 hashes remain verifiable and are upgraded to bcrypt after a successful login when the password fits bcrypt's 72-byte limit. No demo passwords or default users are created.
- JWTs expire after 24 hours without an authenticated API request; protected requests issue a refreshed token in the `Authorization` response header
- Sign-in is limited to 10 attempts per 15 minutes per client IP, registration to 5 attempts per hour, and the API to 1,000 requests per 15 minutes; rate-limit blocks, invalid tokens, and failed sign-ins are logged without credentials or tokens
- Direct HTTPS uses TLS 1.3 or later and HSTS; production user requests arriving without HTTPS are rejected. `/api/health` is exempt for private load-balancer and container probes. A TLS-terminating proxy must enforce TLS 1.3 at its public edge. Only trust a proxy you operate, and configure its exact IP/CIDR or hop count using `TRUST_PROXY`
- Responses include a restrictive Content Security Policy, frame/content-type protections, a strict referrer policy, and a permissions policy; the CSP allows only the app's required OpenStreetMap tiles, Unsplash images, and font providers
- Local JSON snapshots use AES-256-GCM when `DATA_ENCRYPTION_KEY` is configured. Production requires encryption and refuses plaintext snapshots. To generate a key, run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and keep the result in your secret manager
- Copy `backend/.env.example` to `backend/.env` for local configuration. In production, set secrets through the deployment platform; never commit them. Certificate paths are relative to the backend directory
- Rate limiting uses an in-memory store; multi-instance deployments need a shared rate-limit store at the edge or a shared backend store
- Server-side validation of order quantities, menu availability, coupon terms, payment amounts, and order-state transitions
- Order timeline entries record status changes and the actor where available
- Socket.IO connections and room joins require authenticated, authorized participants and disconnect when their JWT expires
- Order history removes malformed legacy timeline entries so account credential fields cannot be exposed through order or tracking responses. Payment finalization, order transitions, delivery acceptance, and settlement eligibility are rechecked inside the serialized transaction to prevent duplicate concurrent actions
- Public restaurant listing/detail responses omit owner identifiers and payout bank details; payout information is available only through the protected administrator settlement view
- The cart's delivery-fee display matches the current server quote, and item quantities are capped at the backend's per-item limit
- Responsive layout adhering to modern mobile and desktop viewports

### Validation and test coverage

Run the backend validation tests with `npm --prefix backend test`. They cover server-priced orders, invalid order items, menu ownership, status authorization, payment amount matching, password hashing, JWT renewal, rate limits, unsafe request keys, snapshot encryption, and rejection of forged demo-role headers.

### Runtime data and capacity note

The backend currently hydrates its in-process repository cache from MongoDB or the local JSON snapshot and persists successful mutations through the transaction unit of work. The `/api/health` response reports the active persistence mode. The 500-session and sub-200ms targets have not been established by load testing and should not be treated as production guarantees.

### AWS deployment

The AWS deployment starter includes an ECS/Fargate API image and task definition, a GitHub Actions pipeline for ECR/ECS and S3/CloudFront, and CloudWatch alarm definitions. See the [AWS deployment guide](deploy/aws/README.md) for required AWS resources, OIDC configuration, secrets, and the current single-task scaling limitation. No AWS resources are provisioned until you configure an account and deployment variables.
