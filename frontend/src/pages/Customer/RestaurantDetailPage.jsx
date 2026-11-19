import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  Star,
  Clock,
  MapPin,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  Info
} from "lucide-react";

export const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [menuSearch, setMenuSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [error, setError] = useState("");

  const { cartItems, addToCart, updateQuantity, itemCount, total } = useCart();

  const handleAddToCart = (item) => {
    if (!user) {
      navigate("/login", { state: { from: `/restaurant/${id}` } });
      return;
    }
    if (user.role !== "customer") {
      setError("Sign in with a customer account to add items to your cart.");
      return;
    }
    setError("");
    addToCart(item, restaurant);
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.restaurants.getById(id);
        if (res.success) {
          setRestaurant(res.data);
          if (res.data.categorizedMenu?.length > 0) {
            setSelectedCategory(res.data.categorizedMenu[0].category);
          }
        }
      } catch (err) {
        setError(err.message || "Unable to load restaurant details.");
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id]);

  if (loading) return <PageLoading label="Loading restaurant menu..." />;

  if (!restaurant) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <PageFeedback message={error} />
        <h2>Restaurant not found</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
          Back to Explore
        </Link>
      </div>
    );
  }

  const getItemQuantityInCart = (itemId) => {
    const found = cartItems.find((i) => (i.menuItemId || i._id) === itemId);
    return found ? found.quantity : 0;
  };

  const categories = restaurant.categorizedMenu || [];
  const currentCategoryObj = categories.find((c) => c.category === selectedCategory);
  const displayedItems = (currentCategoryObj ? currentCategoryObj.items : restaurant.menu || [])
    .filter((item) => !menuSearch.trim() ||
      `${item.name} ${item.description || ""}`.toLowerCase().includes(menuSearch.trim().toLowerCase()))
    .sort((a, b) => sortBy === "price"
      ? a.price - b.price
      : a.name.localeCompare(b.name));

  return (
    <div style={{ paddingBottom: "100px" }}>
      <PageFeedback message={error} />
      {/* Restaurant Header Banner */}
      <div
        className="card"
        style={{
          padding: "28px",
          marginBottom: "32px",
          display: "flex",
          flexWrap: "wrap",
          gap: "28px",
          alignItems: "center"
        }}
      >
        <img
          src={restaurant.image}
          alt={restaurant.name}
          style={{
            width: "180px",
            height: "140px",
            borderRadius: "14px",
            objectFit: "cover"
          }}
        />

        <div style={{ flex: 1, minWidth: "280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)" }}>
              {restaurant.name}
            </h1>
            {restaurant.isOpen ? (
              <span className="badge badge-success">Open Now</span>
            ) : (
              <span className="badge badge-warning">Currently Closed</span>
            )}
          </div>

          <p style={{ color: "var(--gray-500)", fontSize: "0.95rem", marginBottom: "14px" }}>
            {restaurant.cuisine.join(" • ")}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <span>{restaurant.rating}</span>
              <span style={{ color: "var(--gray-400)", fontWeight: 500 }}>
                ({restaurant.reviewCount} reviews)
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--gray-700)" }}>
              <Clock size={16} color="#10b981" />
              <span>{restaurant.deliveryTimeMinutes} mins delivery</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--gray-700)" }}>
              <MapPin size={16} color="var(--primary)" />
              <span>{restaurant.address?.street}, {restaurant.address?.city}</span>
            </div>

            <div style={{ color: "var(--gray-700)" }}>
              ₹{restaurant.priceForTwo} for two
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid var(--gray-200)",
          marginBottom: "28px",
          overflowX: "auto"
        }}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.category;
          return (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              style={{
                padding: "12px 20px",
                fontWeight: 700,
                fontSize: "0.95rem",
                color: isActive ? "var(--primary)" : "var(--gray-500)",
                borderBottom: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                marginBottom: "-2px",
                background: "transparent",
                transition: "all 0.2s"
              }}
            >
              {cat.category} ({cat.items.length})
            </button>
          );
        })}
      </div>

      <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px", marginBottom: "18px" }}>
        <div>
          <label htmlFor="restaurant-menu-search">Search dishes</label>
          <input id="restaurant-menu-search" type="search" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} placeholder="Dish or description" />
        </div>
        <div>
          <label htmlFor="restaurant-menu-sort">Sort by</label>
          <select id="restaurant-menu-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Name</option>
            <option value="price">Price: low to high</option>
          </select>
        </div>
      </div>

      {/* Menu Item Cards */}
      <div
        className="responsive-card-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
          gap: "20px"
        }}
      >
        {displayedItems.map((item) => {
          const qty = getItemQuantityInCart(item._id);

          return (
            <div
              key={item._id}
              className="card"
              style={{
                padding: "18px",
                display: "flex",
                justifyContent: "space-between",
                gap: "18px",
                opacity: item.isAvailable ? 1 : 0.6
              }}
            >
              <div style={{ flex: 1 }}>
                {/* Veg / Non-Veg badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span className={`badge ${item.isVeg ? "badge-veg" : "badge-non-veg"}`}>
                    {item.isVeg ? "Veg" : "Non-Veg"}
                  </span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#d97706",
                        background: "#fef3c7",
                        padding: "2px 8px",
                        borderRadius: "4px"
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--dark)", marginBottom: "4px" }}>
                  {item.name}
                </h4>

                <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--gray-800)", marginBottom: "8px" }}>
                  ₹{item.price}
                </div>

                <p style={{ fontSize: "0.825rem", color: "var(--gray-500)", lineHeight: 1.5 }}>
                  {item.description}
                </p>
              </div>

              {/* Item Thumbnail & Cart Button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "120px" }}>
                <div style={{ width: "110px", height: "90px", borderRadius: "10px", overflow: "hidden", marginBottom: "10px" }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                {item.isAvailable ? (
                  qty === 0 || user?.role !== "customer" ? (
                    <button
                      onClick={() => handleAddToCart(item)}
                      style={{
                        width: "100%",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "var(--primary)",
                        border: "1px solid var(--primary)",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        background: "var(--primary)",
                        color: "white",
                        borderRadius: "8px",
                        padding: "4px 8px",
                        fontWeight: 700,
                        fontSize: "0.85rem"
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item._id, -1)}
                        style={{ background: "transparent", color: "white", display: "flex", alignItems: "center" }}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{qty}</span>
                      <button
                        onClick={() => updateQuantity(item._id, 1)}
                        style={{ background: "transparent", color: "white", display: "flex", alignItems: "center" }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )
                ) : (
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--danger)" }}>
                    Sold Out
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      {itemCount > 0 && user?.role === "customer" && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "760px",
            background: "#0f172a",
            color: "#ffffff",
            padding: "16px 24px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 900
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShoppingBag size={20} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                {itemCount} {itemCount === 1 ? "Item" : "Items"} in Cart
              </div>
              <div style={{ fontSize: "0.825rem", color: "#94a3b8" }}>
                From {restaurant.name} &bull; Subtotal ₹{total}
              </div>
            </div>
          </div>

          <Link
            to="/cart"
            className="btn btn-primary"
            style={{ borderRadius: "10px", padding: "10px 24px" }}
          >
            <span>Proceed to Cart</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
};
