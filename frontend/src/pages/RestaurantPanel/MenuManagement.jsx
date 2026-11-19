import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";
import {
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";

export const MenuManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(user?.restaurantId || "");
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(isAdmin);
  const restaurantId = user?.restaurantId || selectedRestaurantId;

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newItem, setNewItem] = useState({
    name: "",
    category: "Main Course",
    price: "",
    description: "",
    isVeg: true,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"
  });

  const fetchMenu = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMenuItems([]);
      const res = await api.menu.getByRestaurant(restaurantId);
      if (res.success) {
        setMenuItems(res.data);
      }
    } catch (err) {
      setError(err.message || "Unable to load menu items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    api.restaurants.getAll()
      .then((res) => {
        if (active && res.success) setRestaurants(res.data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load restaurants.");
      })
      .finally(() => {
        if (active) setRestaurantsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const handleToggleAvailability = async (id) => {
    try {
      setBusyAction(id);
      setError("");
      setNotice("");
      const res = await api.menu.toggleAvailability(id);
      if (res.success) {
        setMenuItems((prev) =>
          prev.map((item) => (item._id === id ? { ...item, isAvailable: !item.isAvailable } : item))
        );
        setNotice("Menu item availability updated.");
      }
    } catch (err) {
      setError("Failed to update availability: " + err.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to remove this dish from the menu?")) return;
    try {
      setBusyAction(id);
      setError("");
      setNotice("");
      await api.menu.deleteItem(id);
      setMenuItems((prev) => prev.filter((i) => i._id !== id));
      setNotice("Menu item removed.");
    } catch (err) {
      setError("Failed to remove menu item: " + err.message);
    } finally {
      setBusyAction("");
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      setBusyAction("create");
      setError("");
      setNotice("");
      const res = await api.menu.addItem({
        ...newItem,
        restaurantId,
        price: Number(newItem.price)
      });
      if (res.success) {
        setMenuItems((prev) => [...prev, res.data]);
        setShowAddModal(false);
        setNewItem({
          name: "",
          category: "Main Course",
          price: "",
          description: "",
          isVeg: true,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"
        });
        setNotice("Menu item added.");
      }
    } catch (err) {
      setError("Failed to add menu item: " + err.message);
    } finally {
      setBusyAction("");
    }
  };

  const query = search.trim().toLowerCase();
  const visibleItems = menuItems
    .filter((item) => {
      const matchesSearch = !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      const matchesStock = stockFilter === "all" ||
        (stockFilter === "available" ? item.isAvailable : !item.isAvailable);
      return matchesSearch && matchesStock;
    })
    .sort((a, b) => sortBy === "price"
      ? a.price - b.price
      : sortBy === "category"
        ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name));
  const availableCount = menuItems.filter((item) => item.isAvailable).length;

  if (loading) return <PageLoading label="Loading restaurant menu..." />;

  if (!isAdmin && !restaurantId) {
    return (
      <div className="card" style={{ maxWidth: "640px", margin: "48px auto", padding: "28px", textAlign: "center" }}>
        <h1>Restaurant account required</h1>
        <p style={{ color: "var(--gray-500)", margin: "12px 0 20px" }}>
          Sign in with a registered restaurant partner account to manage its menu.
        </p>
        <Link to="/login" className="btn btn-primary">Sign In</Link>
      </div>
    );
  }

  if (isAdmin && !restaurantId) {
    return (
      <div style={{ maxWidth: "720px", margin: "48px auto" }}>
        <PageFeedback message={error} />
        <div className="card" style={{ padding: "28px" }}>
          <h1 style={{ marginBottom: "12px" }}>Choose a restaurant</h1>
          <p style={{ color: "var(--gray-500)", marginBottom: "16px" }}>Select a restaurant to review and manage its menu.</p>
          <label htmlFor="admin-menu-restaurant">Restaurant</label>
          <select
            id="admin-menu-restaurant"
            value={selectedRestaurantId}
            onChange={(event) => setSelectedRestaurantId(event.target.value)}
            disabled={restaurantsLoading}
          >
            <option value="">{restaurantsLoading ? "Loading restaurants..." : "Select restaurant"}</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <Link
            to={isAdmin ? "/admin-panel" : "/restaurant-panel"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--gray-600)",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "8px"
            }}
          >
            <ArrowLeft size={16} /> Back to {isAdmin ? "Admin Dashboard" : "Kitchen Dashboard"}
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--dark)" }}>
            {isAdmin ? "Menu Operations" : "Restaurant Menu & Inventory Management"}
          </h1>
          <div style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>
            Add new recipes, modify prices, and toggle real-time stock availability.
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={busyAction === "create"}
          className="btn btn-primary"
          style={{ borderRadius: "10px" }}
        >
          <Plus size={16} /> Add New Dish
        </button>
      </div>

      <PageFeedback message={error} />
      <PageFeedback message={notice} type="success" />

      {isAdmin && (
        <div className="dashboard-controls" style={{ marginBottom: "18px" }}>
          <label htmlFor="admin-menu-restaurant">Restaurant</label>
          <select
            id="admin-menu-restaurant"
            value={restaurantId}
            onChange={(event) => setSelectedRestaurantId(event.target.value)}
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant._id} value={restaurant._id}>{restaurant.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <button type="button" className="card" aria-pressed={stockFilter === "all"} onClick={() => setStockFilter("all")} style={{ padding: "16px", textAlign: "left" }}>Menu items <strong>{menuItems.length}</strong></button>
        <button type="button" className="card" aria-pressed={stockFilter === "available"} onClick={() => setStockFilter("available")} style={{ padding: "16px", textAlign: "left" }}>Available <strong>{availableCount}</strong></button>
        <button type="button" className="card" aria-pressed={stockFilter === "unavailable"} onClick={() => setStockFilter("unavailable")} style={{ padding: "16px", textAlign: "left" }}>Sold out <strong>{menuItems.length - availableCount}</strong></button>
      </div>

      <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px", marginBottom: "16px" }}>
        <div>
          <label htmlFor="menu-search">Search menu</label>
          <input id="menu-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Dish or category" />
        </div>
        <div>
          <label htmlFor="menu-stock-filter">Availability</label>
          <select id="menu-stock-filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
            <option value="all">All items</option>
            <option value="available">Available</option>
            <option value="unavailable">Sold out</option>
          </select>
        </div>
        <div>
          <label htmlFor="menu-sort">Sort by</label>
          <select id="menu-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="price">Price: low to high</option>
          </select>
        </div>
      </div>

      {/* Menu items table */}
      <div className="card responsive-table">
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--gray-50)", borderBottom: "1px solid var(--gray-200)", fontSize: "0.825rem", color: "var(--gray-500)", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 20px" }}>Dish</th>
              <th style={{ padding: "14px 20px" }}>Category</th>
              <th style={{ padding: "14px 20px" }}>Price</th>
              <th style={{ padding: "14px 20px" }}>Food Type</th>
              <th style={{ padding: "14px 20px" }}>Stock Switch</th>
              <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr
                key={item._id}
                style={{
                  borderBottom: "1px solid var(--gray-100)",
                  fontSize: "0.9rem"
                }}
              >
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover" }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--dark)" }}>{item.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>{item.badge || "Standard"}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 20px", color: "var(--gray-600)" }}>{item.category}</td>
                <td style={{ padding: "14px 20px", fontWeight: 700, color: "var(--dark)" }}>₹{item.price}</td>
                <td style={{ padding: "14px 20px" }}>
                  <span className={`badge ${item.isVeg ? "badge-veg" : "badge-non-veg"}`}>
                    {item.isVeg ? "Veg" : "Non-Veg"}
                  </span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <button
                    onClick={() => handleToggleAvailability(item._id)}
                    disabled={busyAction === item._id}
                    aria-label={`Mark ${item.name} ${item.isAvailable ? "sold out" : "available"}`}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      background: item.isAvailable ? "#dcfce7" : "#fee2e2",
                      color: item.isAvailable ? "#15803d" : "#b91c1c",
                      border: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    {busyAction === item._id ? "Updating..." : item.isAvailable ? "In Stock (Active)" : "Sold Out"}
                  </button>
                </td>
                <td style={{ padding: "14px 20px", textAlign: "right" }}>
                  <button
                    onClick={() => handleDeleteItem(item._id)}
                    disabled={busyAction === item._id}
                    style={{ background: "transparent", color: "var(--gray-400)" }}
                    aria-label={`Delete ${item.name}`}
                    title="Delete item"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {visibleItems.length === 0 && (
              <tr><td colSpan="6" style={{ padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>No menu items match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Dish Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: "28px" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "18px", color: "var(--dark)" }}>
              Add New Dish to Menu
            </h3>
            <PageFeedback message={error} />

            <form onSubmit={handleCreateItem} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Dish Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Butter Garlic Prawns"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Biryani">Biryani</option>
                    <option value="Pizza">Pizza</option>
                    <option value="Breads">Breads</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 350"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--gray-700)", display: "block", marginBottom: "4px" }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, preparation and taste profile..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--gray-300)" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="veg"
                    checked={newItem.isVeg}
                    onChange={() => setNewItem({ ...newItem, isVeg: true })}
                  />
                  <span>Pure Vegetarian</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="veg"
                    checked={!newItem.isVeg}
                    onChange={() => setNewItem({ ...newItem, isVeg: false })}
                  />
                  <span>Non-Vegetarian</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={busyAction === "create"}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" disabled={busyAction === "create"} className="btn btn-primary">
                  {busyAction === "create" ? "Saving..." : "Save Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
