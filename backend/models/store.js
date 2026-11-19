import crypto from "crypto";
import { hashPasswordSync } from "../security/passwords.js";

// Unified memory store for instant zero-config operation and seamless Mongoose compatibility
export const db = {
  users: [],
  restaurants: [],
  menuItems: [],
  orders: [],
  coupons: [],
  deliveries: [],
  settlements: [],
  restaurantTransactions: [],
  menuTransactions: [],
  cartTransactions: [],
  orderTransactions: [],
  restaurantPanelTransactions: [],
  deliveryTransactions: [],
  trackingTransactions: [],
  couponTransactions: [],
  paymentTransactions: [],
  settlementTransactions: []
};

export const generateId = () => crypto.randomBytes(12).toString("hex");
let testPasswordHashes = null;

// Test fixtures; production starts with an empty store.
export const seedDatabase = () => {
  if (!testPasswordHashes) {
    testPasswordHashes = Array.from({ length: 4 }, () => hashPasswordSync("password123"));
  }
  // Clear existing
  db.users = [];
  db.restaurants = [];
  db.menuItems = [];
  db.orders = [];
  db.coupons = [];
  db.deliveries = [];
  db.settlements = [];
  db.restaurantTransactions = [];
  db.menuTransactions = [];
  db.cartTransactions = [];
  db.orderTransactions = [];
  db.restaurantPanelTransactions = [];
  db.deliveryTransactions = [];
  db.trackingTransactions = [];
  db.couponTransactions = [];
  db.paymentTransactions = [];
  db.settlementTransactions = [];

  // 1. Users
  const customerId = "65b000000000000000000001";
  const restaurantOwnerId = "65b000000000000000000002";
  const riderId = "65b000000000000000000003";
  const adminId = "65b000000000000000000004";

  db.users.push(
    {
      _id: customerId,
      name: "Alex Johnson",
      email: "customer@fds.com",
      password: testPasswordHashes[0],
      role: "customer",
      isDemo: true,
      phone: "+91 98765 43210",
      address: {
        street: "Flat 402, Lotus Towers, Sector 18",
        city: "New Delhi",
        lat: 28.6139,
        lng: 77.2090
      },
      createdAt: new Date().toISOString()
    },
    {
      _id: restaurantOwnerId,
      name: "Chef Priya Sharma",
      email: "owner@fds.com",
      password: testPasswordHashes[1],
      role: "restaurant",
      isDemo: true,
      phone: "+91 98111 22334",
      restaurantId: "65c000000000000000000001",
      createdAt: new Date().toISOString()
    },
    {
      _id: riderId,
      name: "David Miller",
      email: "rider@fds.com",
      password: testPasswordHashes[2],
      role: "rider",
      isDemo: true,
      phone: "+91 98999 88776",
      isAvailable: true,
      currentLocation: {
        lat: 28.6250,
        lng: 77.2150
      },
      vehicleDetails: {
        type: "Motorcycle",
        number: "DL 01 AB 1234",
        model: "Honda Activa 6G"
      },
      earnings: {
        today: 420,
        total: 12450,
        tripsCompleted: 18
      },
      createdAt: new Date().toISOString()
    },
    {
      _id: adminId,
      name: "Platform Administrator",
      email: "admin@fds.com",
      password: testPasswordHashes[3],
      role: "admin",
      isDemo: true,
      phone: "+91 99999 00000",
      createdAt: new Date().toISOString()
    }
  );
  for (const user of db.users) {
    if (user.role !== "admin") user.isApproved = true;
  }

  // 2. Restaurants
  const rest1Id = "65c000000000000000000001";
  const rest2Id = "65c000000000000000000002";
  const rest3Id = "65c000000000000000000003";
  const rest4Id = "65c000000000000000000004";
  const rest5Id = "65c000000000000000000005";
  const rest6Id = "65c000000000000000000006";

  db.restaurants.push(
    {
      _id: rest1Id,
      ownerId: restaurantOwnerId,
      name: "The Spice Route Kitchen",
      tagline: "Authentic North Indian Curries & Tandoor Grills",
      cuisine: ["North Indian", "Mughlai", "Biryani"],
      rating: 4.8,
      reviewCount: 342,
      deliveryTimeMinutes: 25,
      priceForTwo: 550,
      minOrderAmount: 150,
      commissionRate: 15,
      isOpen: true,
      featured: true,
      image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80",
      address: {
        street: "B-24, Inner Circle, Connaught Place",
        city: "New Delhi",
        lat: 28.6328,
        lng: 77.2197
      },
      bankDetails: {
        accountNumber: "918273645100",
        bankName: "HDFC Bank",
        ifsc: "HDFC0001234",
        upiId: "spiceroute@okhdfc"
      }
    },
    {
      _id: rest2Id,
      ownerId: generateId(),
      name: "Bella Napoli Woodfired Pizzeria",
      tagline: "Artisan Neapolitan Pizzas & Handcrafted Pasta",
      cuisine: ["Italian", "Pizza", "Pasta"],
      rating: 4.7,
      reviewCount: 289,
      deliveryTimeMinutes: 30,
      priceForTwo: 700,
      minOrderAmount: 200,
      commissionRate: 15,
      isOpen: true,
      featured: true,
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80",
      address: {
        street: "Shop 12, Khan Market",
        city: "New Delhi",
        lat: 28.6000,
        lng: 77.2270
      },
      bankDetails: {
        accountNumber: "882371923011",
        bankName: "ICICI Bank",
        ifsc: "ICIC0005678",
        upiId: "bellanapoli@icici"
      }
    },
    {
      _id: rest3Id,
      ownerId: generateId(),
      name: "Dragon Wok & Dim Sum Bar",
      tagline: "Sizzling Noodles, Momos & Pan-Asian Delicacies",
      cuisine: ["Chinese", "Asian", "Dim Sum"],
      rating: 4.6,
      reviewCount: 195,
      deliveryTimeMinutes: 20,
      priceForTwo: 450,
      minOrderAmount: 180,
      commissionRate: 15,
      isOpen: true,
      featured: false,
      image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80",
      address: {
        street: "44, Defense Colony Main Market",
        city: "New Delhi",
        lat: 28.5733,
        lng: 77.2343
      },
      bankDetails: {
        accountNumber: "772391029381",
        bankName: "Axis Bank",
        ifsc: "UTIB0009988",
        upiId: "dragonwok@axis"
      }
    },
    {
      _id: rest4Id,
      ownerId: generateId(),
      name: "Burger & Brews Artisan Grill",
      tagline: "Smash Burgers, Loaded Fries & Thick Shakes",
      cuisine: ["Burgers", "American", "Fast Food"],
      rating: 4.5,
      reviewCount: 412,
      deliveryTimeMinutes: 20,
      priceForTwo: 400,
      minOrderAmount: 120,
      commissionRate: 18,
      isOpen: true,
      featured: true,
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80",
      address: {
        street: "H-8, Hauz Khas Village",
        city: "New Delhi",
        lat: 28.5494,
        lng: 77.1994
      },
      bankDetails: {
        accountNumber: "661298471029",
        bankName: "State Bank of India",
        ifsc: "SBIN0004321",
        upiId: "burgerbrews@sbi"
      }
    },
    {
      _id: rest5Id,
      ownerId: generateId(),
      name: "Royal Hyderabadi Dum Biryani",
      tagline: "Slow-cooked Clay Pot Biryani with Mirchi ka Salan",
      cuisine: ["Biryani", "Hyderabadi", "Mughlai"],
      rating: 4.9,
      reviewCount: 820,
      deliveryTimeMinutes: 35,
      priceForTwo: 600,
      minOrderAmount: 250,
      commissionRate: 15,
      isOpen: true,
      featured: true,
      image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
      address: {
        street: "Gate 3, Jama Masjid Area",
        city: "New Delhi",
        lat: 28.6507,
        lng: 77.2334
      },
      bankDetails: {
        accountNumber: "551293847102",
        bankName: "Kotak Mahindra Bank",
        ifsc: "KKBK0001122",
        upiId: "royalbiryani@kotak"
      }
    },
    {
      _id: rest6Id,
      ownerId: generateId(),
      name: "Sweet Tooth Artisan Waffles & Bakes",
      tagline: "Decadent Cheesecakes, Brownies & Belgian Waffles",
      cuisine: ["Desserts", "Bakery", "Beverages"],
      rating: 4.8,
      reviewCount: 310,
      deliveryTimeMinutes: 15,
      priceForTwo: 350,
      minOrderAmount: 100,
      commissionRate: 12,
      isOpen: true,
      featured: false,
      image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80",
      address: {
        street: "Cyber Hub Ground Floor, DLF Phase 2",
        city: "Gurugram",
        lat: 28.4900,
        lng: 77.0900
      },
      bankDetails: {
        accountNumber: "441298374619",
        bankName: "HDFC Bank",
        ifsc: "HDFC0009876",
        upiId: "sweettooth@okhdfc"
      }
    }
  );
  for (const restaurant of db.restaurants) restaurant.isApproved = true;

  // 3. Menu Items
  db.menuItems.push(
    // The Spice Route Menu
    {
      _id: "65d000000000000000000001",
      restaurantId: rest1Id,
      name: "Paneer Butter Masala",
      category: "Main Course",
      description: "Cubes of fresh cottage cheese simmered in a rich tomato, butter, and cashew nut gravy.",
      price: 320,
      isVeg: true,
      isAvailable: true,
      rating: 4.9,
      badge: "Bestseller",
      image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000002",
      restaurantId: rest1Id,
      name: "Dal Makhani Grand Reserve",
      category: "Main Course",
      description: "Slow-cooked black lentils simmered overnight with cream, butter, and gentle ground spices.",
      price: 290,
      isVeg: true,
      isAvailable: true,
      rating: 4.8,
      badge: "Chef Special",
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000003",
      restaurantId: rest1Id,
      name: "Butter Garlic Naan",
      category: "Breads",
      description: "Tandoor baked leavened bread brushed generously with garlic butter and fresh coriander.",
      price: 75,
      isVeg: true,
      isAvailable: true,
      rating: 4.7,
      badge: "Popular",
      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000004",
      restaurantId: rest1Id,
      name: "Tandoori Chicken Tikka",
      category: "Starters",
      description: "Juicy chicken chunks marinated in mustard oil, hung curd, and kashmiri red chili.",
      price: 360,
      isVeg: false,
      isAvailable: true,
      rating: 4.8,
      badge: "Bestseller",
      image: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000005",
      restaurantId: rest1Id,
      name: "Murg Dum Biryani",
      category: "Biryani",
      description: "Fragrant basmati rice layered with succulent chicken, saffron, brown onions, and mint.",
      price: 390,
      isVeg: false,
      isAvailable: true,
      rating: 4.9,
      badge: "Bestseller",
      image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
    },

    // Bella Napoli Menu
    {
      _id: "65d000000000000000000006",
      restaurantId: rest2Id,
      name: "Margherita di Bufala",
      category: "Pizza",
      description: "San Marzano tomato base, fresh buffalo mozzarella, fragrant basil leaves, and extra virgin olive oil.",
      price: 420,
      isVeg: true,
      isAvailable: true,
      rating: 4.9,
      badge: "Classic",
      image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000007",
      restaurantId: rest2Id,
      name: "Pepperoni & Hot Honey Feast",
      category: "Pizza",
      description: "Spicy pork pepperoni crisped under mozzarella, drizzled with artisan chili-infused organic honey.",
      price: 520,
      isVeg: false,
      isAvailable: true,
      rating: 4.8,
      badge: "Bestseller",
      image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000008",
      restaurantId: rest2Id,
      name: "Truffle Mushroom Fettuccine",
      category: "Pasta",
      description: "Fresh egg pasta ribbons tossed in creamy porcini butter sauce with parmesan and white truffle oil.",
      price: 460,
      isVeg: true,
      isAvailable: true,
      rating: 4.7,
      badge: "Chef Special",
      image: "https://images.unsplash.com/photo-1621996346565-e3d5d62816ef?w=800&auto=format&fit=crop&q=80"
    },

    // Dragon Wok Menu
    {
      _id: "65d000000000000000000009",
      restaurantId: rest3Id,
      name: "Steamed Vegetable Crystal Momos",
      category: "Dim Sum",
      description: "Translucent dumplings stuffed with water chestnuts, bok choy, and shiitake mushrooms with chili dip.",
      price: 240,
      isVeg: true,
      isAvailable: true,
      rating: 4.7,
      badge: "Popular",
      image: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000010",
      restaurantId: rest3Id,
      name: "Chili Garlic Chicken Hakka Noodles",
      category: "Noodles",
      description: "Wok-tossed egg noodles with shredded chicken, crisp bell peppers, scallions, and spicy garlic paste.",
      price: 280,
      isVeg: false,
      isAvailable: true,
      rating: 4.6,
      badge: "Bestseller",
      image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80"
    },

    // Burger & Brews
    {
      _id: "65d000000000000000000011",
      restaurantId: rest4Id,
      name: "The Double Smash Royale Burger",
      category: "Burgers",
      description: "Two crispy-edged smashed beef patties, double melted cheddar, secret bacon jam, and brioche bun.",
      price: 340,
      isVeg: false,
      isAvailable: true,
      rating: 4.8,
      badge: "Bestseller",
      image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000012",
      restaurantId: rest4Id,
      name: "Crispy Peri-Peri Fries with Cheese Dip",
      category: "Sides",
      description: "Golden crinkle-cut potatoes dusted in tangy African bird eye chili blend, served with warm cheese.",
      price: 160,
      isVeg: true,
      isAvailable: true,
      rating: 4.5,
      badge: "Popular",
      image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&auto=format&fit=crop&q=80"
    },

    // Royal Hyderabadi Biryani
    {
      _id: "65d000000000000000000013",
      restaurantId: rest5Id,
      name: "Nizami Mutton Dum Biryani",
      category: "Biryani",
      description: "Tender goat meat cooked in royal spices, nestled between layers of saffron-scented basmati rice.",
      price: 480,
      isVeg: false,
      isAvailable: true,
      rating: 4.9,
      badge: "Chef Special",
      image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80"
    },

    // Sweet Tooth
    {
      _id: "65d000000000000000000014",
      restaurantId: rest6Id,
      name: "Nutella Belgian Liege Waffle",
      category: "Waffles",
      description: "Warm caramelized Belgian waffle loaded with Nutella drizzle, chocolate pearls, and vanilla bean gelato.",
      price: 260,
      isVeg: true,
      isAvailable: true,
      rating: 4.9,
      badge: "Bestseller",
      image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800&auto=format&fit=crop&q=80"
    },
    {
      _id: "65d000000000000000000015",
      restaurantId: rest6Id,
      name: "New York Baked Cheesecake Slice",
      category: "Desserts",
      description: "Silky smooth Philadelphia cream cheese on a buttery graham cracker crust with blueberry coulis.",
      price: 290,
      isVeg: true,
      isAvailable: true,
      rating: 4.8,
      badge: "Popular",
      image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80"
    }
  );

  // 4. Coupons
  db.coupons.push(
    {
      _id: "65e000000000000000000001",
      code: "FDSFIRST",
      description: "Flat 50% OFF up to ₹150 on your first food order",
      discountType: "percentage",
      discountValue: 50,
      minOrderAmount: 200,
      maxDiscountAmount: 150,
      isActive: true,
      validUntil: "2027-12-31"
    },
    {
      _id: "65e000000000000000000002",
      code: "TASTY30",
      description: "30% OFF up to ₹100 on orders above ₹250",
      discountType: "percentage",
      discountValue: 30,
      minOrderAmount: 250,
      maxDiscountAmount: 100,
      isActive: true,
      validUntil: "2027-12-31"
    },
    {
      _id: "65e000000000000000000003",
      code: "FLAT50",
      description: "Instant ₹50 savings on any meal above ₹300",
      discountType: "flat",
      discountValue: 50,
      minOrderAmount: 300,
      maxDiscountAmount: 50,
      isActive: true,
      validUntil: "2027-12-31"
    }
  );

  // 5. Initial Sample Order for Live Tracking and Demonstration
  const order1Id = "65f000000000000000000001";
  const rest1 = db.restaurants[0];

  db.orders.push({
    _id: order1Id,
    orderNumber: "FDS-90812",
    customerId: customerId,
    customerName: "Alex Johnson",
    customerPhone: "+91 98765 43210",
    restaurantId: rest1Id,
    restaurantName: rest1.name,
    restaurantAddress: rest1.address,
    riderId: riderId,
    riderName: "David Miller",
    riderPhone: "+91 98999 88776",
    items: [
      {
        menuItemId: "65d000000000000000000001",
        name: "Paneer Butter Masala",
        price: 320,
        quantity: 1,
        isVeg: true
      },
      {
        menuItemId: "65d000000000000000000003",
        name: "Butter Garlic Naan",
        price: 75,
        quantity: 2,
        isVeg: true
      }
    ],
    pricing: {
      subtotal: 470,
      tax: 23.5,
      deliveryFee: 40,
      packagingFee: 20,
      discount: 100,
      total: 453.5
    },
    couponCode: "FDSFIRST",
    payment: {
      method: "UPI",
      status: "COMPLETED",
      transactionId: "TXN_UPI_982371283"
    },
    deliveryAddress: {
      street: "Flat 402, Lotus Towers, Sector 18",
      city: "New Delhi",
      lat: 28.6139,
      lng: 77.2090,
      contactPhone: "+91 98765 43210"
    },
    // Placed in active OUT_FOR_DELIVERY status with current location for live map testing!
    status: "OUT_FOR_DELIVERY",
    currentLocation: {
      lat: 28.6233,
      lng: 28.6233 ? 77.2143 : 77.2143
    },
    estimatedDeliveryMinutes: 12,
    timeline: [
      { status: "PLACED", timestamp: new Date(Date.now() - 25 * 60000).toISOString(), note: "Order placed by customer" },
      { status: "CONFIRMED", timestamp: new Date(Date.now() - 22 * 60000).toISOString(), note: "Accepted by The Spice Route Kitchen" },
      { status: "PREPARING", timestamp: new Date(Date.now() - 18 * 60000).toISOString(), note: "Kitchen is preparing the dishes" },
      { status: "READY_FOR_PICKUP", timestamp: new Date(Date.now() - 8 * 60000).toISOString(), note: "Food packaged and handed to rider" },
      { status: "OUT_FOR_DELIVERY", timestamp: new Date(Date.now() - 5 * 60000).toISOString(), note: "Rider David Miller is on the way" }
    ],
    createdAt: new Date(Date.now() - 25 * 60000).toISOString()
  });

  // 6. Deliveries
  db.deliveries.push({
    _id: "65a000000000000000000001",
    orderId: order1Id,
    riderId: riderId,
    riderName: "David Miller",
    status: "IN_TRANSIT",
    pickupLocation: rest1.address,
    dropLocation: {
      street: "Flat 402, Lotus Towers, Sector 18",
      lat: 28.6139,
      lng: 77.2090
    },
    assignedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    deliveryFeeEarning: 40
  });

  // 7. Settlements
  db.settlements.push({
    _id: "658000000000000000000001",
    periodStart: "2026-11-01",
    periodEnd: "2026-11-15",
    entityType: "restaurant",
    entityId: rest1Id,
    entityName: "The Spice Route Kitchen",
    totalOrders: 48,
    grossAmount: 32400,
    commissionAmount: 4860,
    taxAmount: 1620,
    payoutAmount: 29160,
    status: "SETTLED",
    payoutReference: "NEFT_98127391283",
    settledAt: "2026-11-16T10:30:00.000Z"
  });

  console.log(`[Store] Seed database initialized with ${db.restaurants.length} restaurants, ${db.menuItems.length} menu items, ${db.users.length} users, and sample orders.`);
};

