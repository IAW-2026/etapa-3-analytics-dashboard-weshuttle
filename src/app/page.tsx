"use client";

import { useEffect, useState, useRef } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { AnalyticsMetrics } from "@/lib/types";

interface AnalyticsMeta {
  startDate: string;
  endDate: string;
  isFeedbackOnline: boolean;
  isRiderOnline: boolean;
}

// Dynamic Custom Tooltip for Recharts
interface TooltipPayloadItem {
  name: string;
  value: number | string;
  stroke?: string;
  fill?: string;
}

const CustomTooltipContent = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="chart-tooltip"
        style={{
          background: "#0f172a",
          border: "1px solid var(--border-color)",
          padding: "0.5rem 0.75rem",
          borderRadius: "12px",
          color: "#f1f5f9",
          fontSize: "12px",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.5)",
        }}
      >
        <p className="font-bold text-blue-400 mb-1">{label}</p>
        {payload.map((pld: TooltipPayloadItem) => (
          <p key={pld.name} style={{ color: pld.stroke || pld.fill }}>
            {pld.name === "avgDriverRating"
              ? "Conductor: "
              : pld.name === "avgPassengerRating"
              ? "Pasajero: "
              : "Reseñas: "}
            {pld.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useUser();
  const toastIdRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Date states
  const [dateFilter, setDateFilter] = useState<
    "1day" | "7days" | "15days" | "30days" | "custom"
  >("15days");
  const [dateFilterText, setDateFilterText] = useState("Últimos 15 días");
  const [showDropdown, setShowDropdown] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Dashboard data
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [meta, setMeta] = useState<AnalyticsMeta | null>(null);

  // Recharts Chart Tab Selection ("calificaciones" or "volume")
  const [chartTab, setChartTab] = useState<"calificaciones" | "volume">(
    "calificaciones"
  );



  // Toasts state
  const [toasts, setToasts] = useState<
    { id: number; message: string; icon: string }[]
  >([]);

  // Helper to format Date objects as YYYY-MM-DD
  const formatDateString = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Toast notification trigger
  const showToast = (message: string, icon = "info") => {
    toastIdRef.current += 1;
    const toastId = toastIdRef.current;
    setToasts((prev) => [...prev, { id: toastId, message, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4000);
  };

  // Handle Tab navigation
  const handleNavClick = (tabName: string) => {
    setActiveTab(tabName);
    if (tabName !== "Dashboard" && tabName !== "Calificaciones") {
      showToast(`Cargando sección de ${tabName}... (Próximamente)`, "dns");
    }
  };

  // Set mounted flag asynchronously to avoid hydration mismatch
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);

      // Set default dates
      const today = new Date();
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(today.getDate() - 15);

      setStartDate(formatDateString(fifteenDaysAgo));
      setEndDate(formatDateString(today));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async (start: string, end: string) => {
    try {
      setRefreshing(true);
      const res = await fetch(
        `/api/analytics?start_date=${start}&end_date=${end}`
      );
      if (res.ok) {
        const json = await res.json();
        setMetrics(json.metrics);
        setMeta(json.meta);
      }
    } catch (error) {
      console.error("Error fetching analytics metrics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch initial data once default dates are loaded
  useEffect(() => {
    if (startDate && endDate) {
      const timer = setTimeout(() => {
        fetchData(startDate, endDate);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [startDate, endDate]);

  // Handle Dropdown Filter Item click
  const handleRangeSelect = (
    type: "1day" | "7days" | "15days" | "30days" | "custom"
  ) => {
    setDateFilter(type);
    setShowDropdown(false);

    if (type !== "custom") {
      const today = new Date();
      const newStart = new Date();
      let label = "";

      if (type === "1day") {
        newStart.setDate(today.getDate() - 1);
        label = "Último día";
      } else if (type === "7days") {
        newStart.setDate(today.getDate() - 7);
        label = "Últimos 7 días";
      } else if (type === "15days") {
        newStart.setDate(today.getDate() - 15);
        label = "Últimos 15 días";
      } else if (type === "30days") {
        newStart.setDate(today.getDate() - 30);
        label = "Últimos 30 días";
      }

      setDateFilterText(label);
      const sStr = formatDateString(newStart);
      const eStr = formatDateString(today);
      setStartDate(sStr);
      setEndDate(eStr);
      fetchData(sStr, eStr);
      showToast(`Filtrado por: ${label}`, "calendar_today");
    } else {
      setDateFilterText("Personalizado");
      showToast("Seleccione el rango de fechas personalizado", "calendar_today");
    }
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("#dateFilterBtn") ||
        target.closest("#dateDropdown")
      ) {
        return;
      }
      setShowDropdown(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  if (!mounted) {
    return null; // Avoid server-side hydration mismatch
  }

  // Calculate destination breakdown from real data
  let poloCount = 0;
  let parqueCount = 0;
  let puertoCount = 0;
  const hasDestinations = metrics?.destinations != null;

  if (hasDestinations && metrics?.destinations) {
    poloCount = metrics.destinations["Polo Petroquímico"] || 0;
    parqueCount = metrics.destinations["Parque Industrial"] || 0;
    puertoCount =
      metrics.destinations["Puerto de Ingeniero White"] ||
      metrics.destinations["Puerto White"] ||
      0;
  }

  const sumCount = Math.max(1, poloCount + parqueCount + puertoCount);

  const destinations = [
    {
      name: "Polo Petroquímico",
      count: poloCount,
      pct: Math.round((poloCount / sumCount) * 100),
      fillClass: "one",
    },
    {
      name: "Parque Industrial",
      count: parqueCount,
      pct: Math.round((parqueCount / sumCount) * 100),
      fillClass: "two",
    },
    {
      name: "Puerto White",
      count: puertoCount,
      pct: Math.round((puertoCount / sumCount) * 100),
      fillClass: "three",
    },
  ];

  // Stars renderer
  const renderStars = (rating: number) => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(
          <span key={i} className="material-symbols-outlined">
            star
          </span>
        );
      } else if (i - 0.5 === rating) {
        stars.push(
          <span key={i} className="material-symbols-outlined">
            star_half
          </span>
        );
      } else {
        stars.push(
          <span
            key={i}
            className="material-symbols-outlined"
            style={{ color: "rgba(255,255,255,0.06)" }}
          >
            star
          </span>
        );
      }
    }
    return stars;
  };



  // User details for footer
  const userFullName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Admin User";

  // Determine service health
  const someOffline = meta && (!meta.isFeedbackOnline || !meta.isRiderOnline);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside>
        <div className="brand">
          <div className="brand-logo">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "28px", height: "28px" }}
            >
              <path
                d="M 22 34 L 35 75 L 50 45 L 65 75 L 78 34"
                fill="none"
                stroke="#0c59cf"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="22" cy="30" r="8.5" fill="#e63946" />
              <circle cx="50" cy="40" r="8.5" fill="#f59e0b" />
              <circle cx="78" cy="30" r="8.5" fill="#10b981" />
            </svg>
          </div>
          <span className="brand-title">WeShuttle</span>
        </div>

        <nav>
          <button
            onClick={() => handleNavClick("Dashboard")}
            className={`nav-item ${activeTab === "Dashboard" ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </button>
          <button
            onClick={() => handleNavClick("Pasajeros")}
            className={`nav-item ${activeTab === "Pasajeros" ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">group</span>
            Pasajeros
          </button>
          <button
            onClick={() => handleNavClick("Transacciones")}
            className={`nav-item ${
              activeTab === "Transacciones" ? "active" : ""
            }`}
          >
            <span className="material-symbols-outlined">payments</span>
            Transacciones
          </button>
          <button
            onClick={() => handleNavClick("Calificaciones")}
            className={`nav-item ${
              activeTab === "Calificaciones" ? "active" : ""
            }`}
          >
            <span className="material-symbols-outlined">reviews</span>
            Calificaciones
          </button>
          <button
            onClick={() => handleNavClick("Configuración")}
            className={`nav-item ${
              activeTab === "Configuración" ? "active" : ""
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            Configuración
          </button>
        </nav>

        <div className="user-footer flex items-center gap-3">
          <UserButton />
          <div className="user-info">
            <h4>{userFullName}</h4>
            <p>Administrador</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {activeTab === "Dashboard" && (
          <>
            <header className="dashboard-header">
          <div className="header-title">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              Analytics Dashboard
              <span className="live-badge">
                <span className="live-dot"></span>En vivo
                {refreshing && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "normal",
                      opacity: 0.8,
                    }}
                  >
                    {" "}
                    (actualizando...)
                  </span>
                )}
              </span>
            </h2>
            <p>
              Consolidación y analítica de datos en tiempo real de todos los
              sistemas.
            </p>
          </div>

          <div className="flex items-center">
            <div className="date-filter-container">
              <div
                className="date-filter"
                id="dateFilterBtn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "1.1rem" }}
                >
                  calendar_today
                </span>
                <span id="dateFilterText">{dateFilterText}</span>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "1.1rem" }}
                >
                  expand_more
                </span>
              </div>
              <div
                className={`date-dropdown ${showDropdown ? "show" : ""}`}
                id="dateDropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="dropdown-item"
                  onClick={() => handleRangeSelect("1day")}
                >
                  Último día
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleRangeSelect("7days")}
                >
                  Últimos 7 días
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleRangeSelect("15days")}
                >
                  Últimos 15 días
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleRangeSelect("30days")}
                >
                  Últimos 30 días
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => handleRangeSelect("custom")}
                >
                  Personalizado
                </button>
              </div>

              {/* Custom date range inputs positioned absolutely below the selector button */}
              {dateFilter === "custom" && !showDropdown && (
                <div
                  className="flex items-center gap-2 p-2 bg-slate-950/95 border border-slate-800 rounded-lg absolute top-[110%] right-0 z-50 shadow-2xl w-[280px] justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value && endDate)
                        fetchData(e.target.value, endDate);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500 w-[115px]"
                  />
                  <span className="text-slate-600 text-xs px-1">a</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (startDate && e.target.value)
                        fetchData(startDate, e.target.value);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500 w-[115px]"
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Service status banner — only shown when a service is offline */}
        {someOffline && (
          <div className="resilience-banner">
            <div className="resilience-header">
              <div className="resilience-icon">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div className="resilience-text">
                <h4>Microservicio no disponible</h4>
                <p>
                  Algunos microservicios no respondieron. Las métricas
                  correspondientes no se muestran.
                </p>
              </div>
            </div>

            <div className="resilience-badges">
              <span
                className={`resilience-badge ${
                  meta?.isFeedbackOnline ? "online" : "mocked"
                }`}
              >
                Feedback App: {meta?.isFeedbackOnline ? "Online" : "Offline"}
              </span>
              <span
                className={`resilience-badge ${
                  meta?.isRiderOnline ? "online" : "mocked"
                }`}
              >
                Rider App: {meta?.isRiderOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <section className="kpi-grid">
          {/* KPI 1 — Rider App: total reservations */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Reservas Totales</span>
              <div className="kpi-icon blue">
                <span className="material-symbols-outlined">
                  calendar_month
                </span>
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
            ) : metrics?.totalReservations != null ? (
              <div className="kpi-value">{metrics.totalReservations}</div>
            ) : (
              <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>
                —
              </div>
            )}
            <div className="kpi-trend up">
              <span className="material-symbols-outlined">route</span>
              <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>
                Rider App
              </span>
            </div>
          </div>

          {/* KPI 2 — Rider App: total amount charged */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Ingresos Totales</span>
              <div className="kpi-icon green">
                <span className="material-symbols-outlined">attach_money</span>
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-32 bg-white/5 rounded animate-pulse my-2" />
            ) : metrics?.totalAmountCharged != null ? (
              <div className="kpi-value">
                {formatCurrency(metrics.totalAmountCharged)}
              </div>
            ) : (
              <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>
                —
              </div>
            )}
            <div className="kpi-trend up">
              <span className="material-symbols-outlined">payments</span>
              <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>
                Rider App
              </span>
            </div>
          </div>

          {/* KPI 3 — Rider App: active passengers */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Pasajeros Activos</span>
              <div className="kpi-icon orange">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-white/5 rounded animate-pulse my-2" />
            ) : metrics?.activeUsers != null ? (
              <div className="kpi-value">{metrics.activeUsers}</div>
            ) : (
              <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>
                —
              </div>
            )}
            <div className="kpi-trend up">
              <span className="material-symbols-outlined">person</span>
              <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>
                Rider App
              </span>
            </div>
          </div>

          {/* KPI 4 — Feedback App: driver average rating */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">Calificación Promedio</span>
              <div className="kpi-icon purple" style={{ color: "#8b5cf6", background: "rgba(139, 92, 246, 0.1)" }}>
                <span className="material-symbols-outlined">star</span>
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
            ) : metrics?.averageDriverRating != null ? (
              <div className="kpi-value">
                {metrics.averageDriverRating} / 5
              </div>
            ) : (
              <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>
                —
              </div>
            )}
            <div className="kpi-trend up" style={{ color: "var(--success)" }}>
              <span className="material-symbols-outlined">star_rate</span>
              <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>
                {metrics?.totalReviews != null
                  ? `${metrics.totalReviews} calificaciones`
                  : "Feedback App"}
              </span>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="charts-grid">
          {/* Recharts Area and Bar Chart */}
          <div className="card" style={{ minWidth: 0 }}>
            <div className="card-header">
              <h3 className="card-title">
                {chartTab === "calificaciones"
                  ? "Evolución de Calificaciones"
                  : "Volumen de Feedback y Reseñas"}
              </h3>
              <div className="card-actions">
                <button
                  onClick={() => setChartTab("calificaciones")}
                  className={`pill ${
                    chartTab === "calificaciones" ? "active" : ""
                  }`}
                >
                  Calificaciones
                </button>
                <button
                  onClick={() => setChartTab("volume")}
                  className={`pill ${chartTab === "volume" ? "active" : ""}`}
                >
                  Volumen
                </button>
              </div>
            </div>

            <div className="chart-container">
              {loading ? (
                <div className="w-full h-full bg-white/5 rounded animate-pulse flex items-center justify-center">
                  <span
                    style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                  >
                    Cargando gráfico...
                  </span>
                </div>
              ) : metrics && metrics.ratingTrends.length > 0 ? (
                chartTab === "calificaciones" ? (
                  <ResponsiveContainer
                    key={`${startDate}_${endDate}`}
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <AreaChart
                      data={metrics.ratingTrends}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorDriver"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorPassenger"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#8b5cf6"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#8b5cf6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.03)"
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => {
                          const parts = val.split("-");
                          return parts.length === 3
                            ? `${parts[2]}/${parts[1]}`
                            : val;
                        }}
                      />
                      <YAxis
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        domain={[3.5, 5.0]}
                        ticks={[3.5, 4.0, 4.5, 5.0]}
                      />
                      <Tooltip content={<CustomTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="avgDriverRating"
                        name="avgDriverRating"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorDriver)"
                      />
                      <Area
                        type="monotone"
                        dataKey="avgPassengerRating"
                        name="avgPassengerRating"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPassenger)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer
                    key={`${startDate}_${endDate}`}
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <BarChart
                      data={metrics.ratingTrends}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.03)"
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => {
                          const parts = val.split("-");
                          return parts.length === 3
                            ? `${parts[2]}/${parts[1]}`
                            : val;
                        }}
                      />
                      <YAxis
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltipContent />} />
                      <Bar
                        dataKey="reviewCount"
                        name="reviewCount"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div className="w-full h-full bg-white/5 rounded flex items-center justify-center text-slate-500">
                  <span>Sin datos de la Feedback App en este rango</span>
                </div>
              )}
            </div>
          </div>

          {/* Destination Popularity */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Destinos más Demandados</h3>
            </div>
            <div className="dest-list">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div className="dest-item animate-pulse" key={idx}>
                    <div className="h-4 bg-white/5 w-1/2 rounded mb-2" />
                    <div className="dest-bar-bg">
                      <div className="dest-bar-fill one" style={{ width: "0%" }} />
                    </div>
                  </div>
                ))
              ) : hasDestinations ? (
                destinations.map((dest, idx) => (
                  <div className="dest-item" key={idx}>
                    <div className="dest-info">
                      <span className="dest-name">{dest.name}</span>
                      <span className="dest-value">
                        {dest.count} viajes ({dest.pct}%)
                      </span>
                    </div>
                    <div className="dest-bar-bg">
                      <div
                        className={`dest-bar-fill ${dest.fillClass}`}
                        style={{ width: `${dest.pct}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 font-medium">
                  Sin datos de destinos disponibles.
                </div>
              )}
            </div>
          </div>
        </section>


          </>
        )}

        {/* Calificaciones View */}
        {activeTab === "Calificaciones" && (
          <>
            <header className="dashboard-header">
              <div className="header-title">
                <h2>Calificaciones y Reseñas</h2>
                <p>
                  Consolidación, auditoría e historial completo de calificaciones.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Back to Dashboard Button */}
                <button
                  onClick={() => setActiveTab("Dashboard")}
                  className="pill flex items-center gap-1"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                    arrow_back
                  </span>
                  Dashboard
                </button>
              </div>
            </header>

            {/* Feedback Stats Grid */}
            <section className="kpi-grid mb-6">
              {/* KPI 1 - Driver Avg Rating */}
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Calificación Conductores</span>
                  <div className="kpi-icon blue">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
                ) : metrics?.averageDriverRating != null ? (
                  <div className="kpi-value">{metrics.averageDriverRating} / 5</div>
                ) : (
                  <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>—</div>
                )}
                <div className="rating-stars mt-1 flex">
                  {metrics?.averageDriverRating != null && renderStars(metrics.averageDriverRating)}
                </div>
              </div>

              {/* KPI 2 - Passenger Avg Rating */}
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Calificación Pasajeros</span>
                  <div className="kpi-icon purple" style={{ color: "#8b5cf6", background: "rgba(139, 92, 246, 0.1)" }}>
                    <span className="material-symbols-outlined">person</span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
                ) : metrics?.averagePassengerRating != null ? (
                  <div className="kpi-value">{metrics.averagePassengerRating} / 5</div>
                ) : (
                  <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>—</div>
                )}
                <div className="rating-stars mt-1 flex">
                  {metrics?.averagePassengerRating != null && renderStars(metrics.averagePassengerRating)}
                </div>
              </div>

              {/* KPI 3 - Review Completion Rate */}
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Tasa de Respuesta</span>
                  <div className="kpi-icon green">
                    <span className="material-symbols-outlined">percent</span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
                ) : metrics?.reviewCompletionRate != null ? (
                  <div className="kpi-value">{metrics.reviewCompletionRate}%</div>
                ) : (
                  <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>—</div>
                )}
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics?.reviewCompletionRate ?? 0}%` }}
                  />
                </div>
              </div>

              {/* KPI 4 - Total Reviews */}
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Total Reseñas</span>
                  <div className="kpi-icon orange">
                    <span className="material-symbols-outlined">rate_review</span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
                ) : metrics?.totalReviews != null ? (
                  <div className="kpi-value">{metrics.totalReviews}</div>
                ) : (
                  <div className="kpi-value" style={{ color: "var(--text-muted)", fontSize: "1.2rem" }}>—</div>
                )}
                <div className="text-xs text-slate-400 mt-2 font-medium">
                  Volumen total de feedback generado
                </div>
              </div>
            </section>

            {/* Feedback Charts Grid */}
            <section className="charts-grid mb-6">
              {/* Chart 1: Rating Evolution */}
              <div className="card" style={{ minWidth: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Evolución de Calificaciones</h3>
                </div>
                <div className="chart-container">
                  {loading ? (
                    <div className="w-full h-full bg-white/5 rounded animate-pulse flex items-center justify-center">
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Cargando gráfico...</span>
                    </div>
                  ) : metrics && metrics.ratingTrends.length > 0 ? (
                    <ResponsiveContainer key={`${startDate}_${endDate}`} width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={metrics.ratingTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDriverTab" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorPassengerTab" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis
                          dataKey="date"
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            const parts = val.split("-");
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                          }}
                        />
                        <YAxis
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          domain={[3.5, 5.0]}
                          ticks={[3.5, 4.0, 4.5, 5.0]}
                        />
                        <Tooltip content={<CustomTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="avgDriverRating"
                          name="avgDriverRating"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorDriverTab)"
                        />
                        <Area
                          type="monotone"
                          dataKey="avgPassengerRating"
                          name="avgPassengerRating"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorPassengerTab)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full bg-white/5 rounded flex items-center justify-center text-slate-500">
                      <span>Sin datos de calificaciones en este rango</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Review Volume */}
              <div className="card" style={{ minWidth: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Volumen de Reseñas por Día</h3>
                </div>
                <div className="chart-container">
                  {loading ? (
                    <div className="w-full h-full bg-white/5 rounded animate-pulse flex items-center justify-center">
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Cargando gráfico...</span>
                    </div>
                  ) : metrics && metrics.ratingTrends.length > 0 ? (
                    <ResponsiveContainer key={`${startDate}_${endDate}`} width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={metrics.ratingTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis
                          dataKey="date"
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            const parts = val.split("-");
                            return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                          }}
                        />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltipContent />} />
                        <Bar
                          dataKey="reviewCount"
                          name="reviewCount"
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full bg-white/5 rounded flex items-center justify-center text-slate-500">
                      <span>Sin datos de volumen de reseñas</span>
                    </div>
                  )}
                </div>
              </div>
            </section>


          </>
        )}

        {/* Placeholder views for other sections */}
        {activeTab !== "Dashboard" && activeTab !== "Calificaciones" && (
          <div className="flex flex-col items-center justify-center py-20 card text-center">
            <span className="material-symbols-outlined text-5xl text-blue-500 mb-4 animate-bounce">
              construction
            </span>
            <h3 className="text-xl font-bold text-slate-200 mb-2">
              Sección en Construcción
            </h3>
            <p className="text-slate-400 max-w-md text-sm mb-6">
              La sección de {activeTab} se encuentra planificada para la siguiente etapa de desarrollo de la plataforma WeShuttle.
            </p>
            <button
              onClick={() => setActiveTab("Dashboard")}
              className="pill active"
            >
              Volver al Dashboard
            </button>
          </div>
        )}
      </main>

      {/* React Toast Container */}
      <div className="toast-container" id="toastContainer">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <span className="material-symbols-outlined">{toast.icon}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
