import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Store } from "lucide-react";
import { api } from "../../services/api";
import { PageFeedback, PageLoading } from "../../components/PageFeedback";

export const RestaurantOperations = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.restaurants.getAll();
      if (response.success) setRestaurants(response.data);
    } catch (requestError) {
      setError(requestError.message || "Unable to load restaurants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const toggleRestaurant = async (restaurant) => {
    try {
      setSavingId(restaurant._id);
      setError("");
      setNotice("");
      const response = await api.restaurants.update(restaurant._id, { isOpen: !restaurant.isOpen });
      if (response.success) {
        setRestaurants((current) => current.map((item) =>
          item._id === restaurant._id ? { ...item, isOpen: response.data.isOpen } : item
        ));
        setNotice(`${restaurant.name} is now ${response.data.isOpen ? "open" : "closed"}.`);
      }
    } catch (requestError) {
      setError(`Unable to update ${restaurant.name}: ${requestError.message}`);
    } finally {
      setSavingId("");
    }
  };

  const visibleRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return restaurants
      .filter((restaurant) => {
        const matchesSearch = !query ||
          restaurant.name.toLowerCase().includes(query) ||
          restaurant.cuisine.some((cuisine) => cuisine.toLowerCase().includes(query)) ||
          restaurant.address?.city?.toLowerCase().includes(query);
        const matchesStatus = statusFilter === "all" ||
          (statusFilter === "open" ? restaurant.isOpen : !restaurant.isOpen);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => sortBy === "rating"
        ? b.rating - a.rating
        : a.name.localeCompare(b.name));
  }, [restaurants, search, sortBy, statusFilter]);

  if (loading) return <PageLoading label="Loading restaurant operations..." />;

  const openCount = restaurants.filter((restaurant) => restaurant.isOpen).length;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "60px" }}>
      <Link to="/admin-panel" className="btn btn-outline btn-sm" style={{ marginBottom: "12px" }}>
        <ArrowLeft size={14} /> Back to Admin Dashboard
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "14px", marginBottom: "20px" }}>
        <div>
          <h1>Restaurant Operations</h1>
          <p style={{ color: "var(--gray-500)" }}>Review restaurant status and manage service availability.</p>
        </div>
        <button onClick={fetchRestaurants} className="btn btn-dark btn-sm" disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <PageFeedback message={error} />
      <PageFeedback message={notice} type="success" />

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <button type="button" className="card" aria-pressed={statusFilter === "all"} onClick={() => setStatusFilter("all")} style={{ padding: "16px", textAlign: "left" }}>Restaurants <strong>{restaurants.length}</strong></button>
        <button type="button" className="card" aria-pressed={statusFilter === "open"} onClick={() => setStatusFilter("open")} style={{ padding: "16px", textAlign: "left" }}>Open <strong>{openCount}</strong></button>
        <button type="button" className="card" aria-pressed={statusFilter === "closed"} onClick={() => setStatusFilter("closed")} style={{ padding: "16px", textAlign: "left" }}>Closed <strong>{restaurants.length - openCount}</strong></button>
      </div>

      <div className="dashboard-controls" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "12px", marginBottom: "18px" }}>
        <div>
          <label htmlFor="restaurant-operations-search">Search restaurants</label>
          <input id="restaurant-operations-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, cuisine, or city" />
        </div>
        <div>
          <label htmlFor="restaurant-operations-status">Service status</label>
          <select id="restaurant-operations-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All restaurants</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label htmlFor="restaurant-operations-sort">Sort by</label>
          <select id="restaurant-operations-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Name</option>
            <option value="rating">Highest rated</option>
          </select>
        </div>
      </div>

      <div className="responsive-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {visibleRestaurants.map((restaurant) => (
          <article key={restaurant._id} className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem" }}>{restaurant.name}</h2>
                <p style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}>{restaurant.cuisine.join(" · ")}</p>
              </div>
              <Store size={20} color="var(--primary)" aria-hidden="true" />
            </div>
            <div style={{ margin: "14px 0", color: "var(--gray-600)", fontSize: "0.9rem" }}>
              <div>{restaurant.address?.city || "City not set"}</div>
              <div>Rating {restaurant.rating ?? "—"} · {restaurant.deliveryTimeMinutes} min</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <span className={`badge ${restaurant.isOpen ? "badge-success" : "badge-warning"}`}>
                {restaurant.isOpen ? "Open" : "Closed"}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={savingId === restaurant._id}
                onClick={() => toggleRestaurant(restaurant)}
                aria-label={`${restaurant.isOpen ? "Close" : "Open"} ${restaurant.name}`}
              >
                {savingId === restaurant._id ? "Updating..." : restaurant.isOpen ? "Close service" : "Open service"}
              </button>
            </div>
          </article>
        ))}
        {visibleRestaurants.length === 0 && (
          <div className="card" style={{ gridColumn: "1 / -1", padding: "28px", textAlign: "center", color: "var(--gray-500)" }}>
            No restaurants match your search and status filter.
          </div>
        )}
      </div>
    </div>
  );
};
