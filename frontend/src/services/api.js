const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const API_BASE = `${API_ORIGIN}/api`;

export const getAuthHeaders = () => {
  const token = localStorage.getItem("fds_token");

  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async (res) => {
  const authorization = res.headers.get("Authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    const refreshedToken = authorization.slice("Bearer ".length);
    localStorage.setItem("fds_token", refreshedToken);
    window.dispatchEvent(new CustomEvent("fds-auth-token-refreshed", { detail: refreshedToken }));
  }
  if (res.status === 401 && localStorage.getItem("fds_token")) {
    localStorage.removeItem("fds_token");
    window.dispatchEvent(new Event("fds-auth-session-expired"));
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

export const api = {
  // Auth
  auth: {
    login: (credentials) =>
      fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      }).then(handleResponse),

    register: (userData) =>
      fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      }).then(handleResponse),

    getMe: () =>
      fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders()
      }).then(handleResponse)
  },

  cart: {
    recordTransaction: (snapshot) =>
      fetch(`${API_BASE}/cart/transactions`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(snapshot)
      }).then(handleResponse)
  },

  // Restaurants
  restaurants: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/restaurants${query ? `?${query}` : ""}`).then(handleResponse);
    },

    getById: (id) =>
      fetch(`${API_BASE}/restaurants/${id}`).then(handleResponse),

    update: (id, updates) =>
      fetch(`${API_BASE}/restaurants/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      }).then(handleResponse),

    getOrders: (id) =>
      fetch(`${API_BASE}/restaurants/${id}/orders`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getEarnings: (id) =>
      fetch(`${API_BASE}/restaurants/${id}/earnings`, {
        headers: getAuthHeaders()
      }).then(handleResponse)
  },

  // Menu Items
  menu: {
    getByRestaurant: (restaurantId) =>
      fetch(`${API_BASE}/menu/${restaurantId}`).then(handleResponse),

    addItem: (itemData) =>
      fetch(`${API_BASE}/menu`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      }).then(handleResponse),

    updateItem: (id, updates) =>
      fetch(`${API_BASE}/menu/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      }).then(handleResponse),

    toggleAvailability: (id) =>
      fetch(`${API_BASE}/menu/${id}/toggle-availability`, {
        method: "PATCH",
        headers: getAuthHeaders()
      }).then(handleResponse),

    deleteItem: (id) =>
      fetch(`${API_BASE}/menu/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      }).then(handleResponse)
  },

  // Orders
  orders: {
    create: (orderPayload) =>
      fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(orderPayload)
      }).then(handleResponse),

    getMyOrders: () =>
      fetch(`${API_BASE}/orders/my-orders`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/orders/all${query ? `?${query}` : ""}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getById: (id) =>
      fetch(`${API_BASE}/orders/${id}`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    updateStatus: (id, status, note) =>
      fetch(`${API_BASE}/orders/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, note })
      }).then(handleResponse)
  },

  // Delivery
  delivery: {
    getAvailable: () =>
      fetch(`${API_BASE}/delivery/available`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getMyDeliveries: () =>
      fetch(`${API_BASE}/delivery/my-deliveries`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    updateAvailability: (isAvailable) =>
      fetch(`${API_BASE}/delivery/availability`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isAvailable })
      }).then(handleResponse),

    accept: (orderId) =>
      fetch(`${API_BASE}/delivery/${orderId}/accept`, {
        method: "POST",
        headers: getAuthHeaders()
      }).then(handleResponse),

    updateLocation: (orderId, coords) =>
      fetch(`${API_BASE}/delivery/${orderId}/location`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(coords)
      }).then(handleResponse),

    getEarnings: () =>
      fetch(`${API_BASE}/delivery/earnings`, {
        headers: getAuthHeaders()
      }).then(handleResponse)
  },

  // Tracking
  tracking: {
    get: (orderId) =>
      fetch(`${API_BASE}/tracking/${orderId}`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    simulateStep: (orderId) =>
      fetch(`${API_BASE}/tracking/${orderId}/simulate-step`, {
        method: "POST",
        headers: getAuthHeaders()
      }).then(handleResponse)
  },

  // Coupons
  coupons: {
    getActive: () =>
      fetch(`${API_BASE}/coupons`).then(handleResponse),

    validate: (code, subtotal) =>
      fetch(`${API_BASE}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal })
      }).then(handleResponse),

    create: (couponData) =>
      fetch(`${API_BASE}/coupons`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(couponData)
      }).then(handleResponse)
  },

  // Payments
  payments: {
    process: (paymentData) =>
      fetch(`${API_BASE}/payments/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData)
      }).then(handleResponse),

    verify: (transactionId) =>
      fetch(`${API_BASE}/payments/verify`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ transactionId })
      }).then(handleResponse)
  },

  // Settlements (Commission Engine)
  settlements: {
    getOverview: () =>
      fetch(`${API_BASE}/settlements/overview`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    process: (settlementData) =>
      fetch(`${API_BASE}/settlements/process`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(settlementData)
      }).then(handleResponse)
  },

  admin: {
    getAccounts: () =>
      fetch(`${API_BASE}/admin/accounts`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    setAccountActive: (id, isActive) =>
      fetch(`${API_BASE}/admin/accounts/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive })
      }).then(handleResponse),

    setAccountApproval: (id, isApproved) =>
      fetch(`${API_BASE}/admin/accounts/${id}/approval`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isApproved })
      }).then(handleResponse)
  }
};
