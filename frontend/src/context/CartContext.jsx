import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../services/api";

const CartContext = createContext();
const MAX_ITEM_QUANTITY = 20;

export const CartProvider = ({ children }) => {
  const { user, token } = useAuth();
  const lastSyncedCart = useRef("");
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("fds_cart_items");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [restaurant, setRestaurant] = useState(() => {
    try {
      const saved = localStorage.getItem("fds_cart_restaurant");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [coupon, setCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem("fds_cart_coupon");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem("fds_cart_items", JSON.stringify(cartItems));
    if (restaurant) {
      localStorage.setItem("fds_cart_restaurant", JSON.stringify(restaurant));
    } else {
      localStorage.removeItem("fds_cart_restaurant");
    }
  }, [cartItems, restaurant]);

  useEffect(() => {
    if (coupon) {
      localStorage.setItem("fds_cart_coupon", JSON.stringify(coupon));
    } else {
      localStorage.removeItem("fds_cart_coupon");
    }
  }, [coupon]);

  useEffect(() => {
    if (!user || user.role !== "customer" || !token) {
      lastSyncedCart.current = "";
      return undefined;
    }

    const snapshot = {
      restaurantId: restaurant?._id || null,
      items: cartItems.map((item) => ({
        menuItemId: item.menuItemId || item._id,
        quantity: item.quantity
      })),
      couponCode: coupon?.code || null
    };
    const signature = `${user._id}:${JSON.stringify(snapshot)}`;
    if (signature === lastSyncedCart.current) return undefined;
    if (snapshot.items.length === 0 && !snapshot.restaurantId && !snapshot.couponCode) {
      const hadCart = lastSyncedCart.current.startsWith(`${user._id}:`);
      lastSyncedCart.current = signature;
      if (!hadCart) return undefined;
    }

    const timeout = window.setTimeout(async () => {
      try {
        await api.cart.recordTransaction(snapshot);
        lastSyncedCart.current = signature;
      } catch (error) {
        console.error("Failed to record cart transaction:", error);
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [cartItems, coupon, restaurant, token, user]);

  // Financial calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const deliveryFee = cartItems.length > 0 ? 45 : 0;
  const packagingFee = cartItems.length > 0 ? 20 : 0;

  let discount = 0;
  if (coupon && subtotal >= (coupon.minOrderAmount || 0)) {
    if (coupon.discountType === "percentage") {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = coupon.discountValue;
    }
    discount = Math.round(discount * 100) / 100;
  }

  const total = Math.max(0, Math.round((subtotal + tax + deliveryFee + packagingFee - discount) * 100) / 100);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (item, currentRestaurant) => {
    if (!user || user.role !== "customer") return false;

    // If cart has items from another restaurant, ask or reset
    if (restaurant && restaurant._id !== currentRestaurant._id) {
      const confirmReset = window.confirm(
        `Your cart contains items from "${restaurant.name}". Do you want to clear your cart and start a new order from "${currentRestaurant.name}"?`
      );
      if (!confirmReset) return false;
      setCartItems([{ ...item, quantity: 1 }]);
      setRestaurant(currentRestaurant);
      setCoupon(null);
      return true;
    }

    if (!restaurant) {
      setRestaurant(currentRestaurant);
    }

    setCartItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item._id || i._id === item._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item._id || i._id === item._id
            ? { ...i, quantity: Math.min(MAX_ITEM_QUANTITY, i.quantity + 1) }
            : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          _id: item._id,
          name: item.name,
          price: item.price,
          isVeg: item.isVeg,
          image: item.image,
          quantity: 1
        }
      ];
    });
    return true;
  };

  const removeFromCart = (itemId) => {
    setCartItems((prev) => {
      const updated = prev.filter((i) => (i.menuItemId || i._id) !== itemId);
      if (updated.length === 0) {
        setRestaurant(null);
        setCoupon(null);
      }
      return updated;
    });
  };

  const updateQuantity = (itemId, delta) => {
    if (!user || user.role !== "customer") return;

    setCartItems((prev) => {
      return prev
        .map((i) => {
          if ((i.menuItemId || i._id) === itemId) {
            const newQty = i.quantity + delta;
            return newQty > MAX_ITEM_QUANTITY
              ? { ...i, quantity: MAX_ITEM_QUANTITY }
              : newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setRestaurant(null);
    setCoupon(null);
  };

  const applyCoupon = (couponData) => {
    setCoupon(couponData);
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        restaurant,
        coupon,
        itemCount,
        subtotal,
        tax,
        deliveryFee,
        packagingFee,
        discount,
        total,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
