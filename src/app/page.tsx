"use client";

import { useEffect, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { 
  TrendingUp, 
  DollarSign, 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  ShieldAlert, 
  Car, 
  Award,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from "recharts";
import { AnalyticsMetrics } from "@/lib/mockData";

interface AnalyticsMeta {
  startDate: string;
  endDate: string;
  isFeedbackMocked: boolean;
  isPaymentsMocked: boolean;
  isDriverMocked: boolean;
  isRiderMocked: boolean;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date states
  const [rangeType, setRangeType] = useState<"7" | "15" | "30" | "custom">("15");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Dashboard data
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [meta, setMeta] = useState<AnalyticsMeta | null>(null);

  // Helper to format Date objects as YYYY-MM-DD
  const formatDateString = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Set mounted flag asynchronously to avoid hydration mismatch and cascading renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Set default dates asynchronously on load
  useEffect(() => {
    const timer = setTimeout(() => {
      const today = new Date();
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(today.getDate() - 15);
      
      setStartDate(formatDateString(fifteenDaysAgo));
      setEndDate(formatDateString(today));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Recalculate start date based on select value
  const handleRangeChange = (type: "7" | "15" | "30" | "custom") => {
    setRangeType(type);
    if (type !== "custom") {
      const today = new Date();
      const newStart = new Date();
      const days = parseInt(type, 10);
      newStart.setDate(today.getDate() - days);
      
      const sStr = formatDateString(newStart);
      const eStr = formatDateString(today);
      setStartDate(sStr);
      setEndDate(eStr);
      fetchData(sStr, eStr);
    }
  };

  const fetchData = async (start: string, end: string) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/analytics?start_date=${start}&end_date=${end}`);
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
      fetchData(startDate, endDate);
    }
  }, [startDate, endDate]);

  if (!mounted) {
    return null; // Avoid server-side hydration mismatches
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Layers className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-violet-400 bg-clip-text text-transparent">
                WeShuttle
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Analytics Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-300">
                {user?.fullName || "Administrador"}
              </span>
              <span className="text-xs text-slate-500 font-medium bg-blue-950/40 text-blue-400 border border-blue-900/50 px-1.5 py-0.5 rounded">
                Admin Global
              </span>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Title and date range picker */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
              Dashboard de Analíticas
            </h2>
            <p className="text-sm text-slate-400">
              Rentabilidad, calidad de servicio y moderación de calificaciones.
            </p>
          </div>

          {/* Date Picker Actions */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-800 p-1.5 rounded-xl">
            <button
              onClick={() => handleRangeChange("7")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangeType === "7" 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => handleRangeChange("15")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangeType === "15" 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              15 Días
            </button>
            <button
              onClick={() => handleRangeChange("30")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangeType === "30" 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => handleRangeChange("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                rangeType === "custom" 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/30" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Personalizado
            </button>

            {rangeType === "custom" && (
              <div className="flex items-center gap-2 px-2 border-l border-slate-800">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    fetchData(e.target.value, endDate);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-600 text-xs">a</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    fetchData(startDate, e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <button
              onClick={() => fetchData(startDate, endDate)}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global Connection Resilience Alert Banner */}
        {meta && (meta.isFeedbackMocked || meta.isPaymentsMocked || meta.isDriverMocked || meta.isRiderMocked) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-yellow-500/10 border border-yellow-500/25 rounded-2xl">
            <div className="flex items-start sm:items-center gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-xl text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-yellow-500">Modo Resiliencia Activo</h4>
                <p className="text-xs text-slate-400">
                  Algunos microservicios no respondieron. Mostrando métricas consolidadas con datos simulados.
                </p>
              </div>
            </div>
            
            {/* Badges of connection status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                meta.isFeedbackMocked 
                  ? "bg-red-500/10 text-red-400 border-red-500/20" 
                  : "bg-green-500/10 text-green-400 border-green-500/20"
              }`}>
                Feedback App: {meta.isFeedbackMocked ? "Offline" : "Online"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                meta.isPaymentsMocked 
                  ? "bg-red-500/10 text-red-400 border-red-500/20" 
                  : "bg-green-500/10 text-green-400 border-green-500/20"
              }`}>
                Payments App: {meta.isPaymentsMocked ? "Simulado" : "Online"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                meta.isDriverMocked 
                  ? "bg-red-500/10 text-red-400 border-red-500/20" 
                  : "bg-green-500/10 text-green-400 border-green-500/20"
              }`}>
                Driver App: {meta.isDriverMocked ? "Simulado" : "Online"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                meta.isRiderMocked 
                  ? "bg-red-500/10 text-red-400 border-red-500/20" 
                  : "bg-green-500/10 text-green-400 border-green-500/20"
              }`}>
                Rider App: {meta.isRiderMocked ? "Simulado" : "Online"}
              </span>
            </div>
          </div>
        )}

        {/* KPI Cards Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Driver Rating */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-slate-950/40 flex flex-col justify-between overflow-hidden">
            {/* Glow Accent */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Calificación Conductores</span>
              <div className="bg-blue-500/10 text-blue-400 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Car className="h-5 w-5" />
              </div>
            </div>
            
            {loading ? (
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse my-2" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-100">{metrics?.averageDriverRating}</span>
                <span className="text-sm font-semibold text-blue-400">★ / 5.0</span>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span>Promedio general</span>
              {meta?.isFeedbackMocked && (
                <span className="bg-yellow-950/40 text-yellow-500 border border-yellow-900/50 px-1.5 py-0.5 rounded font-bold">
                  Simulado
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Passenger Rating */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-slate-950/40 flex flex-col justify-between overflow-hidden">
            {/* Glow Accent */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Calificación Pasajeros</span>
              <div className="bg-violet-500/10 text-violet-400 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Award className="h-5 w-5" />
              </div>
            </div>

            {loading ? (
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse my-2" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-100">{metrics?.averagePassengerRating}</span>
                <span className="text-sm font-semibold text-violet-400">★ / 5.0</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span>Promedio general</span>
              {meta?.isFeedbackMocked && (
                <span className="bg-yellow-950/40 text-yellow-500 border border-yellow-900/50 px-1.5 py-0.5 rounded font-bold">
                  Simulado
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Completion Rate */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-slate-950/40 flex flex-col justify-between overflow-hidden">
            {/* Glow Accent */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tasa de Respuesta</span>
              <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            {loading ? (
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse my-2" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-100">{metrics?.reviewCompletionRate}%</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  +1.2%
                </span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span>{metrics?.totalReviews} reseñas cargadas</span>
              {meta?.isFeedbackMocked && (
                <span className="bg-yellow-950/40 text-yellow-500 border border-yellow-900/50 px-1.5 py-0.5 rounded font-bold">
                  Simulado
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Simulated Revenue */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-slate-950/40 flex flex-col justify-between overflow-hidden">
            {/* Glow Accent */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos Totales (Est.)</span>
              <div className="bg-blue-500/10 text-blue-400 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            {loading ? (
              <div className="h-8 w-32 bg-slate-800 rounded animate-pulse my-2" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-100">{formatCurrency(metrics?.totalRevenue || 0)}</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span>Basado en ocupación de pools</span>
              <span className="bg-blue-950/40 text-blue-400 border border-blue-900/50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                Payments <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Card 5: Completed Rides */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-slate-950/40 flex flex-col justify-between overflow-hidden">
            {/* Glow Accent */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Viajes Completados</span>
              <div className="bg-violet-500/10 text-violet-400 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Layers className="h-5 w-5" />
              </div>
            </div>

            {loading ? (
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse my-2" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-100">{metrics?.completedRides}</span>
                <span className="text-xs font-semibold text-violet-400">servicios</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span>Pools finalizados en ruta</span>
              <span className="bg-violet-950/40 text-violet-400 border border-violet-900/50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                Driver App <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Card 6: Active Users */}
          <div className="group relative bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700/80 transition-all duration-300 shadow-xl shadow-slate-950/40 flex flex-col justify-between overflow-hidden">
            {/* Glow Accent */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Usuarios Activos (Período)</span>
              <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Users className="h-5 w-5" />
              </div>
            </div>

            {loading ? (
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse my-2" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-100">{metrics?.activeUsers}</span>
                <span className="text-xs font-semibold text-emerald-400">usuarios</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span>Riders y Drivers activos</span>
              <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                Rider App <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Charts & Graphical Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart: Rating trends over time (occupies 2 cols) */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-950/30 flex flex-col justify-between min-h-[380px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-100">Tendencia de Calificaciones y Valoraciones</h3>
                <p className="text-xs text-slate-500">Evolución diaria del promedio de estrellas otorgadas en reseñas</p>
              </div>

              {/* Legends indicator */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
                  <span className="text-slate-400">Conductores</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500 inline-block" />
                  <span className="text-slate-400">Pasajeros</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 w-full bg-slate-800/30 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs text-slate-500 font-semibold">Cargando gráfico...</span>
              </div>
            ) : metrics && metrics.ratingTrends.length > 0 ? (
              <div className="flex-1 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metrics.ratingTrends}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorDriver" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPassenger" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => {
                        // Format date to show DD/MM
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
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#0f172a", 
                        borderColor: "#1e293b", 
                        borderRadius: "12px",
                        color: "#f1f5f9",
                        fontSize: "12px"
                      }}
                      itemStyle={{ color: "#f1f5f9" }}
                      labelClassName="font-bold text-blue-400 mb-1"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgDriverRating" 
                      stroke="#3b82f6" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorDriver)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgPassengerRating" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorPassenger)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 w-full bg-slate-900/60 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="h-8 w-8 text-slate-600 mb-2" />
                <span className="text-xs font-semibold">Sin datos suficientes en este rango</span>
              </div>
            )}
          </div>

          {/* Right Chart: Volume of reviews (1 col) */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-950/30 flex flex-col justify-between min-h-[380px]">
            <div>
              <h3 className="text-base font-bold text-slate-100">Volumen de Feedback</h3>
              <p className="text-xs text-slate-500">Cantidad diaria de valoraciones completadas</p>
            </div>

            {loading ? (
              <div className="flex-1 w-full bg-slate-800/30 rounded-xl animate-pulse flex items-center justify-center my-4">
                <span className="text-xs text-slate-500 font-semibold">Cargando gráfico...</span>
              </div>
            ) : metrics && metrics.ratingTrends.length > 0 ? (
              <div className="flex-1 w-full min-h-[220px] my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.ratingTrends}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
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
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#0f172a", 
                        borderColor: "#1e293b", 
                        borderRadius: "12px",
                        color: "#f1f5f9",
                        fontSize: "12px"
                      }}
                      itemStyle={{ color: "#f1f5f9" }}
                      labelClassName="font-bold text-violet-400 mb-1"
                    />
                    <Bar 
                      dataKey="reviewCount" 
                      fill="#8b5cf6" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 w-full bg-slate-900/60 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-500 my-4">
                <span className="text-xs">Sin datos</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total en período:</span>
              <span className="text-slate-200">{metrics?.totalReviews} reseñas</span>
            </div>
          </div>
        </div>

        {/* Quick Moderation Table Section */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl shadow-slate-950/30 overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
                Auditoría y Moderación Rápida
              </h3>
              <p className="text-xs text-slate-500">Listado de las 10 peores reseñas (calificación ≤ 2 o reportadas) del período.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="bg-red-950/50 text-red-400 border border-red-900/50 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                Acción Requerida
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-850">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Autor (Rol)</th>
                  <th className="px-6 py-4">Receptor (Rol)</th>
                  <th className="px-6 py-4 text-center">Calificación</th>
                  <th className="px-6 py-4 max-w-md">Comentario</th>
                  <th className="px-6 py-4 text-right">Estado / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="bg-slate-900/20">
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-800 rounded animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-800 rounded animate-pulse" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-800 rounded animate-pulse" /></td>
                      <td className="px-6 py-4 text-center"><div className="h-6 w-12 bg-slate-800 rounded animate-pulse mx-auto" /></td>
                      <td className="px-6 py-4"><div className="h-4 w-64 bg-slate-800 rounded animate-pulse" /></td>
                      <td className="px-6 py-4 text-right"><div className="h-6 w-20 bg-slate-800 rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : metrics && metrics.worstReviews.length > 0 ? (
                  metrics.worstReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-slate-800/20 transition-colors bg-slate-900/10">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-semibold">
                        {review.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">{review.author}</div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          review.authorRole === "Rider" 
                            ? "bg-blue-950/40 text-blue-400 border border-blue-900/30" 
                            : "bg-violet-950/40 text-violet-400 border border-violet-900/30"
                        }`}>
                          {review.authorRole === "Rider" ? "Pasajero" : "Conductor"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-200">{review.recipient}</div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          review.recipientRole === "Rider" 
                            ? "bg-blue-950/40 text-blue-400 border border-blue-900/30" 
                            : "bg-violet-950/40 text-violet-400 border border-violet-900/30"
                        }`}>
                          {review.recipientRole === "Rider" ? "Pasajero" : "Conductor"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                          review.rating === 1 
                            ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                          <Star className="h-3 w-3 fill-current" />
                          {review.rating}.0
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300 leading-relaxed max-w-md font-medium">
                        {"\""}{review.comment}{"\""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          {review.reported ? (
                            <span className="bg-red-950/40 text-red-400 border border-red-900/50 px-2 py-0.5 rounded text-[10px] font-bold">
                              Reportada
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">
                              Baja Valoración
                            </span>
                          )}
                          <button 
                            onClick={() => alert(`Iniciando auditoría para la reseña ${review.id}.`)}
                            className="bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md font-semibold cursor-pointer hover:text-white"
                          >
                            Auditar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                      No se encontraron reseñas con baja calificación en el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-600 font-medium">
          &copy; 2026 WeShuttle. Todos los derechos reservados. Control Plane &amp; Analytics Console.
        </div>
      </footer>
    </div>
  );
}
