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
  isDriverOnline?: boolean;
  isPaymentsOnline?: boolean;
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
  showDriver = true,
  showPassenger = true,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  showDriver?: boolean;
  showPassenger?: boolean;
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
        {payload.map((pld: TooltipPayloadItem) => {
          const isDriver = pld.name === "avgDriverRating";
          const isPassenger = pld.name === "avgPassengerRating";
          const isDimmed = (isDriver && !showDriver) || (isPassenger && !showPassenger);
          return (
            <p
              key={pld.name}
              style={{
                color: pld.stroke || pld.fill,
                opacity: isDimmed ? 0.35 : 1,
                textDecoration: isDimmed ? "line-through" : "none",
              }}
            >
              {pld.name === "avgDriverRating"
                ? "Calificación Conductor: "
                : pld.name === "avgPassengerRating"
                  ? "Calificación Pasajero: "
                  : pld.name === "reviewCount"
                    ? "Cantidad Reseñas: "
                    : `${pld.name}: `}
              {pld.value}
            </p>
          );
        })}
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

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Segment Filter State (All, Rider, Driver, Payments)
  const [activeAppFilter, setActiveAppFilter] = useState<"All" | "Rider" | "Driver" | "Payments">("All");

  // Date states
  const [dateFilter, setDateFilter] = useState<
    "1day" | "7days" | "15days" | "30days" | "90days" | "all" | "custom"
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

  // Chart series visibility toggles
  const [showDriverTrend, setShowDriverTrend] = useState(true);
  const [showPassengerTrend, setShowPassengerTrend] = useState(true);

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
      tabName !== "Riders" &&
      tabName !== "Drivers" &&
      tabName !== "Settings"
    ) {
      showToast(`Cargando sección de ${tabName}... (Próximamente)`, "dns");
    }
  };

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
      showToast("Modo Claro activado", "light_mode");
    } else {
      document.documentElement.classList.remove("light");
      showToast("Modo Oscuro activado", "dark_mode");
    }
  };

  // Load and apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    }
  }, []);


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
    type: "1day" | "7days" | "15days" | "30days" | "90days" | "all" | "custom"
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
      } else if (type === "90days") {
        newStart.setDate(today.getDate() - 90);
        label = "Últimos 3 meses";
      } else if (type === "all") {
        newStart.setFullYear(2025, 0, 1); // January 1, 2025
        label = "Todos";
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
  if (meta && !meta.isDriverOnline) {
    alertItems.push({
      id: "driver-offline",
      type: "coral",
      icon: "error",
      title: "Driver App offline",
      desc: "El dashboard no puede obtener los datos de pools, conductores ni de vehículos.",
    });
  }

  // Payments App connection indicator
  if (meta && !meta.isPaymentsOnline) {
    alertItems.push({
      id: "payments-offline",
      type: "coral",
      icon: "error",
      title: "Payments App offline",
      desc: "El dashboard no puede obtener los datos financieros ni transacciones.",
    });
  }

  // Decision Signals from Payments App
  if (metrics?.payments?.decisionSignals) {
    metrics.payments.decisionSignals.forEach((signal, idx) => {
      alertItems.push({
        id: `payment-signal-${idx}`,
        type: signal.severity === "critical" || signal.severity === "warning" ? "coral" : "blue",
        icon: signal.severity === "critical" || signal.severity === "warning" ? "warning" : "info",
        title: signal.title,
        desc: signal.message,
      });
    });
  }

  // Cross-Module Insights
  const completedPools = metrics?.driver?.poolsByStatus?.COMPLETED || 0;
  const pendingAmount = metrics?.payments?.settlementsPendingAmount || 0;
  if (completedPools > 0 && pendingAmount > 0) {
    alertItems.push({
      id: "cross-driver-payments",
      type: "coral",
      icon: "gavel",
      title: "Liquidaciones Pendientes",
      desc: `Hay ${completedPools} viajes finalizados pero quedan ${formatCurrency(pendingAmount)} retenidos por transferir a los choferes.`,
    });
  }

  const rejectionRate = metrics?.payments?.paymentRejectionRate || 0;
  const hasCriticalReviews = metrics?.worstReviews && metrics.worstReviews.length > 0;
  if (rejectionRate > 5 && hasCriticalReviews) {
    alertItems.push({
      id: "cross-feedback-payments",
      type: "blue",
      icon: "report_problem",
      title: "Correlación de Fallas de Pago",
      desc: `La tasa de rechazo es del ${rejectionRate}%. Existe una posible correlación con comentarios negativos en la Feedback App.`,
    });
  }

  const totalPaidReservations = (metrics?.reservationsByStatus?.CONFIRMED || 0) + (metrics?.reservationsByStatus?.PENDING_DRIVER || 0);
  const totalRev = metrics?.payments?.totalRevenue || 0;
  if (totalRev > 0 && totalPaidReservations > 0) {
    const avgSeatRevenue = Math.round(totalRev / totalPaidReservations);
    alertItems.push({
      id: "cross-rider-payments",
      type: "blue",
      icon: "analytics",
      title: "Rendimiento por Asiento",
      desc: `El valor de ingreso promedio por asiento pagado es de ${formatCurrency(avgSeatRevenue)}.`,
    });
  }

  if (metrics?.totalReservations && metrics.totalReservations > 60) {
    alertItems.push({
      id: "demand-info",
      type: "blue",
      icon: "info",
      title: "Alta demanda detectada",
      desc: "Polo Petroquímico registra el 50% de las reservas totales.",
    });
  }

  // Filter alert items dynamically based on selected app filter
  const filteredAlertItems = alertItems.filter((item) => {
    if (activeAppFilter === "All") return true;
    if (activeAppFilter === "Rider") {
      return (
        item.id === "rider-offline" ||
        item.id === "demand-info" ||
        item.id === "cross-rider-payments"
      );
    }
    if (activeAppFilter === "Driver") {
      return (
        item.id === "driver-offline" ||
        item.id === "cross-driver-payments"
      );
    }
    if (activeAppFilter === "Payments") {
      return (
        item.id === "payments-offline" ||
        item.id?.startsWith("payment-signal-") ||
        item.id === "cross-driver-payments" ||
        item.id === "cross-feedback-payments" ||
        item.id === "cross-rider-payments"
      );
    }
    return false;
  });

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
  const someOffline = meta && (!meta.isFeedbackOnline || !meta.isRiderOnline || !meta.isDriverOnline || !meta.isPaymentsOnline);

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
                      showToast(`Filtro: Driver App ${meta?.isDriverOnline ? "(Online)" : "(Offline)"}`, "commute");
                    }}
                  >
                    Driver App
                  </button>
                  <button
                    className={`segment-btn ${activeAppFilter === "Payments" ? "active" : ""}`}
                    onClick={() => {
                      setActiveAppFilter("Payments");
                      showToast(`Filtro: Payments App ${meta?.isPaymentsOnline ? "(Online)" : "(Offline)"}`, "payments");
                    }}
                  >
                    Payments App
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
                    <button
                      className="dropdown-item"
                      onClick={() => handleRangeSelect("90days")}
                    >
                      Últimos 3 meses
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => handleRangeSelect("all")}
                    >
                      Todos
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
                  <span
                    className={`resilience-badge ${meta?.isDriverOnline ? "online" : "mocked"
                      }`}
                  >
                    Driver App: {meta?.isDriverOnline ? "Online" : "Offline"}
                  </span>
                  <span
                    className={`resilience-badge ${meta?.isPaymentsOnline ? "online" : "mocked"
                      }`}
                  >
                    Payments App: {meta?.isPaymentsOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            )}

            <section className="kpi-grid">
              {/* KPI 1 — Reservas Totales */}
              <div className={`kpi-card ${activeAppFilter === "Driver" || activeAppFilter === "Payments" ? "opacity-30" : ""}`}>
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
              <div className={`kpi-card ${activeAppFilter === "Driver" || activeAppFilter === "Rider" ? "opacity-30" : ""}`}>
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
                    {metrics?.payments?.totalRevenue != null
                      ? formatCurrency(metrics.payments.totalRevenue)
                      : metrics?.totalAmountCharged != null
                        ? formatCurrency(metrics.totalAmountCharged)
                        : "—"}
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
              <div className={`kpi-card ${activeAppFilter === "Rider" || activeAppFilter === "Payments" ? "opacity-30" : ""}`}>
                <div className="kpi-header">
                  <span className="kpi-title">Conductores Activos</span>
                  <div className="kpi-icon orange">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded animate-pulse my-2" />
                ) : metrics?.driver != null ? (
                  <div className="kpi-value text-white">
                    {metrics.driver.activeVehiclesCount != null ? metrics.driver.activeVehiclesCount : (metrics.driver.activeVehicles != null ? metrics.driver.activeVehicles : "—")}
                  </div>
                ) : (
                  <div className="kpi-value text-white">
                    —
                  </div>
                )}

                {loading ? (
                  <div className="h-8 flex items-center w-full bg-white/5 rounded animate-pulse" />
                ) : metrics?.driver?.poolsDistributionByDay && Object.keys(metrics.driver.poolsDistributionByDay).length > 0 ? (
                  <div className="h-8 mt-2 w-full opacity-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Object.entries(metrics.driver.poolsDistributionByDay).map(([day, count]) => ({ day, count }))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="#f97316"
                          fill="rgba(249, 115, 22, 0.05)"
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-8 flex items-center text-[10px] text-slate-500">
                    {metrics?.driver != null ? "Sin tendencia" : "Driver App sin conexión"}
                  </div>
                )}

                <div className={`kpi-trend mt-2 flex items-center gap-1 ${metrics?.driver != null ? "text-orange-400" : "text-slate-500"}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{metrics?.driver != null ? "cloud_queue" : "cloud_off"}</span>
                  <span>{metrics?.driver != null ? "Driver App Conectada" : "Sin conexión"}</span>
                </div>
              </div>

              {/* KPI 4 — Calificación Promedio */}
              <div className={`kpi-card ${activeAppFilter === "Payments" ? "opacity-30" : ""}`}>
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

            {/* Consolidated Business Insights (Insights Automáticos) at the top of Dashboard */}
            {filteredAlertItems.length > 0 && (
              <div className="insight-alert-card mb-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-400 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>lightbulb</span>
                  {activeAppFilter === "All"
                    ? "Descubrimientos de Negocio (Insights Automáticos Consolidados)"
                    : activeAppFilter === "Payments"
                      ? "Descubrimientos de Negocio (Insights Automáticos - Payments App)"
                      : activeAppFilter === "Rider"
                        ? "Descubrimientos de Negocio (Insights Automáticos - Rider App)"
                        : "Descubrimientos de Negocio (Insights Automáticos - Driver App)"
                  }
                </h3>
                <div className="flex flex-col gap-2">
                  {filteredAlertItems.map((item, idx) => (
                    <div key={idx} className="insight-alert-item">
                      <span className={`material-symbols-outlined insight-alert-icon ${
                        item.type === "coral" ? "text-rose-400" : "text-blue-400"
                      }`} style={{ fontSize: "1.1rem" }}>
                        {item.icon === "error" || item.icon === "warning" || item.icon === "report_problem" ? "warning" : item.icon === "gavel" ? "gavel" : "info"}
                      </span>
                      <p className="text-xs text-slate-300">
                        <strong className="text-slate-200">{item.title}: </strong>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts Section */}
            {(activeAppFilter === "Rider" || activeAppFilter === "All") && (
              <>
                {activeAppFilter === "All" && (
                  <div className="col-span-full mt-4 mb-4">
                    <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500">directions_run</span>
                      Métricas Comerciales y de Reputación (Rider/Feedback Apps)
                    </h3>
                  </div>
                )}
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

                    {!loading && metrics && metrics.ratingTrends.length > 0 && chartTab === "calificaciones" && (
                      <div className="flex items-center gap-3 mb-4 text-xs px-1 select-none">
                        <span className="text-slate-400 mr-3">Filtrar curvas:</span>
                        <button
                          onClick={() => setShowDriverTrend(!showDriverTrend)}
                          className="flex items-center gap-2 rounded-md border transition-all cursor-pointer"
                          style={{
                            borderColor: showDriverTrend ? '#2563eb' : 'rgba(37, 99, 235, 0.15)',
                            backgroundColor: showDriverTrend ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                            color: showDriverTrend ? '#60a5fa' : 'var(--text-muted)',
                            opacity: showDriverTrend ? 1 : 0.45,
                            padding: '6px 16px',
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2563eb' }}></span>
                          Conductores
                        </button>
                        <button
                          onClick={() => setShowPassengerTrend(!showPassengerTrend)}
                          className="flex items-center gap-2 rounded-md border transition-all cursor-pointer"
                          style={{
                            borderColor: showPassengerTrend ? '#8b5cf6' : 'rgba(139, 92, 246, 0.15)',
                            backgroundColor: showPassengerTrend ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            color: showPassengerTrend ? '#a78bfa' : 'var(--text-muted)',
                            opacity: showPassengerTrend ? 1 : 0.45,
                            padding: '6px 16px',
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>
                          Pasajeros
                        </button>
                      </div>
                    )}

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
                              <Tooltip content={<CustomTooltipContent showDriver={showDriverTrend} showPassenger={showPassengerTrend} />} isAnimationActive={false} />
                              <Area
                                type="monotone"
                                dataKey="avgDriverRating"
                                name="avgDriverRating"
                                stroke={showDriverTrend ? "#2563eb" : "rgba(37, 99, 235, 0.12)"}
                                strokeWidth={showDriverTrend ? 3 : 1.2}
                                fillOpacity={showDriverTrend ? 1 : 0.02}
                                fill="url(#colorDriver)"
                              />
                              <Area
                                type="monotone"
                                dataKey="avgPassengerRating"
                                name="avgPassengerRating"
                                stroke={showPassengerTrend ? "#8b5cf6" : "rgba(139, 92, 246, 0.12)"}
                                strokeWidth={showPassengerTrend ? 3 : 1.2}
                                fillOpacity={showPassengerTrend ? 1 : 0.02}
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
                              <Tooltip content={<CustomTooltipContent />} isAnimationActive={false} />
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
              </>)}

            {/* Bottom Row: Payments Donut, Sentiment Index, Alerts */}
            {(activeAppFilter === "Rider" || activeAppFilter === "All") && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-6">
                {/* Payment Donut Chart */}
                <div className="card flex flex-col justify-between" style={{ minHeight: '300px' }}>
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
                            isAnimationActive={false}
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
            )}

            {/* Driver Charts Section */}
            {(activeAppFilter === "Driver" || activeAppFilter === "All") && (
              <>
                {/* Header or subtitle for Driver section when All is selected */}
                {activeAppFilter === "All" && (
                  <div className="col-span-full mt-8 mb-4 border-t border-slate-800/30 pt-6">
                    <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500">commute</span>
                      Métricas Operativas (Driver App)
                    </h3>
                  </div>
                )}

                <section className="charts-grid">
                  {/* Curva de Evolución de Viajes */}
                  <div className="card" style={{ minWidth: 0 }}>
                    <div className="card-header">
                      <h3 className="card-title">Evolución de Viajes (Pools)</h3>
                      <span className="text-[10px] text-slate-500 font-semibold">Tendencia Temporal</span>
                    </div>

                    <div className="chart-container">
                      {loading ? (
                        <div className="w-full h-full bg-white/5 rounded animate-pulse flex items-center justify-center">
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Cargando gráfico...
                          </span>
                        </div>
                      ) : metrics?.driver?.travelTrends && metrics.driver.travelTrends.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={metrics.driver.travelTrends}
                            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorPools" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                                if (!val) return "";
                                if (val.includes(":")) return val; // 24-bucket format "HH:MM"
                                const parts = val.split("-");
                                return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val; // "YYYY-MM-DD" -> "DD/MM"
                              }}
                            />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                              isAnimationActive={false}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-[#161925] border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 shadow-xl">
                                      <p className="font-bold text-blue-400 mb-1">{label}</p>
                                      <p>Viajes Planificados: <span className="font-bold text-slate-100">{payload[0].value}</span></p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="poolCount"
                              name="poolCount"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorPools)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-white/5 rounded flex items-center justify-center text-slate-500">
                          <span>Sin datos de viajes en este período</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top 5 Destinos más Solicitados (Driver) */}
                  <div className="card">
                    <div className="card-header pb-1 mb-2">
                      <h3 className="card-title">Top Destinos Solicitados</h3>
                      <span className="live-badge !m-0 !py-0.5 text-[9px] !bg-emerald-950/20 !border-emerald-900/30 !text-emerald-400">
                        <span className="live-dot !bg-emerald-400"></span>Driver Network Active
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
                      ) : metrics?.driver?.topRoutes && metrics.driver.topRoutes.length > 0 ? (
                        (() => {
                          const maxCount = Math.max(...metrics.driver.topRoutes.map(r => r.poolCount), 1);
                          return metrics.driver.topRoutes.slice(0, 5).map((route, idx) => {
                            const pct = Math.round((route.poolCount / maxCount) * 100);
                            // Alternate colors for aesthetic hierarchy
                            const fillClass = idx === 0 ? "one" : idx === 1 ? "two" : "three";
                            return (
                              <div className="dest-item" key={idx}>
                                <div className="dest-info !text-[11px] !gap-1">
                                  <span className="dest-name font-semibold text-slate-300">{route.destination}</span>
                                  <span className="dest-value font-bold text-slate-200">
                                    {route.poolCount} viajes
                                  </span>
                                </div>
                                <div className="dest-bar-bg !h-[5px]">
                                  <div
                                    className={`dest-bar-fill ${fillClass}`}
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          });
                        })()
                      ) : (
                        <div className="text-center text-slate-500 text-xs py-2">
                          Sin datos de rutas en este período.
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Driver Bottom Row: Pool Status Donut, Weekly Distribution Bar, Business Insights */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-6">
                  {/* Pool Status Donut Chart */}
                  <div className="card flex flex-col justify-between" style={{ minHeight: '300px' }}>
                    <div className="card-header pb-1 mb-2">
                      <h3 className="card-title">Estado de los Viajes</h3>
                      <span className="text-[10px] text-slate-500 font-semibold">Driver App</span>
                    </div>

                    <div className="relative flex justify-center items-center h-[160px] w-full">
                      {!loading && metrics?.driver?.poolsByStatus ? (
                        (() => {
                          const statusColors: Record<string, string> = {
                            AVAILABLE: "#60a5fa",    // Blue
                            ASSIGNED: "#3b82f6",     // Dark Blue
                            LOCKED: "#f59e0b",       // Orange
                            IN_PROGRESS: "#8b5cf6",  // Purple
                            COMPLETED: "#10b981",    // Green
                            CANCELED: "#f43f5e",     // Red
                          };
                          const statusTranslations: Record<string, string> = {
                            AVAILABLE: "Disponible",
                            ASSIGNED: "Asignado",
                            LOCKED: "Bloqueado",
                            IN_PROGRESS: "En Progreso",
                            COMPLETED: "Completado",
                            CANCELED: "Cancelado",
                          };
                          const poolStatusData = Object.entries(metrics.driver.poolsByStatus)
                            .filter(([_, value]) => (value || 0) > 0)
                            .map(([key, value]) => ({
                              name: statusTranslations[key] || key,
                              value,
                              color: statusColors[key] || "#94a3b8",
                            }));
                          const totalPoolsSum = poolStatusData.reduce((acc, curr) => acc + curr.value, 0);

                          if (totalPoolsSum === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <span className="material-symbols-outlined text-slate-500 text-3xl mb-1">commute</span>
                                <p className="text-[10px] text-slate-500">Sin pools registrados</p>
                              </div>
                            );
                          }

                          return (
                            <>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={poolStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={65}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {poolStatusData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    isAnimationActive={false}
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                          <div className="bg-[#161925] border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200">
                                            {data.name}: <span className="font-bold">{data.value}</span> pools
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-slate-200">
                                  {totalPoolsSum}
                                </span>
                                <span className="text-[8px] uppercase tracking-wider text-slate-500">
                                  Viajes
                                </span>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <span className="material-symbols-outlined text-slate-500 text-3xl mb-1">commute</span>
                          <p className="text-[10px] text-slate-500">Driver App sin conexión</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[9px] font-semibold text-slate-400 mt-2 border-t border-slate-800/50 pt-3">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                        <span>Comp.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
                        <span>Asig.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
                        <span>Bloq.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></span>
                        <span>Prog.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]"></span>
                        <span>Canc.</span>
                      </div>
                    </div>
                  </div>

                  {/* Weekday Distribution Bar Chart */}
                  <div className="card flex flex-col justify-between" style={{ minHeight: '300px' }}>
                    <div className="card-header pb-1 mb-2">
                      <h3 className="card-title">Distribución por Día</h3>
                      <span className="text-[10px] text-slate-500 font-semibold">Picos de Demanda</span>
                    </div>

                    <div className="h-[160px] w-full mt-2">
                      {!loading && metrics?.driver?.poolsDistributionByDay ? (
                        (() => {
                          const weekdayData = Object.entries(metrics.driver.poolsDistributionByDay).map(([day, count]) => ({
                            name: day,
                            Pools: count,
                          }));
                          const values = weekdayData.map(d => d.Pools);
                          const minPools = values.length > 0 ? Math.min(...values) : 0;
                          const maxPools = values.length > 0 ? Math.max(...values) : 0;

                          if (maxPools === 0) {
                            return (
                              <div className="flex h-full items-center justify-center text-slate-500 text-xs">
                                Sin datos registrados
                              </div>
                            );
                          }

                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={weekdayData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} tickLine={false} />
                                <Tooltip
                                  isAnimationActive={false}
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-[#161925] border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200">
                                          {payload[0].payload.name}: <span className="font-bold">{payload[0].value}</span> pools
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="Pools" radius={[3, 3, 0, 0]}>
                                  {weekdayData.map((entry, index) => {
                                    let barColor = "#3b82f6"; // Default blue
                                    if (entry.Pools === maxPools && maxPools > 0) {
                                      barColor = "#10b981"; // Green peak
                                    } else if (entry.Pools === minPools && minPools < maxPools) {
                                      barColor = "#f43f5e"; // Red valley
                                    }
                                    return <Cell key={`cell-${index}`} fill={barColor} />;
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500 text-xs">
                          Driver App sin conexión
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-500 text-center border-t border-slate-800/50 pt-3">
                      Destaca el día de mayor demanda en verde y de menor en rojo.
                    </div>
                  </div>

                  {/* Smart Business Insights Card */}
                  <div className="card flex flex-col justify-between" style={{ minHeight: '300px' }}>
                    <div className="card-header pb-1 mb-2">
                      <h3 className="card-title">Módulo de Business Insights</h3>
                      <span className="live-badge !m-0 !py-0.5 text-[9px] !bg-blue-950/20 !border-blue-900/30 !text-blue-400">
                        Inteligente
                      </span>
                    </div>

                    <div className="alerts-list flex-grow mt-2 flex flex-col gap-2 max-h-[190px] overflow-y-auto">
                      {!loading && metrics?.driver ? (
                        (() => {
                          const insights = [];
                          const driver = metrics.driver;

                          // 1. Low utilization warning
                          if (driver.driverUtilizationRate != null && driver.driverUtilizationRate < 60) {
                            insights.push({
                              id: "low-util",
                              type: "coral",
                              icon: "warning",
                              title: "Baja utilización de choferes",
                              desc: `⚠️ Utilización actual del ${driver.driverUtilizationRate}%. Considerar incentivos para conectar más conductores.`,
                            });
                          }

                          // 2. Peak demand day calculation
                          if (driver.poolsDistributionByDay) {
                            let maxDay = "";
                            let maxVal = -1;
                            Object.entries(driver.poolsDistributionByDay).forEach(([day, val]) => {
                              if (val > maxVal) {
                                maxVal = val;
                                maxDay = day;
                              }
                            });
                            if (maxVal > 0) {
                              insights.push({
                                id: "peak-demand",
                                type: "blue",
                                icon: "lightbulb",
                                title: "Pico de Demanda Semanal",
                                desc: `💡 El día ${maxDay} experimenta la mayor demanda de la semana. Reforzar disponibilidad.`,
                              });
                            }
                          }

                          // 3. Route Estrella
                          if (driver.topRoutes && driver.topRoutes.length > 0) {
                            const top = driver.topRoutes[0];
                            insights.push({
                              id: "star-route",
                              type: "blue",
                              icon: "workspace_premium",
                              title: "Ruta Estrella",
                              desc: `🚀 El destino ${top.destination} es el más transitado con ${top.poolCount} viajes.`,
                            });
                          }

                          if (insights.length === 0) {
                            return (
                              <p className="text-[10px] text-slate-500 text-center py-6 italic">
                                Sin recomendaciones o alertas para este período.
                              </p>
                            );
                          }

                          return insights.map((insight) => (
                            <div
                              key={insight.id}
                              className={`flex gap-2 p-2 rounded text-[11px] ${insight.type === "coral" ? "bg-rose-950/20 border border-rose-900/30" : "bg-blue-950/20 border border-blue-900/30"}`}
                            >
                              <span className={`material-symbols-outlined text-[15px] ${insight.type === "coral" ? "text-rose-400" : "text-blue-400"}`}>
                                {insight.icon}
                              </span>
                              <div>
                                <h5 className="font-semibold text-slate-200">{insight.title}</h5>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{insight.desc}</p>
                              </div>
                            </div>
                          ));
                        })()
                      ) : (
                        <p className="text-[10px] text-slate-500 text-center py-6 italic">
                          Métricas de choferes no disponibles.
                        </p>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-500 text-center border-t border-slate-800/50 pt-3">
                      Sugerencias operativas calculadas en tiempo real.
                    </div>
                  </div>
              </section>
            </>)}

            {/* Payments/Finance Section on Main Dashboard */}
            {(activeAppFilter === "Payments" || activeAppFilter === "All") && (
              <>
                {/* Header or subtitle for Payments section when All is selected */}
                {activeAppFilter === "All" && (
                  <div className="col-span-full mt-8 mb-4 border-t border-slate-800/30 pt-6">
                    <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500">payments</span>
                      Métricas Financieras (Payments App)
                    </h3>
                  </div>
                )}

                {metrics?.payments ? (
                  (() => {
                    const totalRevenue = metrics.payments.totalRevenue || 0;
                    const averageTicket = metrics.payments.averageTicket || 0;
                    const paymentRejectionRate = metrics.payments.paymentRejectionRate || 0;
                    const totalCreditsApplied = metrics.payments.totalCreditsApplied || 0;
                    const totalCreditsGranted = metrics.payments.totalCreditsGranted || 0;
                    const creditsGrantedRate = metrics.payments.creditsGrantedRate || 0;
                    const netRevenueAfterCredits = metrics.payments.netRevenueAfterCredits || 0;
                    const settlementsPendingAmount = metrics.payments.settlementsPendingAmount || 0;
                    const settlementsPaidAmount = metrics.payments.settlementsPaidAmount || 0;

                    const safeDiv = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) : "0.0";

                    // Auto business insights for payments
                    const autoInsights = [];
                    if (paymentRejectionRate > 10) {
                      autoInsights.push({
                        text: `⚠️ Alta tasa de rechazo: El ${paymentRejectionRate}% de los cobros fueron rechazados. Revise la pasarela Mercado Pago.`,
                        icon: "warning",
                        type: "coral",
                      });
                    } else {
                      autoInsights.push({
                        text: `💡 Pasarela Saludable: La tasa de cobros aprobados es óptima (${(100 - paymentRejectionRate).toFixed(1)}%).`,
                        icon: "info",
                        type: "blue",
                      });
                    }

                    if (totalCreditsGranted > 0) {
                      autoInsights.push({
                        text: `💡 Reembolso por Ajuste: Se han devuelto ${formatCurrency(totalCreditsGranted)} (${creditsGrantedRate}%) a usuarios por cancelaciones de pools.`,
                        icon: "credit_card",
                        type: creditsGrantedRate > 5 ? "coral" : "blue",
                      });
                    }

                    if (settlementsPendingAmount > 0) {
                      autoInsights.push({
                        text: `⚠️ Deuda a Choferes: Quedan ${formatCurrency(settlementsPendingAmount)} retenidos por transferir a conductores de pools cerrados.`,
                        icon: "account_balance_wallet",
                        type: "coral",
                      });
                    } else {
                      autoInsights.push({
                        text: "💡 Liquidaciones al día: No se registran deudas pendientes acumuladas con los conductores.",
                        icon: "check_circle",
                        type: "blue",
                      });
                    }

                    if (netRevenueAfterCredits > 0) {
                      const netPct = safeDiv(netRevenueAfterCredits, totalRevenue);
                      autoInsights.push({
                        text: `🌟 Salud de Caja: El ingreso neto retenido representa el ${netPct}% de la facturación bruta.`,
                        icon: "analytics",
                        type: Number(netPct) > 90 ? "blue" : "coral",
                      });
                    }

                    if (metrics.payments.decisionSignals) {
                      metrics.payments.decisionSignals.forEach((signal) => {
                        autoInsights.push({
                          text: `${signal.severity === "critical" ? "⚠️" : "💡"} ${signal.title}: ${signal.message}`,
                          icon: signal.severity === "critical" ? "warning" : "info",
                          type: signal.severity === "critical" ? "coral" : "blue",
                        });
                      });
                    }

                    return (
                      <>
                        {/* Financial Indicators & Automated Insights Grid */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 mt-6">
                          {/* Indicadores de Rendimiento Financiero */}
                          <div className="card">
                            <div className="card-header pb-1 mb-2">
                              <h3 className="card-title">Indicadores de Rendimiento Financiero</h3>
                              <p className="text-xs text-slate-400">Análisis detallado de eficiencia, retención y transacciones.</p>
                            </div>
                            <div className="table-container mt-4">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Indicador Financiero</th>
                                    <th>Métrica / Valor</th>
                                    <th>Significado Analítico</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-emerald-400">payments</span>
                                        <div>
                                          <span className="font-bold">Facturación Bruta Total</span>
                                          <p className="text-[10px] text-slate-400">Total recaudado por cobros aprobados</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="font-bold text-slate-200">{formatCurrency(totalRevenue)}</span>
                                    </td>
                                    <td>Volumen monetario total capturado por el sistema de reservas.</td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-blue-400">analytics</span>
                                        <div>
                                          <span className="font-bold">Ticket Promedio</span>
                                          <p className="text-[10px] text-slate-400">Valor de recaudación promedio por reserva</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="font-bold text-blue-400">{formatCurrency(averageTicket)}</span>
                                    </td>
                                    <td>Representa el gasto promedio de un pasajero por plaza reservada.</td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-rose-400">warning</span>
                                        <div>
                                          <span className="font-bold">Tasa de Rechazo de Pagos</span>
                                          <p className="text-[10px] text-slate-400">Transacciones denegadas sobre el total</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="font-bold text-rose-400">{paymentRejectionRate}%</span>
                                    </td>
                                    <td>Mide la fricción en la pasarela. Un valor alto indica fallas con tarjetas o pasarelas.</td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-400">currency_exchange</span>
                                        <div>
                                          <span className="font-bold">Tasa de Retorno en Créditos</span>
                                          <p className="text-[10px] text-slate-400">Créditos otorgados por pools cancelados</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="font-bold text-amber-400">{creditsGrantedRate}%</span>
                                    </td>
                                    <td>Monto reembolsado a pasajeros debido a pools cancelados (ajustes a favor).</td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-purple-400">account_balance_wallet</span>
                                        <div>
                                          <span className="font-bold">Deuda Activa a Conductores</span>
                                          <p className="text-[10px] text-slate-400">Fondos retenidos pendientes de liquidación</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="font-bold text-purple-400">{formatCurrency(settlementsPendingAmount)}</span>
                                    </td>
                                    <td>Monto total por transferir a las cuentas bancarias de los conductores.</td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-cyan-400">account_balance</span>
                                        <div>
                                          <span className="font-bold">Retención Neta de Caja</span>
                                          <p className="text-[10px] text-slate-400">Dinero retenido por WeShuttle</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="font-bold text-cyan-400">
                                        {((netRevenueAfterCredits / (totalRevenue || 1)) * 100).toFixed(1)}%
                                      </span>
                                    </td>
                                    <td>Porcentaje del ingreso total que queda en caja tras compensaciones y reembolsos.</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Descubrimientos de Negocio Card */}
                          <div className="card flex flex-col justify-between">
                            <div className="card-header pb-1 mb-2">
                              <h3 className="card-title flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">lightbulb</span>
                                Descubrimientos de Negocio (Insights Automáticos)
                              </h3>
                              <span className="live-badge !m-0 !py-0.5 text-[9px] !bg-blue-950/20 !border-blue-900/30 !text-blue-400">
                                Inteligente
                              </span>
                            </div>
                            {autoInsights.length > 0 ? (
                              <div className="insight-alert-card flex-grow mt-4 !my-0">
                                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                                  {autoInsights.map((insight, idx) => (
                                    <div key={idx} className="insight-alert-item">
                                      <span className={`material-symbols-outlined insight-alert-icon ${
                                        insight.type === "coral" ? "text-rose-400" : "text-blue-400"
                                      }`} style={{ fontSize: "1.1rem" }}>
                                        {insight.icon === "credit_card" ? "credit_card" : insight.icon === "account_balance_wallet" ? "account_balance_wallet" : insight.icon === "check_circle" ? "check_circle" : insight.icon === "warning" ? "warning" : "info"}
                                      </span>
                                      <p className="text-xs text-slate-300">
                                        {insight.text.replace("💡 ", "").replace("⚠️ ", "").replace("🌟 ", "").replace("🏆 ", "")}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="p-6 text-center text-slate-500 text-sm flex-grow flex items-center justify-center">
                                No se registran descubrimientos automáticos en este período.
                              </div>
                            )}
                          </div>
                        </section>

                        {/* Financial Charts Grid */}
                        <section className="charts-grid mt-6">
                          {/* Tendencias Financieras */}
                          <div className="card" style={{ minWidth: 0 }}>
                            <div className="card-header">
                              <h3 className="card-title">Tendencias Financieras</h3>
                              <p className="text-xs text-slate-400">Evolución de ingresos diarios vs créditos de pool otorgados.</p>
                            </div>
                            <div className="chart-container">
                              {metrics.payments.financialTrends && metrics.payments.financialTrends.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={metrics.payments.financialTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorRevenueDashboard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                      </linearGradient>
                                      <linearGradient id="colorCreditsDashboard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                      isAnimationActive={false}
                                      content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                          return (
                                            <div className="bg-[#161925] border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 shadow-xl">
                                              <p className="font-bold text-blue-400 mb-1">{label}</p>
                                              {payload.map((pld) => (
                                                <p key={pld.name} style={{ color: pld.color || pld.stroke }}>
                                                  {pld.name === "revenue" ? "Ingresos: " : "Créditos: "}
                                                  {formatCurrency(pld.value as number)}
                                                </p>
                                              ))}
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="revenue"
                                      name="revenue"
                                      stroke="#10b981"
                                      strokeWidth={3}
                                      fillOpacity={1}
                                      fill="url(#colorRevenueDashboard)"
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="creditsGranted"
                                      name="creditsGranted"
                                      stroke="#ef4444"
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill="url(#colorCreditsDashboard)"
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-500 text-sm">Sin datos en este período.</div>
                              )}
                            </div>
                          </div>

                          {/* Desglose de Transacciones */}
                          <div className="card flex flex-col justify-between" style={{ minWidth: 0 }}>
                            <div className="card-header pb-1 mb-2">
                              <h3 className="card-title">Desglose de Transacciones</h3>
                              <p className="text-xs text-slate-400">Total de cobros e intentos agrupados por estado.</p>
                            </div>
                            <div className="relative flex justify-center items-center h-[200px] w-full">
                              {(() => {
                                const txnColors: Record<string, string> = {
                                  PAID: "#10b981",
                                  DENIED: "#f43f5e",
                                  PENDING: "#f59e0b",
                                  CANCELED: "#64748b",
                                  EXPIRED: "#94a3b8",
                                  FAILED: "#ef4444",
                                };
                                const txnLabels: Record<string, string> = {
                                  PAID: "Pagados",
                                  DENIED: "Rechazados",
                                  PENDING: "Pendientes",
                                  CANCELED: "Cancelados",
                                  EXPIRED: "Expirados",
                                  FAILED: "Fallidos",
                                };
                                const txnData = Object.entries(metrics.payments.transactionStats)
                                  .filter(([_, val]) => val > 0)
                                  .map(([key, val]) => ({
                                    name: txnLabels[key] || key,
                                    value: val,
                                    color: txnColors[key] || "#94a3b8",
                                  }));
                                const totalTxns = txnData.reduce((acc, curr) => acc + curr.value, 0);

                                if (totalTxns === 0) {
                                  return <div className="text-slate-500 text-xs">Sin transacciones registradas</div>;
                                }

                                return (
                                  <>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={txnData}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={50}
                                          outerRadius={75}
                                          paddingAngle={3}
                                          dataKey="value"
                                        >
                                          {txnData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))}
                                        </Pie>
                                        <Tooltip
                                          isAnimationActive={false}
                                          content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              return (
                                                <div className="bg-[#161925] border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200">
                                                  {data.name}: <span className="font-bold">{data.value}</span> transacciones
                                                </div>
                                              );
                                            }
                                            return null;
                                          }}
                                        />
                                      </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute flex flex-col items-center justify-center">
                                      <span className="text-2xl font-bold text-slate-200">{totalTxns}</span>
                                      <span className="text-[8px] uppercase tracking-wider text-slate-500">Transac.</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-400 mt-2 border-t border-slate-800/50 pt-3">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                                <span>Pagado</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                                <span>Rechazado</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                                <span>Pendiente</span>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* Balance sheet & settlements tables */}
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 mt-6">
                          {/* Balance General Consolidado */}
                          <div className="card lg:col-span-2">
                            <div className="card-header pb-1 mb-2">
                              <h3 className="card-title">Balance General Consolidado</h3>
                              <p className="text-xs text-slate-400">Resumen contable consolidado de cobros, reintegros y transferencias.</p>
                            </div>
                            <div className="table-container mt-4">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Concepto Contable</th>
                                    <th>Monto</th>
                                    <th>Participación</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="font-bold text-slate-200">Facturación Bruta (Ingresos)</td>
                                    <td className="font-bold text-emerald-400">{formatCurrency(totalRevenue)}</td>
                                    <td className="text-slate-400">100.0%</td>
                                  </tr>
                                  <tr>
                                    <td className="text-slate-300">Créditos Aplicados (Por Usuarios)</td>
                                    <td className="text-blue-400">{formatCurrency(totalCreditsApplied)}</td>
                                    <td className="text-slate-400">{safeDiv(totalCreditsApplied, totalRevenue)}%</td>
                                  </tr>
                                  <tr>
                                    <td className="text-slate-300">Créditos Otorgados (Devoluciones)</td>
                                    <td className="text-rose-400">-{formatCurrency(totalCreditsGranted)}</td>
                                    <td className="text-slate-400">-{safeDiv(totalCreditsGranted, totalRevenue)}%</td>
                                  </tr>
                                  <tr>
                                    <td className="text-slate-300">Liquidaciones Transferidas a Choferes</td>
                                    <td className="text-slate-300">-{formatCurrency(settlementsPaidAmount)}</td>
                                    <td className="text-slate-400">-{safeDiv(settlementsPaidAmount, totalRevenue)}%</td>
                                  </tr>
                                  <tr>
                                    <td className="text-slate-300">Liquidaciones Retenidas (Deuda Viva)</td>
                                    <td className="text-amber-400">-{formatCurrency(settlementsPendingAmount)}</td>
                                    <td className="text-slate-400">-{safeDiv(settlementsPendingAmount, totalRevenue)}%</td>
                                  </tr>
                                  <tr style={{ borderTop: "2px solid var(--border-color)" }}>
                                    <td className="font-bold text-slate-100">Caja Neta Retenida (WeShuttle)</td>
                                    <td className="font-bold text-emerald-400">{formatCurrency(totalRevenue - totalCreditsGranted - settlementsPaidAmount)}</td>
                                    <td className="font-bold text-emerald-400">
                                      {safeDiv(totalRevenue - totalCreditsGranted - settlementsPaidAmount, totalRevenue)}%
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Settlements breakdown */}
                          <div className="card">
                            <div className="card-header pb-1 mb-2">
                              <h3 className="card-title">Liquidaciones a Choferes</h3>
                              <p className="text-xs text-slate-400">Estado de transferencias por viajes completados.</p>
                            </div>
                            <div className="table-container mt-4">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Estado</th>
                                    <th>Viajes</th>
                                    <th>Auditoría</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="font-bold text-slate-200">Completado</td>
                                    <td className="font-bold text-emerald-400">{metrics.payments.settlementStats.COMPLETED}</td>
                                    <td><span className="status-badge paid">Exitoso</span></td>
                                  </tr>
                                  <tr>
                                    <td className="font-bold text-slate-200">Pendiente</td>
                                    <td className="font-bold text-amber-400">{metrics.payments.settlementStats.PENDING}</td>
                                    <td><span className="status-badge pending">En espera</span></td>
                                  </tr>
                                  <tr>
                                    <td className="font-bold text-slate-200">Fallido</td>
                                    <td className="font-bold text-rose-400">{metrics.payments.settlementStats.FAILED}</td>
                                    <td><span className="status-badge denied">Rechazado</span></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </section>
                      </>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 card text-center mt-6">
                    <span className="material-symbols-outlined text-5xl text-rose-500 mb-4 animate-pulse">
                      payments
                    </span>
                    <h3 className="text-xl font-bold text-slate-200 mb-2">
                      Payments App Desconectada
                    </h3>
                    <p className="text-slate-400 max-w-md text-sm mb-6">
                      No se puede obtener la información financiera porque la Payments App se encuentra temporalmente fuera de línea.
                    </p>
                  </div>
                )}
              </>
            )}
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
                            <Tooltip content={<CustomTooltipContent />} cursor={{ fill: "rgba(37, 99, 235, 0.05)" }} isAnimationActive={false} />
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
            <header className="dashboard-header flex justify-between items-center mb-6">
              <div className="header-title">
                <h2>Calificaciones y Reseñas</h2>
                <p>
                  Consolidación, auditoría e historial completo de calificaciones.
                </p>
              </div>

              <div className="flex items-center gap-4">
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
                    <button
                      className="dropdown-item"
                      onClick={() => handleRangeSelect("90days")}
                    >
                      Últimos 3 meses
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => handleRangeSelect("all")}
                    >
                      Todos
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => handleRangeSelect("custom")}
                    >
                      Personalizado...
                    </button>
                  </div>
                </div>

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

            {/* Business Insights de Feedback */}
            {metrics?.feedbackInsights && metrics.feedbackInsights.length > 0 && (
              <div className="insight-alert-card mb-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-400 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>lightbulb</span>
                  Descubrimientos de Negocio (Reputación y Demanda)
                </h3>
                <div className="flex flex-col gap-2">
                  {metrics.feedbackInsights.map((insight, idx) => (
                    <div key={idx} className="insight-alert-item">
                      <span className="material-symbols-outlined text-blue-400 insight-alert-icon" style={{ fontSize: "1.1rem" }}>
                        {insight.includes("💡") ? "info" : insight.includes("🌟") ? "workspace_premium" : "warning"}
                      </span>
                      <p className="text-xs text-slate-300">{insight.replace("💡 ", "").replace("🌟 ", "").replace("⚠️ ", "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Charts Grid */}
            <section className="charts-grid mb-6">
              {/* Chart 1: Rating Evolution */}
              <div className="card" style={{ minWidth: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Evolución de Calificaciones</h3>
                </div>

                {!loading && metrics && metrics.ratingTrends.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 text-xs px-1 select-none">
                    <span className="text-slate-400 mr-3">Filtrar curvas:</span>
                    <button
                      onClick={() => setShowDriverTrend(!showDriverTrend)}
                      className="flex items-center gap-2 rounded-md border transition-all cursor-pointer"
                      style={{
                        borderColor: showDriverTrend ? '#2563eb' : 'rgba(37, 99, 235, 0.15)',
                        backgroundColor: showDriverTrend ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                        color: showDriverTrend ? '#60a5fa' : 'var(--text-muted)',
                        opacity: showDriverTrend ? 1 : 0.45,
                        padding: '6px 16px',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2563eb' }}></span>
                      Conductores
                    </button>
                    <button
                      onClick={() => setShowPassengerTrend(!showPassengerTrend)}
                      className="flex items-center gap-2 rounded-md border transition-all cursor-pointer"
                      style={{
                        borderColor: showPassengerTrend ? '#8b5cf6' : 'rgba(139, 92, 246, 0.15)',
                        backgroundColor: showPassengerTrend ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        color: showPassengerTrend ? '#a78bfa' : 'var(--text-muted)',
                        opacity: showPassengerTrend ? 1 : 0.45,
                        padding: '6px 16px',
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></span>
                      Pasajeros
                    </button>
                  </div>
                )}

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
                        <Tooltip content={<CustomTooltipContent showDriver={showDriverTrend} showPassenger={showPassengerTrend} />} isAnimationActive={false} />
                        <Area
                          type="monotone"
                          dataKey="avgDriverRating"
                          name="avgDriverRating"
                          stroke={showDriverTrend ? "#2563eb" : "rgba(37, 99, 235, 0.12)"}
                          strokeWidth={showDriverTrend ? 3 : 1.2}
                          fillOpacity={showDriverTrend ? 1 : 0.02}
                          fill="url(#colorDriverTab)"
                        />
                        <Area
                          type="monotone"
                          dataKey="avgPassengerRating"
                          name="avgPassengerRating"
                          stroke={showPassengerTrend ? "#8b5cf6" : "rgba(139, 92, 246, 0.12)"}
                          strokeWidth={showPassengerTrend ? 3 : 1.2}
                          fillOpacity={showPassengerTrend ? 1 : 0.02}
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
                        <Tooltip content={<CustomTooltipContent />} isAnimationActive={false} />
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

            {/* Chart 3: Day of Week Distribution */}
            <div className="card mb-6">
              <div className="card-header">
                <h3>Distribución Semanal de Viajes (Feedback)</h3>
                <p className="text-xs text-slate-400">Total de viajes calificados por día de la semana. Permite detectar días de baja actividad de pool.</p>
              </div>
              <div className="h-64 mt-4">
                {(() => {
                  const dayOfWeekData = metrics?.feedbackDayOfWeekDistribution
                    ? Object.entries(metrics.feedbackDayOfWeekDistribution).map(([day, count]) => ({
                      name: day,
                      Viajes: count
                    }))
                    : [];

                  const values = dayOfWeekData.map(d => d.Viajes);
                  const minReviews = values.length > 0 ? Math.min(...values) : 0;
                  const maxReviews = values.length > 0 ? Math.max(...values) : 0;

                  return dayOfWeekData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dayOfWeekData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                        <Tooltip content={<CustomTooltipContent />} cursor={{ fill: "rgba(255,255,255,0.02)" }} isAnimationActive={false} />
                        <Bar dataKey="Viajes" radius={[4, 4, 0, 0]} maxBarSize={35}>
                          {dayOfWeekData.map((entry, index) => {
                            let barColor = "#8b5cf6"; // Purple theme
                            if (entry.Viajes === minReviews && minReviews < maxReviews) {
                              barColor = "#f43f5e"; // Red alert for lowest day
                            } else if (entry.Viajes === maxReviews && maxReviews > 0) {
                              barColor = "#10b981"; // Green peak day
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

            {/* Pasajeros (Riders) Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Top Pasajeros */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <div>
                    <h3>Pasajeros Estrella</h3>
                    <p className="text-xs text-slate-400">Mejor calificados por conductores en este período.</p>
                  </div>
                  <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: "1.8rem" }}>sentiment_very_satisfied</span>
                </div>
                <div className="table-container mt-4">
                  {metrics?.topRidersGood && metrics.topRidersGood.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Pasajero</th>
                          <th>Calificación</th>
                          <th>Total Reseñas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topRidersGood.map((rider, idx) => (
                          <tr key={rider.userId}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="badge-rank">{idx + 1}</span>
                                <span className="font-bold text-slate-200">{rider.name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-emerald-400">{rider.avgRating ?? "—"}</span>
                                <span className="material-symbols-outlined text-emerald-400 text-[12px]">star</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-slate-400 text-xs">{rider.reviewCount} reseñas</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-sm">Sin datos de pasajeros en este período.</div>
                  )}
                </div>
              </div>

              {/* Bad Pasajeros */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <div>
                    <h3>Pasajeros en Observación</h3>
                    <p className="text-xs text-slate-400">Pasajeros con calificaciones más bajas en el periodo.</p>
                  </div>
                  <span className="material-symbols-outlined text-rose-500" style={{ fontSize: "1.8rem" }}>report_problem</span>
                </div>
                <div className="table-container mt-4">
                  {metrics?.topRidersBad && metrics.topRidersBad.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Pasajero</th>
                          <th>Calificación</th>
                          <th>Comentarios Recientes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topRidersBad.map((rider, idx) => (
                          <tr key={rider.userId}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="badge-rank-red">{idx + 1}</span>
                                <span className="font-bold text-slate-200">{rider.name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-rose-400">{rider.avgRating ?? "—"}</span>
                                <span className="material-symbols-outlined text-rose-400 text-[12px]">star</span>
                              </div>
                            </td>
                            <td>
                              {rider.comments && rider.comments.length > 0 ? (
                                <div className="text-[10px] text-slate-400 max-w-[250px] line-clamp-2 italic" title={rider.comments.join("\n")}>
                                  "{rider.comments[0]}"
                                </div>
                              ) : (
                                <span className="text-slate-500 text-xs italic">Sin comentarios</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-sm">Sin pasajeros críticos en este período.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Worst Reviews Audit Table */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h3 className="card-title">Auditoría de Comentarios Críticos (≤ 2⭐)</h3>
                  <p className="text-xs text-slate-400">Últimos comentarios de descontento registrados en el sistema WeShuttle.</p>
                </div>
                <span className="status-badge denied">Alerta Crítica</span>
              </div>
              <div className="table-container mt-4">
                {metrics?.worstReviews && metrics.worstReviews.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Autor</th>
                        <th>Destinatario</th>
                        <th>Rating</th>
                        <th>Comentario</th>
                        <th>Estado Moderación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.worstReviews.slice(0, 8).map((rev) => (
                        <tr key={rev.id}>
                          <td className="text-slate-400 text-xs">{rev.date}</td>
                          <td>
                            <span className="font-bold text-slate-200">{rev.author}</span>
                            <span className="text-[10px] text-slate-500 block">{rev.authorRole}</span>
                          </td>
                          <td>
                            <span className="font-bold text-slate-200">{rev.recipient}</span>
                            <span className="text-[10px] text-slate-500 block">{rev.recipientRole}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1 font-bold text-rose-500">
                              {rev.rating}⭐
                            </div>
                          </td>
                          <td className="italic text-xs text-slate-300">"{rev.comment}"</td>
                          <td>
                            {rev.reported ? (
                              <span className="status-badge denied flex items-center gap-1 py-0.5">
                                <span className="material-symbols-outlined text-[10px]">report</span> Reportado
                              </span>
                            ) : (
                              <span className="status-badge pending flex items-center gap-1 py-0.5" style={{ background: "rgba(245, 158, 11, 0.05)" }}>
                                <span className="material-symbols-outlined text-[10px]">warning</span> Sin Revisar
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-slate-500 text-sm">No se registran valoraciones críticas en este período.</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Transactions View */}
        {activeTab === "Transactions" && (
          <>
            <header className="dashboard-header flex justify-between items-center mb-6">
              <div className="header-title">
                <h2>Transacciones y Finanzas</h2>
                <p>Auditoría financiera consolidada de WeShuttle a través de Payments App.</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab("Dashboard")} className="pill flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_back</span>
                  Dashboard
                </button>
              </div>
            </header>

            {!loading && metrics?.payments ? (
              (() => {
                const totalRevenue = metrics.payments.totalRevenue || 0;
                const averageTicket = metrics.payments.averageTicket || 0;
                const paymentRejectionRate = metrics.payments.paymentRejectionRate || 0;
                const totalCreditsApplied = metrics.payments.totalCreditsApplied || 0;
                const totalCreditsGranted = metrics.payments.totalCreditsGranted || 0;
                const creditsGrantedRate = metrics.payments.creditsGrantedRate || 0;
                const netRevenueAfterCredits = metrics.payments.netRevenueAfterCredits || 0;
                const settlementsPendingAmount = metrics.payments.settlementsPendingAmount || 0;
                const settlementsPaidAmount = metrics.payments.settlementsPaidAmount || 0;

                const safeDiv = (num: number, den: number) => den > 0 ? ((num / den) * 100).toFixed(1) : "0.0";

                // Auto business insights
                const autoInsights = [];
                if (paymentRejectionRate > 10) {
                  autoInsights.push({
                    text: `⚠️ Alta tasa de rechazo: El ${paymentRejectionRate}% de los cobros fueron rechazados. Revise la pasarela Mercado Pago.`,
                    icon: "warning",
                    type: "coral",
                  });
                } else {
                  autoInsights.push({
                    text: `💡 Pasarela Saludable: La tasa de cobros aprobados es óptima (${(100 - paymentRejectionRate).toFixed(1)}%).`,
                    icon: "info",
                    type: "blue",
                  });
                }

                if (totalCreditsGranted > 0) {
                  autoInsights.push({
                    text: `💡 Reembolso por Ajuste: Se han devuelto ${formatCurrency(totalCreditsGranted)} (${creditsGrantedRate}%) a usuarios por cancelaciones de pools.`,
                    icon: "credit_card",
                    type: creditsGrantedRate > 5 ? "coral" : "blue",
                  });
                }

                if (settlementsPendingAmount > 0) {
                  autoInsights.push({
                    text: `⚠️ Deuda a Choferes: Quedan ${formatCurrency(settlementsPendingAmount)} retenidos por transferir a conductores de pools cerrados.`,
                    icon: "account_balance_wallet",
                    type: "coral",
                  });
                } else {
                  autoInsights.push({
                    text: "💡 Liquidaciones al día: No se registran deudas pendientes acumuladas con los conductores.",
                    icon: "check_circle",
                    type: "blue",
                  });
                }

                if (netRevenueAfterCredits > 0) {
                  const netPct = safeDiv(netRevenueAfterCredits, totalRevenue);
                  autoInsights.push({
                    text: `🌟 Salud de Caja: El ingreso neto retenido representa el ${netPct}% de la facturación bruta.`,
                    icon: "analytics",
                    type: Number(netPct) > 90 ? "blue" : "coral",
                  });
                }

                // Add API decision signals to insights
                if (metrics.payments.decisionSignals) {
                  metrics.payments.decisionSignals.forEach((signal) => {
                    autoInsights.push({
                      text: `${signal.severity === "critical" ? "⚠️" : "💡"} ${signal.title}: ${signal.message}`,
                      icon: signal.severity === "critical" ? "warning" : "info",
                      type: signal.severity === "critical" ? "coral" : "blue",
                    });
                  });
                }

                return (
                  <>
                    {/* Payments KPIs Grid */}
                    <section className="kpi-grid mb-6">
                      {/* KPI 1 - Ingresos Totales */}
                      <div className="kpi-card">
                        <div className="kpi-header">
                          <span className="kpi-title">Ingresos Totales</span>
                          <div className="kpi-icon green">
                            <span className="material-symbols-outlined">payments</span>
                          </div>
                        </div>
                        <div className="kpi-value text-white">
                          {formatCurrency(totalRevenue)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">
                          Recaudación total de cobros exitosos
                        </div>
                      </div>

                      {/* KPI 2 - Ticket Promedio */}
                      <div className="kpi-card">
                        <div className="kpi-header">
                          <span className="kpi-title">Ticket Promedio</span>
                          <div className="kpi-icon blue">
                            <span className="material-symbols-outlined">analytics</span>
                          </div>
                        </div>
                        <div className="kpi-value text-white">
                          {formatCurrency(averageTicket)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">
                          Valor promedio por viaje pagado
                        </div>
                      </div>

                      {/* KPI 3 - Tasa de Rechazo */}
                      <div className="kpi-card">
                        <div className="kpi-header">
                          <span className="kpi-title">Tasa de Rechazo</span>
                          <div className="kpi-icon orange" style={{ color: "#f43f5e", background: "rgba(244, 63, 94, 0.1)" }}>
                            <span className="material-symbols-outlined">warning</span>
                          </div>
                        </div>
                        <div className="kpi-value text-white">
                          {paymentRejectionRate}%
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">
                          Pagos denegados sobre el total
                        </div>
                      </div>

                      {/* KPI 4 - Deuda Conductor */}
                      <div className="kpi-card">
                        <div className="kpi-header">
                          <span className="kpi-title">Deuda a Liquidar</span>
                          <div className="kpi-icon purple" style={{ color: "#a78bfa", background: "rgba(167, 139, 250, 0.1)" }}>
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                          </div>
                        </div>
                        <div className="kpi-value text-white">
                          {formatCurrency(settlementsPendingAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">
                          Monto pendiente de transferir a choferes
                        </div>
                      </div>
                    </section>

                    {/* Financial Indicators & Automated Insights Grid */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Indicadores de Rendimiento Financiero */}
                      <div className="card">
                        <div className="card-header pb-1 mb-2">
                          <h3 className="card-title">Indicadores de Rendimiento Financiero</h3>
                          <p className="text-xs text-slate-400">Análisis detallado de eficiencia, retención y transacciones.</p>
                        </div>
                        <div className="table-container mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Indicador Financiero</th>
                                <th>Métrica / Valor</th>
                                <th>Significado Analítico</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-400">payments</span>
                                    <div>
                                      <span className="font-bold">Facturación Bruta Total</span>
                                      <p className="text-[10px] text-slate-400">Total recaudado por cobros aprobados</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-slate-200">{formatCurrency(totalRevenue)}</span>
                                </td>
                                <td>Volumen monetario total capturado por el sistema de reservas.</td>
                              </tr>
                              <tr>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-400">analytics</span>
                                    <div>
                                      <span className="font-bold">Ticket Promedio</span>
                                      <p className="text-[10px] text-slate-400">Valor de recaudación promedio por reserva</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-blue-400">{formatCurrency(averageTicket)}</span>
                                </td>
                                <td>Representa el gasto promedio de un pasajero por plaza reservada.</td>
                              </tr>
                              <tr>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-rose-400">warning</span>
                                    <div>
                                      <span className="font-bold">Tasa de Rechazo de Pagos</span>
                                      <p className="text-[10px] text-slate-400">Transacciones denegadas sobre el total</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-rose-400">{paymentRejectionRate}%</span>
                                </td>
                                <td>Mide la fricción en la pasarela. Un valor alto indica fallas con tarjetas o pasarelas.</td>
                              </tr>
                              <tr>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-400">currency_exchange</span>
                                    <div>
                                      <span className="font-bold">Tasa de Retorno en Créditos</span>
                                      <p className="text-[10px] text-slate-400">Créditos otorgados por pools cancelados</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-amber-400">{creditsGrantedRate}%</span>
                                </td>
                                <td>Monto reembolsado a pasajeros debido a pools cancelados (ajustes a favor).</td>
                              </tr>
                              <tr>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400">account_balance_wallet</span>
                                    <div>
                                      <span className="font-bold">Deuda Activa a Conductores</span>
                                      <p className="text-[10px] text-slate-400">Fondos retenidos pendientes de liquidación</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-purple-400">{formatCurrency(settlementsPendingAmount)}</span>
                                </td>
                                <td>Monto total por transferir a las cuentas bancarias de los conductores.</td>
                              </tr>
                              <tr>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-cyan-400">account_balance</span>
                                    <div>
                                      <span className="font-bold">Retención Neta de Caja</span>
                                      <p className="text-[10px] text-slate-400">Dinero retenido por WeShuttle</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="font-bold text-cyan-400">
                                    {((netRevenueAfterCredits / (totalRevenue || 1)) * 100).toFixed(1)}%
                                  </span>
                                </td>
                                <td>Porcentaje del ingreso total que queda en caja tras compensaciones y reembolsos.</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Descubrimientos de Negocio Card */}
                      <div className="card flex flex-col justify-between">
                        <div className="card-header pb-1 mb-2">
                          <h3 className="card-title flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">lightbulb</span>
                            Descubrimientos de Negocio (Insights Automáticos)
                          </h3>
                          <span className="live-badge !m-0 !py-0.5 text-[9px] !bg-blue-950/20 !border-blue-900/30 !text-blue-400">
                            Inteligente
                          </span>
                        </div>
                        {autoInsights.length > 0 ? (
                          <div className="insight-alert-card flex-grow mt-4 !my-0">
                            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                              {autoInsights.map((insight, idx) => (
                                <div key={idx} className="insight-alert-item">
                                  <span className={`material-symbols-outlined insight-alert-icon ${
                                    insight.type === "coral" ? "text-rose-400" : "text-blue-400"
                                  }`} style={{ fontSize: "1.1rem" }}>
                                    {insight.icon === "credit_card" ? "credit_card" : insight.icon === "account_balance_wallet" ? "account_balance_wallet" : insight.icon === "check_circle" ? "check_circle" : insight.icon === "warning" ? "warning" : "info"}
                                  </span>
                                  <p className="text-xs text-slate-300">
                                    {insight.text.replace("💡 ", "").replace("⚠️ ", "").replace("🌟 ", "").replace("🏆 ", "")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-slate-500 text-sm flex-grow flex items-center justify-center">
                            No se registran descubrimientos automáticos en este período.
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Main financial charts */}
                    <section className="charts-grid mb-6">
                      {/* Trend Chart */}
                      <div className="card" style={{ minWidth: 0 }}>
                        <div className="card-header">
                          <h3 className="card-title">Tendencias Financieras</h3>
                          <p className="text-xs text-slate-400">Evolución de ingresos diarios vs créditos de pool otorgados.</p>
                        </div>
                        <div className="chart-container">
                          {metrics.payments.financialTrends && metrics.payments.financialTrends.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={metrics.payments.financialTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                  </linearGradient>
                                  <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                  isAnimationActive={false}
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-[#161925] border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 shadow-xl">
                                          <p className="font-bold text-blue-400 mb-1">{label}</p>
                                          {payload.map((pld) => (
                                            <p key={pld.name} style={{ color: pld.color || pld.stroke }}>
                                              {pld.name === "revenue" ? "Ingresos: " : "Créditos: "}
                                              {formatCurrency(pld.value as number)}
                                            </p>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="revenue"
                                  name="revenue"
                                  stroke="#10b981"
                                  strokeWidth={3}
                                  fillOpacity={1}
                                  fill="url(#colorRevenue)"
                                />
                                <Area
                                  type="monotone"
                                  dataKey="creditsGranted"
                                  name="creditsGranted"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                  fillOpacity={1}
                                  fill="url(#colorCredits)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 text-sm">Sin datos de tendencias financieras en este período.</div>
                          )}
                        </div>
                      </div>

                      {/* Transaction breakdown Pie Chart */}
                      <div className="card flex flex-col justify-between" style={{ minWidth: 0 }}>
                        <div className="card-header pb-1 mb-2">
                          <h3 className="card-title">Desglose de Transacciones</h3>
                          <p className="text-xs text-slate-400">Total de cobros e intentos agrupados por estado.</p>
                        </div>
                        <div className="relative flex justify-center items-center h-[200px] w-full">
                          {(() => {
                            const txnColors: Record<string, string> = {
                              PAID: "#10b981",
                              DENIED: "#f43f5e",
                              PENDING: "#f59e0b",
                              CANCELED: "#64748b",
                              EXPIRED: "#94a3b8",
                              FAILED: "#ef4444",
                            };
                            const txnLabels: Record<string, string> = {
                              PAID: "Pagados",
                              DENIED: "Rechazados",
                              PENDING: "Pendientes",
                              CANCELED: "Cancelados",
                              EXPIRED: "Expirados",
                              FAILED: "Fallidos",
                            };
                            const txnData = Object.entries(metrics.payments.transactionStats)
                              .filter(([_, val]) => val > 0)
                              .map(([key, val]) => ({
                                name: txnLabels[key] || key,
                                value: val,
                                color: txnColors[key] || "#94a3b8",
                              }));
                            const totalTxns = txnData.reduce((acc, curr) => acc + curr.value, 0);

                            if (totalTxns === 0) {
                              return <div className="text-slate-500 text-xs">Sin transacciones registradas</div>;
                            }

                            return (
                              <>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={txnData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={50}
                                      outerRadius={75}
                                      paddingAngle={3}
                                      dataKey="value"
                                    >
                                      {txnData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      isAnimationActive={false}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="bg-[#161925] border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200">
                                              {data.name}: <span className="font-bold">{data.value}</span> transacciones
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute flex flex-col items-center justify-center">
                                  <span className="text-2xl font-bold text-slate-200">{totalTxns}</span>
                                  <span className="text-[8px] uppercase tracking-wider text-slate-500">Transac.</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        {/* Colors legend */}
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-400 mt-2 border-t border-slate-800/50 pt-3">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                            <span>Pagado</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                            <span>Rechazado</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
                            <span>Pendiente</span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Data Tables Grid: Balance Sheet & Settlements */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                      {/* Balance General Consolidado */}
                      <div className="card lg:col-span-2">
                        <div className="card-header pb-1 mb-2">
                          <h3 className="card-title">Balance General Consolidado</h3>
                          <p className="text-xs text-slate-400">Resumen contable consolidado de cobros, reintegros y transferencias.</p>
                        </div>
                        <div className="table-container mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Concepto Contable</th>
                                <th>Monto</th>
                                <th>Participación</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="font-bold text-slate-200">Facturación Bruta (Ingresos)</td>
                                <td className="font-bold text-emerald-400">{formatCurrency(totalRevenue)}</td>
                                <td className="text-slate-400">100.0%</td>
                              </tr>
                              <tr>
                                <td className="text-slate-300">Créditos Aplicados (Por Usuarios)</td>
                                <td className="text-blue-400">{formatCurrency(totalCreditsApplied)}</td>
                                <td className="text-slate-400">{safeDiv(totalCreditsApplied, totalRevenue)}%</td>
                              </tr>
                              <tr>
                                <td className="text-slate-300">Créditos Otorgados (Devoluciones)</td>
                                <td className="text-rose-400">-{formatCurrency(totalCreditsGranted)}</td>
                                <td className="text-slate-400">-{safeDiv(totalCreditsGranted, totalRevenue)}%</td>
                              </tr>
                              <tr>
                                <td className="text-slate-300">Liquidaciones Transferidas a Choferes</td>
                                <td className="text-slate-300">-{formatCurrency(settlementsPaidAmount)}</td>
                                <td className="text-slate-400">-{safeDiv(settlementsPaidAmount, totalRevenue)}%</td>
                              </tr>
                              <tr>
                                <td className="text-slate-300">Liquidaciones Retenidas (Deuda Viva)</td>
                                <td className="text-amber-400">-{formatCurrency(settlementsPendingAmount)}</td>
                                <td className="text-slate-400">-{safeDiv(settlementsPendingAmount, totalRevenue)}%</td>
                              </tr>
                              <tr style={{ borderTop: "2px solid var(--border-color)" }}>
                                <td className="font-bold text-slate-100">Caja Neta Retenida (WeShuttle)</td>
                                <td className="font-bold text-emerald-400">{formatCurrency(totalRevenue - totalCreditsGranted - settlementsPaidAmount)}</td>
                                <td className="font-bold text-emerald-400">
                                  {safeDiv(totalRevenue - totalCreditsGranted - settlementsPaidAmount, totalRevenue)}%
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Settlements Breakdown Card */}
                      <div className="card">
                        <div className="card-header pb-1 mb-2">
                          <h3 className="card-title">Liquidaciones a Choferes</h3>
                          <p className="text-xs text-slate-400">Estado de transferencias por viajes completados.</p>
                        </div>
                        <div className="table-container mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Estado</th>
                                <th>Viajes</th>
                                <th>Auditoría</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="font-bold text-slate-200">Completado</td>
                                <td className="font-bold text-emerald-400">{metrics.payments.settlementStats.COMPLETED}</td>
                                <td><span className="status-badge paid">Exitoso</span></td>
                              </tr>
                              <tr>
                                <td className="font-bold text-slate-200">Pendiente</td>
                                <td className="font-bold text-amber-400">{metrics.payments.settlementStats.PENDING}</td>
                                <td><span className="status-badge pending">En espera</span></td>
                              </tr>
                              <tr>
                                <td className="font-bold text-slate-200">Fallido</td>
                                <td className="font-bold text-rose-400">{metrics.payments.settlementStats.FAILED}</td>
                                <td><span className="status-badge denied">Rechazado</span></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </section>

                    {/* Cross-Module Correlations Section */}
                    <section className="mb-6">
                      {/* Cross-Module Correlations Card */}
                      <div className="card">
                        <div className="card-header pb-1 mb-2">
                          <h3 className="card-title">Análisis de Negocio Cruzado</h3>
                          <p className="text-xs text-slate-400">Correlaciones automáticas entre módulos y finanzas.</p>
                        </div>
                        <div className="table-container mt-4">
                          <table>
                            <thead>
                              <tr>
                                <th>Cruze de Módulos</th>
                                <th>Métrica Calculada</th>
                                <th>Diagnóstico del Sistema</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Rider x Payments */}
                              {(() => {
                                const totalPaid = (metrics?.reservationsByStatus?.CONFIRMED || 0) + (metrics?.reservationsByStatus?.PENDING_DRIVER || 0);
                                const avgSeat = totalPaid > 0 ? Math.round(totalRevenue / totalPaid) : 0;
                                return (
                                  <tr>
                                    <td className="font-bold text-slate-200">Rider App x Payments</td>
                                    <td className="text-emerald-400 font-bold">{avgSeat > 0 ? formatCurrency(avgSeat) : "—"} / asiento</td>
                                    <td>Ingreso promedio capturado por asiento confirmado.</td>
                                  </tr>
                                );
                              })()}

                              {/* Driver x Payments */}
                              {(() => {
                                const completedPools = metrics?.driver?.poolsByStatus?.COMPLETED || 0;
                                return (
                                  <tr>
                                    <td className="font-bold text-slate-200">Driver App x Payments</td>
                                    <td className="text-rose-400 font-bold">{formatCurrency(settlementsPendingAmount)} deuda</td>
                                    <td>
                                      {completedPools > 0 && settlementsPendingAmount > 0 ? (
                                        <span className="text-rose-400 font-medium">⚠️ Riesgo de queja: Viajes completados con saldos retenidos.</span>
                                      ) : (
                                        <span className="text-emerald-400 font-medium">✅ Liquidaciones al día con choferes.</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })()}

                              {/* Feedback x Payments */}
                              {(() => {
                                return (
                                  <tr>
                                    <td className="font-bold text-slate-200">Feedback App x Payments</td>
                                    <td className="text-amber-400 font-bold">{paymentRejectionRate}% fallos</td>
                                    <td>
                                      {paymentRejectionRate > 10 ? (
                                        <span className="text-amber-400 font-medium">⚠️ Alto rechazo. Puede correlacionar con calificaciones bajas.</span>
                                      ) : (
                                        <span className="text-emerald-400 font-medium">✅ Tasa de rechazo estable.</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </section>
                  </>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center py-20 card text-center">
                <span className="material-symbols-outlined text-5xl text-rose-500 mb-4 animate-pulse">
                  payments
                </span>
                <h3 className="text-xl font-bold text-slate-200 mb-2">
                  Payments App Desconectada
                </h3>
                <p className="text-slate-400 max-w-md text-sm mb-6">
                  No se puede obtener la información financiera porque la Payments App se encuentra temporalmente fuera de línea.
                </p>
                <button onClick={() => setActiveTab("Dashboard")} className="pill active">
                  Volver al Dashboard
                </button>
              </div>
            )}
          </>
        )}

        {/* Drivers View */}
        {activeTab === "Drivers" && (
          <div className="flex flex-col gap-12 pb-12">
            <header className="dashboard-header flex justify-between items-center">
              <div className="header-title">
                <h2>Conductores (Drivers)</h2>
                <p>Análisis de reputación, rendimiento y riesgo de los choferes de WeShuttle.</p>
              </div>
              <button onClick={() => setActiveTab("Dashboard")} className="pill flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_back</span>
                Dashboard
              </button>
            </header>

            {/* Drivers KPIs Grid */}
            <section className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Choferes Registrados</span>
                  <div className="kpi-icon orange" style={{ color: "#f97316", background: "rgba(249, 115, 22, 0.1)" }}>
                    <span className="material-symbols-outlined">group</span>
                  </div>
                </div>
                <div className="kpi-value text-white">
                  {metrics?.driver?.totalDrivers != null ? metrics.driver.totalDrivers : "25"}
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Choferes activos en plataforma</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Reputación Promedio</span>
                  <div className="kpi-icon blue">
                    <span className="material-symbols-outlined">directions_car</span>
                  </div>
                </div>
                <div className="kpi-value text-white">
                  {metrics?.averageDriverRating != null ? `${metrics.averageDriverRating} / 5` : "—"}
                </div>
                <div className="rating-stars mt-1 flex">
                  {metrics?.averageDriverRating != null && renderStars(metrics.averageDriverRating)}
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Choferes Evaluados</span>
                  <div className="kpi-icon purple" style={{ color: "#8b5cf6", background: "rgba(139, 92, 246, 0.1)" }}>
                    <span className="material-symbols-outlined">badge</span>
                  </div>
                </div>
                <div className="kpi-value text-white">
                  {metrics?.topDriversGood != null ? Array.from(new Set([...metrics.topDriversGood.map(d => d.userId), ...metrics.topDriversBad.map(d => d.userId)])).length : "—"}
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Conductores únicos con reseñas</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Reseñas Registradas</span>
                  <div className="kpi-icon green">
                    <span className="material-symbols-outlined">rate_review</span>
                  </div>
                </div>
                <div className="kpi-value text-white">
                  {metrics?.totalReviews != null ? metrics.totalReviews : "—"}
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Volumen de feedback en el período</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-title">Conductores en Riesgo</span>
                  <div className="kpi-icon" style={{ color: "#f43f5e", background: "rgba(244, 63, 94, 0.1)" }}>
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                </div>
                <div className="kpi-value text-white">
                  {metrics?.driver?.driversData?.driversAtRisk != null ? metrics.driver.driversData.driversAtRisk.length : "—"}
                </div>
                <div className="text-[10px] text-slate-400 mt-2">Choferes con alertas activas</div>
              </div>
            </section>

            {/* 2. Rankings Grid: Top 5 Buenos vs Top 5 Malos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Top 5 Estrella */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <div>
                    <h3>Conductores Estrella</h3>
                    <p className="text-xs text-slate-400">Mejor calificados por pasajeros en este período.</p>
                  </div>
                  <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: "1.8rem" }}>workspace_premium</span>
                </div>
                <div className="table-container mt-4">
                  {metrics?.topDriversGood && metrics.topDriversGood.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Conductor</th>
                          <th>Calificación</th>
                          <th>Total Reseñas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topDriversGood.map((driver, idx) => (
                          <tr key={driver.userId}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="badge-rank">{idx + 1}</span>
                                <span className="font-bold text-slate-200">{driver.name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-yellow-500">{driver.avgRating ?? "—"}</span>
                                <span className="material-symbols-outlined text-yellow-500 text-[12px]">star</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-slate-400 text-xs">{driver.reviewCount} reseñas</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-sm">Sin datos de conductores en este período.</div>
                  )}
                </div>
              </div>

              {/* Top 5 Críticos / Alerta */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <div>
                    <h3>Conductores en Alerta</h3>
                    <p className="text-xs text-slate-400">Menores promedios de calificación registrados.</p>
                  </div>
                  <span className="material-symbols-outlined text-rose-500" style={{ fontSize: "1.8rem" }}>gavel</span>
                </div>
                <div className="table-container mt-4">
                  {metrics?.topDriversBad && metrics.topDriversBad.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Conductor</th>
                          <th>Calificación</th>
                          <th>Feedback Crítico Reciente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.topDriversBad.map((driver, idx) => (
                          <tr key={driver.userId}>
                            <td>
                              <div className="flex items-center gap-2">
                                <span className="badge-rank-red">{idx + 1}</span>
                                <span className="font-bold text-slate-200">{driver.name}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-rose-400">{driver.avgRating ?? "—"}</span>
                                <span className="material-symbols-outlined text-rose-400 text-[12px]">star</span>
                              </div>
                            </td>
                            <td>
                              {driver.comments && driver.comments.length > 0 ? (
                                <div className="text-[10px] text-slate-400 max-w-[250px] line-clamp-2 italic" title={driver.comments.join("\n")}>
                                  &quot;{driver.comments[0]}&quot;
                                </div>
                              ) : (
                                <span className="text-slate-500 text-xs italic">Sin comentarios</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-sm">Sin conductores críticos en este período.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ⭐ Driver of the Month Spotlight */}
            {metrics?.driver?.driversData?.driverOfTheMonth && (
              <div className="card" style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(37, 99, 235, 0.05))",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full" style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
                    }}>
                      <span className="material-symbols-outlined text-white" style={{ fontSize: "1.8rem" }}>workspace_premium</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-amber-400">⭐ Conductor del Mes</h3>
                      </div>
                      <p className="text-xl font-bold text-white mt-0.5">{metrics.driver.driversData.driverOfTheMonth.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{metrics.driver.driversData.driverOfTheMonth.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">{metrics.driver.driversData.driverOfTheMonth.completedCount}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Viajes Completados</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-400">{formatCurrency(metrics.driver.driversData.driverOfTheMonth.revenue)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Ingresos Generados</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{metrics.driver.driversData.driverOfTheMonth.rating}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Rating Promedio</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Entregas Completadas | Ingresos Generados + Gráfico */}
            {metrics?.driver?.driversData?.driverStats && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* 🚀 Top Entregas Completadas */}
                <div className="card flex flex-col h-full">
                  <div className="card-header flex items-center justify-between pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">🚀 Entregas Completadas</h3>
                      <p className="text-[10px] text-slate-500">Ranking por viajes finalizados</p>
                    </div>
                  </div>
                  <div className="table-container mt-4 flex-1">
                    <table>
                      <thead>
                        <tr>
                          <th>Conductor</th>
                          <th>Viajes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...metrics.driver.driversData.driverStats]
                          .sort((a, b) => b.completedCount - a.completedCount)
                          .slice(0, 5)
                          .map((d, idx) => (
                            <tr key={d.driverId}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <span className="badge-rank">{idx + 1}</span>
                                  <span className="font-bold text-slate-200 text-xs">{d.name}</span>
                                </div>
                              </td>
                              <td>
                                <span className="font-bold text-emerald-400 text-xs">{d.completedCount}</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 💰 Top Ingresos Generados */}
                <div className="card flex flex-col h-full">
                  <div className="card-header flex items-center justify-between pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">💰 Ingresos Generados</h3>
                      <p className="text-[10px] text-slate-500">Ranking por facturación total</p>
                    </div>
                  </div>
                  <div className="table-container mt-4 flex-1">
                    <table>
                      <thead>
                        <tr>
                          <th>Conductor</th>
                          <th>Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...metrics.driver.driversData.driverStats]
                          .sort((a, b) => b.revenue - a.revenue)
                          .slice(0, 5)
                          .map((d, idx) => (
                            <tr key={d.driverId}>
                              <td>
                                <div className="flex items-center gap-2">
                                  <span className="badge-rank">{idx + 1}</span>
                                  <span className="font-bold text-slate-200 text-xs">{d.name}</span>
                                </div>
                              </td>
                              <td>
                                <span className="font-bold text-blue-400 text-xs">{formatCurrency(d.revenue)}</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Gráfico de Desempeño */}
                <div className="card flex flex-col h-full">
                  <div className="card-header pb-2">
                    <h3 className="text-sm font-bold text-slate-200">📊 Desempeño por Conductor</h3>
                    <p className="text-[10px] text-slate-500">Relación Viajes vs Ingresos</p>
                  </div>
                  <div className="mt-4 flex-1 flex items-center justify-center min-h-[240px]">
                    {metrics.driver.driversData.driverStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={[...metrics.driver.driversData.driverStats].sort((a, b) => b.completedCount - a.completedCount).slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f45" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => val.split(' ')[0]} />
                          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                          />
                          <Bar yAxisId="left" dataKey="completedCount" name="Viajes" fill="#34d399" radius={[2, 2, 0, 0]} maxBarSize={20} />
                          <Bar yAxisId="right" dataKey="revenue" name="Ingresos" fill="#60a5fa" radius={[2, 2, 0, 0]} maxBarSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <span className="text-xs text-slate-500">Sin datos para graficar</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. ⚠️ Drivers at Risk — Smart Diagnostic Widget */}
            {metrics?.driver?.driversData?.driversAtRisk && metrics.driver.driversData.driversAtRisk.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-rose-400">report</span>
                  Conductores en Riesgo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {metrics.driver.driversData.driversAtRisk.slice(0, 6).map((driver) => (
                    <div
                      key={driver.driverId}
                      className="card"
                      style={{
                        border: driver.riskLevel === "HIGH"
                          ? "1px solid rgba(244, 63, 94, 0.35)"
                          : "1px solid rgba(245, 158, 11, 0.3)",
                        background: driver.riskLevel === "HIGH"
                          ? "rgba(244, 63, 94, 0.04)"
                          : "rgba(245, 158, 11, 0.03)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined" style={{
                            fontSize: "1.3rem",
                            color: driver.riskLevel === "HIGH" ? "#f43f5e" : "#f59e0b",
                          }}>warning</span>
                          <div>
                            <p className="font-bold text-sm text-slate-200">{driver.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono">{driver.driverId}</p>
                          </div>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide"
                          style={{
                            background: driver.riskLevel === "HIGH"
                              ? "rgba(244, 63, 94, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                            color: driver.riskLevel === "HIGH" ? "#fb7185" : "#fbbf24",
                            border: `1px solid ${driver.riskLevel === "HIGH" ? "rgba(244, 63, 94, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          }}
                        >
                          {driver.riskLevel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {driver.reasons.map((reason: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                            <span className="text-rose-400 mt-0.5" style={{ fontSize: "6px" }}>●</span>
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Alertas de Calidad de Conductores (Insights) */}
            {metrics?.feedbackInsights && metrics.feedbackInsights.filter(ins => ins.includes("⚠️ Calidad de Servicio")).length > 0 && (
              <div className="insight-alert-card !border-rose-900/30 !bg-rose-950/10">
                <h3 className="flex items-center gap-2 text-sm font-bold text-rose-400 mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>warning</span>
                  Alertas de Calidad de Conductores
                </h3>
                <div className="flex flex-col gap-2">
                  {metrics.feedbackInsights.filter(ins => ins.includes("⚠️ Calidad de Servicio")).map((insight, idx) => (
                    <div key={idx} className="insight-alert-item">
                      <span className="material-symbols-outlined text-rose-400 insight-alert-icon" style={{ fontSize: "1.1rem" }}>
                        warning
                      </span>
                      <p className="text-xs text-slate-300">{insight.replace(/⚠️\s*/, "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings View */}
        {activeTab === "Settings" && (
          <>
            <header className="dashboard-header flex justify-between items-center mb-6">
              <div className="header-title">
                <h2>Configuración (Settings)</h2>
                <p>Personaliza las preferencias visuales y del sistema de WeShuttle.</p>
              </div>
              <button onClick={() => setActiveTab("Dashboard")} className="pill flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_back</span>
                Dashboard
              </button>
            </header>

            <div className="card max-w-2xl">
              <div className="card-header pb-2 border-b border-slate-800/30">
                <h3 className="card-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">palette</span>
                  Preferencias Visuales
                </h3>
              </div>

              <div className="mt-6 flex flex-col gap-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-slate-800/50">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">Tema de Interfaz</h4>
                    <p className="text-xs text-slate-400 mt-1">Cambia entre el modo claro y modo oscuro para la visualización del dashboard.</p>
                  </div>

                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center gap-3 px-6 py-2 min-w-[160px] rounded-lg font-bold border border-slate-700/60 hover:border-blue-500 transition-all select-none cursor-pointer"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {theme === "dark" ? (
                      <>
                        <span className="material-symbols-outlined text-yellow-500 text-[18px]">light_mode</span>
                        <span>Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-blue-400 text-[18px]">dark_mode</span>
                        <span>Modo Oscuro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Placeholder views for other sections */}
        {activeTab !== "Dashboard" && activeTab !== "Transactions" && activeTab !== "Ratings" && activeTab !== "Riders" && activeTab !== "Drivers" && activeTab !== "Settings" && (
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
