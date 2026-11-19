import { generateToken, safeUser } from "../middleware/authMiddleware.js";
import { createRestaurant } from "../repositories/restaurantRepository.js";
import { createUser, findUserByEmail, updateUserById } from "../repositories/userRepository.js";
import { createId, runInMemoryTransaction } from "../repositories/unitOfWork.js";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "../security/passwords.js";
import { logSecurityEvent } from "../middleware/securityEvents.js";

const isValidPhone = (value) => {
  if (typeof value !== "string" || !/^\+?[0-9\s().-]{7,32}$/.test(value.trim())) return false;
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 7 && digitCount <= 15;
};

// @desc    Register new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "customer",
      phone,
      restaurantName,
      restaurantStreet,
      restaurantCity,
      vehicleType,
      vehicleNumber,
      vehicleModel
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({ success: false, message: "Provide a valid name and email and a password of at least 8 characters and no more than 72 UTF-8 bytes" });
    }

    if (!["customer", "restaurant", "rider"].includes(role)) {
      return res.status(400).json({ success: false, message: "Public registration is limited to customer, restaurant, and rider accounts" });
    }

    const hasPhone = typeof phone === "string" && Boolean(phone.trim());
    if (hasPhone && !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Provide a valid phone number" });
    }

    if (role !== "customer" && !hasPhone) {
      return res.status(400).json({ success: false, message: "A phone number is required for this account type" });
    }

    if (
      role === "restaurant" &&
      (
        typeof restaurantName !== "string" ||
        !restaurantName.trim() ||
        restaurantName.trim().length > 100 ||
        typeof restaurantStreet !== "string" ||
        !restaurantStreet.trim() ||
        restaurantStreet.trim().length > 160 ||
        typeof restaurantCity !== "string" ||
        !restaurantCity.trim() ||
        restaurantCity.trim().length > 80
      )
    ) {
      return res.status(400).json({ success: false, message: "Restaurant name, street address, and city are required" });
    }

    if (
      role === "rider" &&
      (
        typeof vehicleType !== "string" ||
        !["Motorcycle", "Scooter", "Bicycle", "Car"].includes(vehicleType) ||
        typeof vehicleNumber !== "string" ||
        !vehicleNumber.trim() ||
        vehicleNumber.trim().length > 24 ||
        (vehicleModel !== undefined && (typeof vehicleModel !== "string" || vehicleModel.trim().length > 80))
      )
    ) {
      return res.status(400).json({ success: false, message: "Provide valid rider vehicle details" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User with this email already exists" });
    }

    const userId = createId();
    let restaurantId = null;
    let newRestaurant = null;

    // If registering as a restaurant partner, create their restaurant profile
    if (role === "restaurant") {
      restaurantId = createId();
      newRestaurant = {
        _id: restaurantId,
        ownerId: userId,
        name: restaurantName.trim(),
        tagline: "Freshly prepared gourmet dishes",
        cuisine: ["Multi-Cuisine"],
        rating: 0,
        reviewCount: 0,
        deliveryTimeMinutes: 30,
        priceForTwo: 450,
        minOrderAmount: 150,
        commissionRate: 15,
        isOpen: false,
        isApproved: false,
        featured: false,
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
        address: {
          street: restaurantStreet.trim(),
          city: restaurantCity.trim()
        }
      };
    }

    const newUser = {
      _id: userId,
      name: name.trim(),
      email: normalizedEmail,
      password: await hashPassword(password),
      role,
      isActive: true,
      isApproved: role === "customer",
      phone: hasPhone ? phone.trim() : null,
      restaurantId,
      ...(role === "rider" && {
        isAvailable: false,
        vehicleDetails: {
          type: vehicleType,
          number: vehicleNumber.trim(),
          model: vehicleModel?.trim() || ""
        }
      }),
      createdAt: new Date().toISOString()
    };

    const token = generateToken(newUser);
    await runInMemoryTransaction(["users", "restaurants"], () => {
      if (newRestaurant) createRestaurant(newRestaurant);
      createUser(newUser);
    }, newUser);

    res.status(201).json({
      success: true,
      data: {
        user: safeUser(newUser),
        token
      }
    });
  } catch (error) {
    console.error("[Auth] Registration failed", error);
    res.status(500).json({ success: false, message: "Unable to register account" });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.length > 254 ||
      !password ||
      password.length > 128
    ) {
      return res.status(400).json({ success: false, message: "Please provide a valid email and password" });
    }

    const matchingUser = findUserByEmail(email.trim().toLowerCase());
    let user = matchingUser &&
      await verifyPassword(password, matchingUser.password)
      ? matchingUser
      : null;

    if (!user) {
      logSecurityEvent("login_failed", req);
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (user.isActive === false) {
      logSecurityEvent("suspended_account_login", req);
      return res.status(403).json({ success: false, message: "This account is currently disabled" });
    }

    if (
      passwordNeedsRehash(user.password) &&
      Buffer.byteLength(password, "utf8") <= 72
    ) {
      const upgradedPassword = await hashPassword(password);
      const upgradedUser = await runInMemoryTransaction(
        ["users"],
        () => updateUserById(user._id, { password: upgradedPassword }),
        { _id: user._id, role: user.role }
      );
      if (!upgradedUser) throw new Error("Account changed during sign-in");
      user = upgradedUser;
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user: safeUser(user),
        token
      }
    });
  } catch (error) {
    console.error("[Auth] Sign-in failed", error);
    res.status(500).json({ success: false, message: "Unable to sign in" });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
export const getMe = (req, res) => {
  res.json({
    success: true,
    data: safeUser(req.user)
  });
};
