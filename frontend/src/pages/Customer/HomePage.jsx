import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  Search,
  Star,
  Clock,
  Sparkles,
  Filter,
  ArrowRight,
  ShieldCheck,
  Flame,
  Award
} from "lucide-react";

export const HomePage = () => {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [error, setError] = useState("");

  const cuisineCategories = [
    { name: "All", icon: "🍽️" },
    { name: "North Indian", icon: "🍛" },
    { name: "Biryani", icon: "🍚" },
    { name: "Pizza", icon: "🍕" },
    { name: "Burgers", icon: "🍔" },
    { name: "Chinese", icon: "🥢" },
    { name: "Desserts", icon: "🍰" }
  ];

  const fetchRestaurants = async (searchTerm = search) => {
    try {
      setLoading(true);
      setError("");
      const res = await api.restaurants.getAll({
        search: searchTerm,
        cuisine: selectedCuisine,
        sortBy,
        isVegOnly: isVegOnly ? "true" : "false"
      });
      if (res.success) {
        setRestaurants(res.data);
      }
    } catch (err) {
      setError(err.message || "Unable to load restaurants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [selectedCuisine, sortBy, isVegOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRestaurants();
  };

  return (
    <div>
      <PageFeedback message={error} />
      {/* Hero Banner Section */}
      <section
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
          borderRadius: "24px",
          padding: "48px 36px",
          color: "#ffffff",
          marginBottom: "36px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 25px -5px rgba(6, 78, 59, 0.4)"
        }}
      >
        <div style={{ maxWidth: "680px", position: "relative", zIndex: 2 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.15)",
              padding: "6px 14px",
              borderRadius: "9999px",
              fontSize: "0.825rem",
              fontWeight: 700,
              marginBottom: "16px",
              backdropFilter: "blur(6px)"
            }}
          >
            <Sparkles size={16} color="#fbbf24" />
            <span>FDS Food Delivery &amp; Restaurant Platform</span>
          </div>

          {user && (
            <p style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "12px" }}>
              Welcome back, {user.name}
            </p>
          )}

          <h1
            style={{
              fontSize: "2.75rem",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: "16px",
              letterSpacing: "-0.5px"
            }}
          >
            Sizzling Flavors, <br />
            Delivered in <span style={{ color: "#34d399" }}>Minutes.</span>
          </h1>

          <p
            style={{
              fontSize: "1.05rem",
              opacity: 0.9,
              marginBottom: "28px",
              lineHeight: 1.6
            }}
          >
            Discover top-rated restaurants, follow delivery status on live maps, and apply available offers at checkout.
          </p>

          {/* Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: "flex",
              background: "#ffffff",
              padding: "6px",
              borderRadius: "14px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              maxWidth: "540px"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0 14px",
                flex: 1,
                color: "var(--gray-500)"
              }}
            >
              <Search size={20} />
              <input
                type="text"
                aria-label="Search restaurants, dishes, or cuisine"
                placeholder="Search restaurant, dish or cuisine (e.g. Biryani, Pizza)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  width: "100%",
                  fontSize: "0.95rem",
                  color: "var(--gray-800)"
                }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ borderRadius: "10px", padding: "10px 22px" }}
            >
              Find Food
            </button>
          </form>
        </div>

        {/* Hero Decorative floating stats */}
        <div
          style={{
            position: "absolute",
            right: "40px",
            bottom: "30px",
            display: "flex",
            gap: "14px"
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(10px)",
              padding: "16px 20px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}
          >
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#34d399" }}>25 mins</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>Avg Delivery Time</div>
          </div>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(10px)",
              padding: "16px 20px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}
          >
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fbbf24" }}>4.8 ★</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>Customer Rating</div>
          </div>
        </div>
      </section>

      {/* Cuisine Quick Filter Chips */}
      <section style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--dark)" }}>
            What's on your mind?
          </h2>
          <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>
            Handpicked culinary categories
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            paddingBottom: "8px"
          }}
        >
          {cuisineCategories.map((c) => {
            const isSelected = selectedCuisine === c.name;
            return (
              <button
                key={c.name}
                onClick={() => setSelectedCuisine(c.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "9999px",
                  background: isSelected ? "var(--primary)" : "#ffffff",
                  color: isSelected ? "#ffffff" : "var(--gray-700)",
                  border: isSelected ? "1px solid var(--primary)" : "1px solid var(--gray-200)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  boxShadow: isSelected ? "0 4px 12px rgba(16, 185, 129, 0.25)" : "var(--shadow-sm)",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                <span style={{ fontSize: "1.15rem" }}>{c.icon}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter and Sort Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "16px 20px",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid var(--gray-200)",
          marginBottom: "28px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontWeight: 700, color: "var(--dark)", fontSize: "1.1rem" }}>
            {restaurants.length} Restaurants Available
          </span>
          {/* Veg Only Filter Toggle */}
          <button
            onClick={() => setIsVegOnly(!isVegOnly)}
            aria-pressed={isVegOnly}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "9999px",
              fontSize: "0.825rem",
              fontWeight: 700,
              background: isVegOnly ? "#dcfce7" : "var(--gray-100)",
              color: isVegOnly ? "#15803d" : "var(--gray-600)",
              border: isVegOnly ? "1px solid #86efac" : "1px solid var(--gray-300)"
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isVegOnly ? "#15803d" : "#94a3b8"
              }}
            />
            Pure Veg Only
          </button>
        </div>

        {/* Sort selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--gray-500)", fontWeight: 600 }}>
            Sort By:
          </span>
          <select
            aria-label="Sort restaurants"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--gray-800)",
              background: "#ffffff"
            }}
          >
            <option value="rating">Top Rated (Default)</option>
            <option value="deliveryTime">Fastest Delivery</option>
            <option value="costLowToHigh">Cost: Low to High</option>
            <option value="costHighToLow">Cost: High to Low</option>
          </select>
        </div>
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <PageLoading label="Loading restaurants..." />
      ) : restaurants.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid var(--gray-200)"
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔍</div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
            No restaurants match your filters
          </h3>
          <p style={{ color: "var(--gray-500)", marginBottom: "16px" }}>
            Try resetting your search query or selecting a different cuisine.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedCuisine("All");
              setIsVegOnly(false);
              fetchRestaurants("");
            }}
            className="btn btn-primary"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          className="responsive-card-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "24px"
          }}
        >
          {restaurants.map((rest) => (
            <Link
              key={rest._id}
              to={`/restaurant/${rest._id}`}
              className="card card-hover"
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                color: "inherit"
              }}
            >
              {/* Image banner */}
              <div style={{ position: "relative", height: "190px", width: "100%", overflow: "hidden" }}>
                <img
                  src={rest.image}
                  alt={rest.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)"
                  }}
                />

                {/* Rating Badge */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    left: "12px",
                    background: "#ffffff",
                    borderRadius: "8px",
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "var(--dark)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                >
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <span>{rest.rating}</span>
                  <span style={{ color: "var(--gray-400)", fontSize: "0.75rem" }}>
                    ({rest.reviewCount})
                  </span>
                </div>

                {/* Delivery Time Badge */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    right: "12px",
                    background: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "8px",
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    color: "#ffffff"
                  }}
                >
                  <Clock size={13} color="#34d399" />
                  <span>{rest.deliveryTimeMinutes} mins</span>
                </div>

                {rest.featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      background: "#f59e0b",
                      color: "#ffffff",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}
                  >
                    Featured
                  </div>
                )}
              </div>

              {/* Details Content */}
              <div style={{ padding: "18px", flex: 1, display: "flex", flexDirection: "column" }}>
                <h3
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    color: "var(--dark)",
                    marginBottom: "4px"
                  }}
                >
                  {rest.name}
                </h3>

                <p
                  style={{
                    fontSize: "0.825rem",
                    color: "var(--gray-500)",
                    marginBottom: "12px"
                  }}
                >
                  {rest.cuisine.join(" • ")}
                </p>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--gray-100)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.85rem"
                  }}
                >
                  <span style={{ color: "var(--gray-600)" }}>
                    ₹{rest.priceForTwo} for two
                  </span>

                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--primary)",
                      fontWeight: 700
                    }}
                  >
                    View Menu <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
