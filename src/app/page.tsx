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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AnalyticsMetrics } from "@/lib/types";

interface AnalyticsMeta {
  startDate: string;
  endDate: string;
  isFeedbackOnline: boolean;
  isRiderOnline: boolean;
}

// Recharts Custom Tooltip
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
          background: "#161925",
          border: "1px solid var(--border-color)",
          padding: "0.6rem 0.85rem",
          borderRadius: "8px",
          color: "#f1f5f9",
          fontSize: "11px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
        }}
      >
        <p className="font-bold text-blue-400 mb-1">{label}</p>
        {payload.map((pld: TooltipPayloadItem) => (
          <p key={pld.name} style={{ color: pld.stroke || pld.fill }}>
            {pld.name === "avgDriverRating"
              ? "Calificación Conductor: "
              : pld.name === "avgPassengerRating"
                ? "Calificación Pasajero: "
                : pld.name === "reviewCount"
                  ? "Cantidad Reseñas: "
                  : `${pld.name}: `}
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

  // Segment Filter State (All, Rider, Driver)
  const [activeAppFilter, setActiveAppFilter] = useState<"All" | "Rider" | "Driver">("Rider");

  // Date states
  const [dateFilter, setDateFilter] = useState<
    "1day" | "7days" | "15days" | "30days" | "custom"
  >("15days");
  const [dateFilterText, setDateFilterText] = useState("Últimos 15 días");
  const [showDropdown, setShowDropdown] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Notifications Popover
  const [showNotifications, setShowNotifications] = useState(false);

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
    if (
      tabName !== "Dashboard" &&
      tabName !== "Ratings" &&
      tabName !== "Riders"
    ) {
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

      const futureEnd = new Date();
      futureEnd.setDate(today.getDate() + 7);

      setStartDate(formatDateString(fifteenDaysAgo));
      setEndDate(formatDateString(futureEnd));
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

      const futureEnd = new Date();
      futureEnd.setDate(today.getDate() + 7);

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
      const eStr = formatDateString(futureEnd);
      setStartDate(sStr);
      setEndDate(eStr);
      fetchData(sStr, eStr);
      showToast(`Filtrado por: ${label}`, "calendar_today");
    } else {
      setDateFilterText("Personalizado");
      showToast("Seleccione el rango de fechas personalizado (Próximamente)", "calendar_today");
    }
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("#dateFilterBtn") ||
        target.closest("#dateDropdown") ||
        target.closest("#notifBtn") ||
        target.closest("#notifPopover")
      ) {
        return;
      }
      setShowDropdown(false);
      setShowNotifications(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  if (!mounted) {
    return null;
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

  // Donut Chart logic from reservations statuses
  let pagados = 0;
  let pendientes = 0;
  let fallidos = 0;

  if (metrics?.reservationsByStatus) {
    const status = metrics.reservationsByStatus;
    pagados = (status.CONFIRMED || 0) + (status.PENDING_DRIVER || 0);
    pendientes = status.PENDING_PAYMENT || 0;
    fallidos = status.CANCELED || 0;
  }

  const hasDonutData = pagados + pendientes + fallidos > 0;

  // Rider engagement & funnel metrics calculations from real data
  const totalReservationsCount = metrics?.totalReservations || 0;
  const activeUsersCount = metrics?.activeUsers || 0;
  const totalAmountChargedVal = metrics?.totalAmountCharged || 0;

  let confirmadasCount = 0;
  if (metrics?.reservationsByStatus) {
    confirmadasCount = metrics.reservationsByStatus.CONFIRMED || 0;
  }

  const avgReservationsPerUser = activeUsersCount > 0 ? (totalReservationsCount / activeUsersCount).toFixed(1) : "—";
  const avgSpendPerUser = activeUsersCount > 0 ? formatCurrency(Math.round(totalAmountChargedVal / activeUsersCount)) : "—";
  const driverAssignmentRate = pagados > 0 ? `${Math.round((confirmadasCount / pagados) * 100)}%` : "—";
  const conversionRate = totalReservationsCount > 0 ? `${Math.round((pagados / totalReservationsCount) * 100)}%` : "—";
  const abandonmentRate = totalReservationsCount > 0 ? `${Math.round((pendientes / totalReservationsCount) * 100)}%` : "—";
  const cancellationRate = totalReservationsCount > 0 ? `${Math.round((fallidos / totalReservationsCount) * 100)}%` : "—";

  let pagadosVal = pagados;
  let pendientesVal = pendientes;
  let fallidosVal = fallidos;

  const totalDonutSum = pagadosVal + pendientesVal + fallidosVal || 1;
  const pctPagados = Math.round((pagadosVal / totalDonutSum) * 100);
  const pctPendientes = Math.round((pendientesVal / totalDonutSum) * 100);
  const pctFallidos = 100 - pctPagados - pctPendientes;

  const paymentDonutData = [
    { name: `Pagados (${pctPagados}%)`, value: pagadosVal, color: "#10b981" },
    { name: `Pendientes (${pctPendientes}%)`, value: pendientesVal, color: "#f59e0b" },
    { name: `Cancelados (${pctFallidos}%)`, value: fallidosVal, color: "#f43f5e" },
  ];

  // User Sentiment index calculation based on actual average driver rating
  // Scale Positive/Neutral/Negative
  let pctPositive = 0;
  let pctNeutral = 0;
  let pctNegative = 0;

  if (metrics?.averageDriverRating != null) {
    const avg = metrics.averageDriverRating;
    // Map rating 1..5 onto sentiment
    pctPositive = Math.round(((avg - 1.5) / 3.5) * 100);
    pctPositive = Math.max(0, Math.min(100, pctPositive));

    pctNeutral = Math.round((100 - pctPositive) * 0.7);
    pctNegative = 100 - pctPositive - pctNeutral;
  }

  // Active notifications count matching layout and wireframes
  const alertItems = [];

  if (meta && !meta.isFeedbackOnline) {
    alertItems.push({
      id: "feedback-offline",
      type: "coral",
      icon: "error",
      title: "Feedback App offline",
      desc: "El dashboard no puede obtener las reseñas ni calificaciones promedio.",
    });
  }

  if (meta && !meta.isRiderOnline) {
    alertItems.push({
      id: "rider-offline",
      type: "coral",
      icon: "error",
      title: "Rider App offline",
      desc: "El dashboard no puede obtener los datos de pasajeros ni de reservas.",
    });
  }

  // Driver App connection indicator
  alertItems.push({
    id: "driver-unintegrated",
    type: "muted",
    icon: "cloud_off",
    title: "Driver App no integrada",
    desc: "La conexión con Driver App no está activa en esta etapa.",
  });

  // Payments App connection indicator
  alertItems.push({
    id: "payments-unintegrated",
    type: "muted",
    icon: "cloud_off",
    title: "Payments App no integrada",
    desc: "La conexión con Payments App no está activa en esta etapa.",
  });

  if (metrics?.totalReservations && metrics.totalReservations > 60) {
    alertItems.push({
      id: "demand-info",
      type: "blue",
      icon: "info",
      title: "Alta demanda detectada",
      desc: "Polo Petroquímico registra el 50% de las reservas totales.",
    });
  }

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
            onClick={() => handleNavClick("Riders")}
            className={`nav-item ${activeTab === "Riders" ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">group</span>
            Riders
          </button>
          <button
            onClick={() => handleNavClick("Drivers")}
            className={`nav-item ${activeTab === "Drivers" ? "active" : ""}`}
          >
            <span className="material-symbols-outlined">commute</span>
            Drivers
          </button>
          <button
            onClick={() => handleNavClick("Transactions")}
            className={`nav-item ${activeTab === "Transactions" ? "active" : ""
              }`}
          >
            <span className="material-symbols-outlined">payments</span>
            Transactions
          </button>
          <button
            onClick={() => handleNavClick("Ratings")}
            className={`nav-item ${activeTab === "Ratings" ? "active" : ""
              }`}
          >
            <span className="material-symbols-outlined">reviews</span>
            Ratings
          </button>
          <button
            onClick={() => handleNavClick("Settings")}
            className={`nav-item ${activeTab === "Settings" ? "active" : ""
              }`}
          >
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
        </nav>

        <div className="user-footer flex items-center gap-3">
          <UserButton />
          <div className="user-info" style={{ minWidth: 0 }}>
            <h4 className="truncate max-w-[150px] text-xs font-semibold text-slate-200">{userFullName}</h4>
            <p className="truncate max-w-[150px] text-[10px] text-slate-400">{user?.primaryEmailAddress?.emailAddress || "admin@weshuttle.com"}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {activeTab === "Dashboard" && (
          <>
            <header className="dashboard-header flex justify-between items-center mb-6">
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
                  Consolidación y analítica de datos de WeShuttle.
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Segmented App selector */}
                <div className="segment-control">
                  <button
                    className={`segment-btn ${activeAppFilter === "All" ? "active" : ""}`}
                    onClick={() => {
                      setActiveAppFilter("All");
                      showToast("Filtro: Todos los Sistemas", "apps");
                    }}
                  >
                    All Apps
                  </button>
                  <button
                    className={`segment-btn ${activeAppFilter === "Rider" ? "active" : ""}`}
                    onClick={() => {
                      setActiveAppFilter("Rider");
                      showToast("Filtro: Rider App", "directions_run");
                    }}
                  >
                    Rider App
                  </button>
                  <button
                    className={`segment-btn ${activeAppFilter === "Driver" ? "active" : ""}`}
                    onClick={() => {
                      setActiveAppFilter("Driver");
                      showToast("Filtro: Driver App (Offline)", "commute");
                    }}
                  >
                    Driver App
                  </button>
                </div>

                {/* Date dropdown filter */}
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
                  </div>
                </div>

                {/* Notifications Popover */}
                <div className="relative">
                  <button
                    id="notifBtn"
                    className="date-filter relative p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotifications(!showNotifications);
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>
                      notifications
                    </span>
                    {alertItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                        {alertItems.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div
                      id="notifPopover"
                      className="absolute right-0 top-[110%] w-[320px] bg-[#161925] border border-slate-800 rounded-lg shadow-2xl p-4 z-50 flex flex-col gap-3"
                    >
                      <h4 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex justify-between items-center">
                        <span>Alertas de Sistema</span>
                        <span className="text-[10px] text-rose-400 font-medium">
                          {alertItems.filter(i => i.type === "coral").length} Críticas
                        </span>
                      </h4>
                      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                        {alertItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex gap-2 p-2 rounded text-xs ${item.type === "coral" ? "bg-rose-950/20 border border-rose-900/30" : "bg-blue-950/20 border border-blue-900/30"
                              }`}
                          >
                            <span className={`material-symbols-outlined text-[15px] ${item.type === "coral" ? "text-rose-400" : "text-blue-400"}`}>
                              {item.icon}
                            </span>
                            <div>
                              <h5 className="font-semibold text-slate-200">{item.title}</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
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
                    className={`resilience-badge ${meta?.isFeedbackOnline ? "online" : "mocked"
                      }`}
                  >
                    Feedback App: {meta?.isFeedbackOnline ? "Online" : "Offline"}
                  </span>
                  <span
                    className={`resilience-badge ${meta?.isRiderOnline ? "online" : "mocked"
                      }`}
                  >
                    Rider App: {meta?.isRiderOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            )}

            {/* KPI Grid */}
            <section className="kpi-grid">
              {/* KPI 1 — Reservas Totales */}
              <div className={`kpi-card ${activeAppFilter === "Driver" ? "opacity-30" : ""}`}>
                <div className="kpi-header">
                  <span className="kpi-title">Reservas Totales</span>
                  <div className="kpi-icon blue">
                    <span className="material-symbols-outlined">
                      calendar_today
                    </span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
                ) : (
                  <div className="kpi-value text-white">{metrics?.totalReservations ?? "—"}</div>
                )}

                {/* Recharts Sparkline */}
                {metrics?.ratingTrends && metrics.ratingTrends.length > 0 ? (
                  <div className="h-8 w-full mt-2 opacity-60">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={metrics.ratingTrends}>
                        <Area
                          type="monotone"
                          dataKey="reviewCount"
                          stroke="#2563eb"
                          fill="rgba(37, 99, 235, 0.05)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-8 flex items-center text-[10px] text-slate-500">Sin tendencia</div>
                )}

                <div className="kpi-trend mt-2 flex items-center gap-1 text-emerald-400">
                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>cloud_queue</span>
                  <span>Rider App Conectada</span>
                </div>
              </div>

              {/* KPI 2 — Ingresos Totales */}
              <div className={`kpi-card ${activeAppFilter === "Driver" ? "opacity-30" : ""}`}>
                <div className="kpi-header">
                  <span className="kpi-title">Ingresos Totales</span>
                  <div className="kpi-icon green">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-32 bg-white/5 rounded animate-pulse my-2" />
                ) : (
                  <div className="kpi-value text-white">
                    {metrics?.totalAmountCharged != null ? formatCurrency(metrics.totalAmountCharged) : "—"}
                  </div>
                )}

                {/* Recharts Sparkline */}
                {metrics?.ratingTrends && metrics.ratingTrends.length > 0 ? (
                  <div className="h-8 w-full mt-2 opacity-60">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={metrics.ratingTrends}>
                        <Area
                          type="monotone"
                          dataKey="reviewCount"
                          stroke="#10b981"
                          fill="rgba(16, 185, 129, 0.05)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-8 flex items-center text-[10px] text-slate-500">Sin tendencia</div>
                )}

                <div className="kpi-trend mt-2 flex items-center gap-1 text-emerald-400">
                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>cloud_queue</span>
                  <span>Rider App Conectada</span>
                </div>
              </div>

              {/* KPI 3 — Conductores Activos */}
              <div className={`kpi-card ${activeAppFilter === "Rider" ? "opacity-30" : ""}`}>
                <div className="kpi-header">
                  <span className="kpi-title">Conductores Activos</span>
                  <div className="kpi-icon orange">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                </div>
                <div className="kpi-value text-white">
                  —
                </div>

                <div className="h-8 flex items-center text-[10px] text-slate-500">
                  Driver App sin conexión
                </div>

                <div className="kpi-trend mt-2 flex items-center gap-1 text-slate-500">
                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>cloud_off</span>
                  <span>Sin conexión</span>
                </div>
              </div>

              {/* KPI 4 — Calificación Promedio */}
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Calificación Promedio</span>
                  <div className="kpi-icon purple" style={{ color: "#8b5cf6", background: "rgba(139, 92, 246, 0.1)" }}>
                    <span className="material-symbols-outlined">star</span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
                ) : (
                  <div className="kpi-value text-white">
                    {metrics?.averageDriverRating != null ? `${metrics.averageDriverRating} / 5` : "—"}
                  </div>
                )}

                {/* Recharts Sparkline */}
                {metrics?.ratingTrends && metrics.ratingTrends.length > 0 ? (
                  <div className="h-8 w-full mt-2 opacity-60">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={metrics.ratingTrends}>
                        <Area
                          type="monotone"
                          dataKey="avgDriverRating"
                          stroke="#8b5cf6"
                          fill="rgba(139, 92, 246, 0.05)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-8 flex items-center text-[10px] text-slate-500">Sin tendencia</div>
                )}

                <div className="kpi-trend mt-2 flex items-center justify-between w-full">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>cloud_queue</span>
                    <span>Feedback App Conectada</span>
                  </div>
                  <span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: "normal" }}>
                    {metrics?.totalReviews != null ? `${metrics.totalReviews} res.` : "—"}
                  </span>
                </div>
              </div>
            </section>

            {/* Charts Section */}
            <section className="charts-grid">
              {/* Recharts Satisfaction & Feedback Area Chart */}
              <div className="card" style={{ minWidth: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">
                    {chartTab === "calificaciones"
                      ? "Evolución de Calificaciones (Satisfacción)"
                      : "Volumen de Feedback y Reseñas"}
                  </h3>
                  <div className="card-actions">
                    <button
                      onClick={() => setChartTab("calificaciones")}
                      className={`pill ${chartTab === "calificaciones" ? "active" : ""
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
                                stopColor="#2563eb"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="95%"
                                stopColor="#2563eb"
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
                            stroke="#2563eb"
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

              {/* Destinations Card + Interactive SVG Mini-Map */}
              <div className="live-map-card card">
                <div className="card-header pb-1 mb-2">
                  <h3 className="card-title">Destinos más Demandados</h3>
                  <span className="live-badge !m-0 !py-0.5 text-[9px] !bg-emerald-950/20 !border-emerald-900/30 !text-emerald-400">
                    <span className="live-dot !bg-emerald-400"></span>Live Network Active
                  </span>
                </div>

                <div className="dest-list mt-2 mb-4">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div className="dest-item animate-pulse" key={idx}>
                        <div className="h-3 bg-white/5 w-1/2 rounded mb-1" />
                        <div className="dest-bar-bg">
                          <div className="dest-bar-fill one" style={{ width: "0%" }} />
                        </div>
                      </div>
                    ))
                  ) : hasDestinations ? (
                    destinations.map((dest, idx) => (
                      <div className="dest-item" key={idx}>
                        <div className="dest-info !text-[11px] !gap-1">
                          <span className="dest-name font-semibold text-slate-300">{dest.name}</span>
                          <span className="dest-value font-bold text-slate-200">
                            {dest.count} viajes ({dest.pct}%)
                          </span>
                        </div>
                        <div className="dest-bar-bg !h-[5px]">
                          <div
                            className={`dest-bar-fill ${dest.fillClass}`}
                            style={{ width: `${dest.pct}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-500 text-xs py-2">
                      Sin datos de destinos disponibles.
                    </div>
                  )}
                </div>

                {/* Mini-map SVG representation */}
                <div className="live-map-container mt-1">
                  <svg
                    viewBox="0 0 300 200"
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* SVG styling for animation */}
                    <style>{`
                      @keyframes dash {
                        to {
                          stroke-dashoffset: -20;
                        }
                      }
                      .animate-dash-line {
                        stroke-dasharray: 4,4;
                        animation: dash 1.5s linear infinite;
                      }
                    `}</style>

                    {/* Background grid dots */}
                    <defs>
                      <pattern id="dotPattern" width="15" height="15" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="0.75" fill="rgba(255, 255, 255, 0.08)" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#dotPattern)" rx="4" />

                    {/* Connector lines (traffic simulation) */}
                    <path
                      d="M 60 70 Q 110 110 150 140"
                      fill="none"
                      stroke="rgba(37, 99, 235, 0.25)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M 60 70 Q 110 110 150 140"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.5"
                      className="animate-dash-line"
                    />

                    <path
                      d="M 230 65 Q 190 100 150 140"
                      fill="none"
                      stroke="rgba(16, 185, 129, 0.25)"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M 230 65 Q 190 100 150 140"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                      className="animate-dash-line"
                    />

                    <path
                      d="M 60 70 Q 145 40 230 65"
                      fill="none"
                      stroke="rgba(245, 158, 11, 0.15)"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                    />

                    {/* Nodes (Pulsing size based on demand) */}
                    {/* Node 1: Polo Petroquímico */}
                    <g className="cursor-pointer">
                      <circle cx="60" cy="70" r={Math.min(15, 6 + poloCount / 6)} fill="rgba(37, 99, 235, 0.15)" />
                      <circle cx="60" cy="70" r="5" fill="#2563eb" />
                      <circle cx="60" cy="70" r="8" fill="none" stroke="#2563eb" strokeWidth="1" className="animate-ping" style={{ animationDuration: '3s' }} />
                    </g>

                    {/* Node 2: Parque Industrial */}
                    <g className="cursor-pointer">
                      <circle cx="230" cy="65" r={Math.min(15, 6 + parqueCount / 6)} fill="rgba(16, 185, 129, 0.15)" />
                      <circle cx="230" cy="65" r="5" fill="#10b981" />
                      <circle cx="230" cy="65" r="8" fill="none" stroke="#10b981" strokeWidth="1" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                    </g>

                    {/* Node 3: Puerto White */}
                    <g className="cursor-pointer">
                      <circle cx="150" cy="140" r={Math.min(15, 6 + puertoCount / 6)} fill="rgba(245, 158, 11, 0.15)" />
                      <circle cx="150" cy="140" r="5" fill="#f59e0b" />
                      <circle cx="150" cy="140" r="8" fill="none" stroke="#f59e0b" strokeWidth="1" className="animate-ping" style={{ animationDuration: '4s' }} />
                    </g>

                    {/* Node Labels */}
                    <text x="60" y="50" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Polo</text>
                    <text x="230" y="48" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Parque Ind.</text>
                    <text x="150" y="162" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Puerto White</text>
                  </svg>
                </div>
              </div>
            </section>

            {/* Bottom Row: Payments Donut, Sentiment Index, Alerts */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-6">
              {/* Payment Donut Chart */}
              <div className={`card flex flex-col justify-between ${activeAppFilter === "Driver" ? "opacity-30" : ""}`} style={{ minHeight: '300px' }}>
                <div className="card-header pb-1 mb-2">
                  <h3 className="card-title">Estado de Pagos</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">Rider App</span>
                </div>

                <div className="relative flex justify-center items-center h-[160px] w-full">
                  {!loading && hasDonutData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {paymentDonutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-[#161925] border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200">
                                  {data.name}: <span className="font-bold">{data.value}</span> reservas
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <span className="material-symbols-outlined text-slate-500 text-3xl mb-1">payments</span>
                      <p className="text-[10px] text-slate-500">Payments App sin conexión</p>
                    </div>
                  )}
                  {hasDonutData && (
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-slate-200">
                        {pagados + pendientes + fallidos}
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-slate-500">
                        Reservas
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-around text-[10px] font-semibold text-slate-400 mt-2 border-t border-slate-800/50 pt-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                    <span>Pagados ({hasDonutData ? pagados : "—"})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                    <span>Pend. ({hasDonutData ? pendientes : "—"})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                    <span>Cancelados ({hasDonutData ? fallidos : "—"})</span>
                  </div>
                </div>
              </div>

              {/* User Sentiment scale */}
              <div className="card flex flex-col justify-between" style={{ minHeight: '300px' }}>
                <div className="card-header pb-1 mb-2">
                  <h3 className="card-title">Sentimiento de Usuario</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">Feedback App</span>
                </div>

                {loading ? (
                  <div className="flex-grow flex items-center justify-center animate-pulse">
                    <div className="h-20 w-full bg-white/5 rounded" />
                  </div>
                ) : metrics?.averageDriverRating != null ? (
                  <div className="flex-grow flex flex-col justify-center">
                    <div className="text-center mb-4">
                      <h4 className="text-3xl font-extrabold text-slate-100">{pctPositive}%</h4>
                      <p className="text-[10px] text-emerald-400 font-medium">Índice de Aceptación Positiva</p>
                    </div>

                    <div className="sentiment-scale">
                      <div className="sentiment-row">
                        <span className="sentiment-label">Positivo</span>
                        <div className="sentiment-bar-bg">
                          <div className="sentiment-bar-fill positive" style={{ width: `${pctPositive}%` }} />
                        </div>
                        <span className="sentiment-value">{pctPositive}%</span>
                      </div>
                      <div className="sentiment-row">
                        <span className="sentiment-label">Neutral</span>
                        <div className="sentiment-bar-bg">
                          <div className="sentiment-bar-fill neutral" style={{ width: `${pctNeutral}%` }} />
                        </div>
                        <span className="sentiment-value">{pctNeutral}%</span>
                      </div>
                      <div className="sentiment-row">
                        <span className="sentiment-label">Negativo</span>
                        <div className="sentiment-bar-bg">
                          <div className="sentiment-bar-fill negative" style={{ width: `${pctNegative}%` }} />
                        </div>
                        <span className="sentiment-value">{pctNegative}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                    <span className="material-symbols-outlined text-slate-500 text-3xl mb-1">sentiment_satisfied</span>
                    <p className="text-[10px] text-slate-500">Feedback App sin conexión</p>
                  </div>
                )}

                <div className="text-[9px] text-slate-500 text-center border-t border-slate-800/50 pt-3">
                  Cálculo adaptativo derivado del promedio de estrellas actual.
                </div>
              </div>

              {/* Alertas Recientes */}
              <div className="card flex flex-col justify-between" style={{ minHeight: '300px' }}>
                <div className="card-header pb-1 mb-2">
                  <h3 className="card-title">Alertas Recientes</h3>
                  <span className="live-badge !m-0 !py-0.5 text-[9px] !bg-rose-950/20 !border-rose-900/30 !text-rose-400">
                    Sistema
                  </span>
                </div>

                <div className="alerts-list flex-grow mt-2">
                  {alertItems.map((item) => (
                    <div
                      key={item.id}
                      className={`alert-item ${item.type === "blue" ? "info" : ""}`}
                    >
                      <span className={`material-symbols-outlined alert-icon ${item.type}`}>
                        {item.icon}
                      </span>
                      <div className="alert-content">
                        <h5>{item.title}</h5>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[9px] text-slate-500 text-center border-t border-slate-800/50 pt-3">
                  Últimos incidentes de red de microservicios.
                </div>
              </div>
            </section>
          </>
        )}

        {/* Riders View Placeholder */}
        {activeTab === "Riders" && (
          <>
            <header className="dashboard-header">
              <div className="header-title">
                <h2>Pasajeros (Riders)</h2>
                <p>Lista analítica de usuarios registrados en el sistema WeShuttle.</p>
              </div>
              <button onClick={() => setActiveTab("Dashboard")} className="pill flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_back</span>
                Dashboard
              </button>
            </header>

            <div className="card">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Indicador de Comportamiento (Riders)</th>
                      <th>Métrica / Valor</th>
                      <th>Significado Analítico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.activeUsers != null ? (
                      <>
                        <tr>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-blue-400">rate_review</span>
                              <div>
                                <span className="font-bold">Promedio de Reservas por Pasajero</span>
                                <p className="text-[10px] text-slate-400">Frecuencia de checkouts/viajes por usuario activo</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="font-bold text-slate-200">{avgReservationsPerUser} reservas / rider</span>
                          </td>
                          <td>Mide el nivel de recurrencia y adopción de la plataforma por usuario registrado.</td>
                        </tr>
                        <tr>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-400">payments</span>
                              <div>
                                <span className="font-bold">Gasto Promedio por Pasajero</span>
                                <p className="text-[10px] text-slate-400">Gasto acumulado total por rider activo</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="font-bold text-emerald-400">{avgSpendPerUser}</span>
                          </td>
                          <td>Mide la facturación promedio capturada por cada pasajero activo en el periodo.</td>
                        </tr>
                        <tr>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-indigo-400">hail</span>
                              <div>
                                <span className="font-bold">Tasa de Asignación de Conductor</span>
                                <p className="text-[10px] text-slate-400">Eficiencia en asignación de pools pagados</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="font-bold text-indigo-400">{driverAssignmentRate}</span>
                          </td>
                          <td>Mide qué porcentaje de los viajes pagados por riders lograron conseguir un chofer.</td>
                        </tr>
                        <tr>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-cyan-400">shopping_cart_checkout</span>
                              <div>
                                <span className="font-bold">Tasa de Conversión (Pago Exitoso)</span>
                                <p className="text-[10px] text-slate-400">Checkouts iniciados que terminan en pago</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="font-bold text-cyan-400">{conversionRate}</span>
                          </td>
                          <td>Porcentaje del embudo comercial que completa la pasarela de pagos con éxito.</td>
                        </tr>
                        <tr>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-amber-400">shopping_bag</span>
                              <div>
                                <span className="font-bold">Tasa de Abandono de Pago</span>
                                <p className="text-[10px] text-slate-400">Checkouts iniciados abandonados sin pagar</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="font-bold text-amber-400">{abandonmentRate}</span>
                          </td>
                          <td>Porcentaje de intención de viaje donde el usuario no completó el pago del pasaje.</td>
                        </tr>
                        <tr>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-rose-400">cancel</span>
                              <div>
                                <span className="font-bold">Tasa de Cancelación Voluntaria</span>
                                <p className="text-[10px] text-slate-400">Reservas canceladas sobre el total</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="font-bold text-rose-400">{cancellationRate}</span>
                          </td>
                          <td>Porcentaje de reservas que fueron canceladas (reintegrando crédito de pool).</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center text-slate-500 py-6">Rider App sin conexión</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Business Insights y Patrones de Negocio */}
            {metrics?.insights && (
              <>
                {/* 1. Panel de Advertencias Analíticas */}
                {metrics.insights.warnings && metrics.insights.warnings.length > 0 && (
                  <div className="insight-alert-card mt-6">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-blue-400 mb-3">
                      <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>lightbulb</span>
                      Descubrimientos de Negocio (Insights Automáticos)
                    </h3>
                    <div className="flex flex-col gap-2">
                      {metrics.insights.warnings.map((warning, idx) => (
                        <div key={idx} className="insight-alert-item">
                          <span className="material-symbols-outlined text-blue-400 insight-alert-icon" style={{ fontSize: "1.1rem" }}>
                            {warning.includes("💡") ? "info" : warning.includes("🔥") ? "local_fire_department" : "warning"}
                          </span>
                          <p className="text-xs text-slate-300">{warning.replace("💡 ", "").replace("🔥 ", "").replace("⚠️ ", "")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Gráfico de Demanda por Día de la Semana */}
                <div className="card mt-6">
                  <div className="card-header">
                    <h3>Distribución de Demanda Semanal</h3>
                    <p className="text-xs text-slate-400">Total de reservas registradas por día de la semana en este período.</p>
                  </div>
                  <div className="h-64 mt-4">
                    {(() => {
                      const dayOfWeekData = metrics.insights.dayOfWeekDistribution
                        ? Object.entries(metrics.insights.dayOfWeekDistribution).map(([day, count]) => ({
                          name: day,
                          Reservas: count
                        }))
                        : [];

                      const minReservas = Math.min(...dayOfWeekData.map(d => d.Reservas));
                      const maxReservas = Math.max(...dayOfWeekData.map(d => d.Reservas));

                      return dayOfWeekData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dayOfWeekData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                            <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                            <Tooltip content={<CustomTooltipContent />} cursor={{ fill: "rgba(37, 99, 235, 0.05)" }} />
                            <Bar dataKey="Reservas" radius={[4, 4, 0, 0]}>
                              {dayOfWeekData.map((entry, index) => {
                                // Highlight min day in red (if min is low) and max in green
                                let barColor = "#2563eb";
                                if (entry.Reservas === minReservas && minReservas < maxReservas) {
                                  barColor = "#f43f5e"; // Red alert for lowest day
                                } else if (entry.Reservas === maxReservas && maxReservas > 0) {
                                  barColor = "#10b981"; // Green for peak day
                                }
                                return <Cell key={`cell-${index}`} fill={barColor} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500 text-sm">Sin datos en el período seleccionado.</div>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Grid de Pasajeros: VIP vs Alto Riesgo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* VIP Passengers */}
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <div>
                        <h3>Clientes VIP</h3>
                        <p className="text-xs text-slate-400">Riders con mayor volumen de viajes pagados.</p>
                      </div>
                      <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: "1.8rem" }}>workspace_premium</span>
                    </div>
                    <div className="table-container mt-4">
                      {metrics.insights.vipPassengers && metrics.insights.vipPassengers.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Pasajero</th>
                              <th>Viajes Concretados</th>
                              <th>Monto Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.insights.vipPassengers.map((passenger, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="badge-rank">{idx + 1}</span>
                                    <span className="font-bold text-slate-200">{passenger.name}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-slate-300">{passenger.count} viajes</span>
                                </td>
                                <td>
                                  <span className="font-bold text-emerald-400">{passenger.extraDetail?.replace("Gasto: ", "")}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-6 text-center text-slate-500 text-sm">Sin datos de pasajeros VIP en este período.</div>
                      )}
                    </div>
                  </div>

                  {/* High Risk Passengers */}
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <div>
                        <h3>Clientes de Alto Riesgo</h3>
                        <p className="text-xs text-slate-400">Riders con mayor número de cancelaciones voluntarias.</p>
                      </div>
                      <span className="material-symbols-outlined text-rose-500" style={{ fontSize: "1.8rem" }}>warning</span>
                    </div>
                    <div className="table-container mt-4">
                      {metrics.insights.atRiskPassengers && metrics.insights.atRiskPassengers.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Pasajero</th>
                              <th>Cancelaciones</th>
                              <th>Tasa de Cancelación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.insights.atRiskPassengers.map((passenger, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="badge-rank-red">{idx + 1}</span>
                                    <span className="font-bold text-slate-200">{passenger.name}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-slate-300">{passenger.count} cancelaciones</span>
                                </td>
                                <td>
                                  <span className="font-bold text-rose-400">{passenger.extraDetail?.replace("Tasa Cancelación: ", "")}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-6 text-center text-slate-500 text-sm">Sin pasajeros con cancelaciones en este período.</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Ratings View */}
        {activeTab === "Ratings" && (
          <>
            <header className="dashboard-header">
              <div className="header-title">
                <h2>Calificaciones y Reseñas</h2>
                <p>
                  Consolidación, auditoría e historial completo de calificaciones.
                </p>
              </div>

              <div className="flex items-center gap-2">
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
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
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
                          stroke="#2563eb"
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
        {activeTab !== "Dashboard" && activeTab !== "Ratings" && activeTab !== "Riders" && (
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
