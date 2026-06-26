// Shared analytics types

export interface RatingTrendPoint {
  date: string;
  avgDriverRating: number;
  avgPassengerRating: number;
  reviewCount: number;
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  author: string;
  authorRole: "Rider" | "Driver";
  recipient: string;
  recipientRole: "Rider" | "Driver";
  date: string;
  reported: boolean;
}

export interface PassengerInsightItem {
  name: string;
  count: number;
  extraDetail?: string;
}

export interface BusinessInsights {
  dayOfWeekDistribution: Record<string, number>;
  vipPassengers: PassengerInsightItem[];
  atRiskPassengers: PassengerInsightItem[];
  peakHour: string;
  warnings: string[];
}

export interface DriverRankItem {
  userId: string;
  name: string;
  avgRating: number | null;
  reviewCount: number;
  comments?: string[];
}

export interface RiderRankItem {
  userId: string;
  name: string;
  avgRating: number | null;
  reviewCount: number;
  comments?: string[];
}

export interface DriverStats {
  driverId: string;
  name: string;
  email: string | null;
  completedCount: number;
  canceledCount: number;
  totalPoolsCount: number;
  cancellationRate: number;
  revenue: number;
  rating: number;
  complaints: number;
  poolsLastMonth: number;
}

export interface DriverAtRisk {
  driverId: string;
  name: string;
  riskLevel: "HIGH" | "MEDIUM";
  reasons: string[];
  rating: number;
  cancellationRate: number;
  complaints: number;
}

export interface DriverMetrics {
  totalPools?: number;
  totalPoolsCreated?: number;
  totalDrivers?: number;
  poolsByStatus?: {
    AVAILABLE?: number;
    ASSIGNED?: number;
    LOCKED?: number;
    IN_PROGRESS?: number;
    COMPLETED?: number;
    CANCELED?: number;
  };
  driverUtilizationRate?: number;
  activeVehicles?: number;
  activeVehiclesCount?: number;
  poolsDistributionByDay?: Record<string, number>;
  travelTrends?: { date: string; poolCount: number }[];
  topRoutes?: { destination: string; poolCount: number }[];
  driversData?: {
    driverStats: DriverStats[];
    driverOfTheMonth: DriverStats | null;
    driversAtRisk: DriverAtRisk[];
  };
}

export interface AnalyticsMetrics {
  // From Rider App
  totalReservations: number | null;
  activeUsers: number | null;
  totalAmountCharged: number | null;
  destinations: Record<string, number> | null;
  reservationsByStatus: Record<string, number> | null;
  insights: BusinessInsights | null;

  // From Feedback App
  averageDriverRating: number | null;
  averagePassengerRating: number | null;
  reviewCompletionRate: number | null;
  totalReviews: number | null;
  ratingTrends: RatingTrendPoint[];
  worstReviews: ReviewItem[];
  
  // New Feedback analytics fields
  topDriversGood: DriverRankItem[];
  topDriversBad: DriverRankItem[];
  topRidersGood: RiderRankItem[];
  topRidersBad: RiderRankItem[];
  feedbackDayOfWeekDistribution: Record<string, number> | null;
  feedbackInsights: string[];

  // From Driver App
  driver: DriverMetrics | null;

  // From Payments App
  payments: PaymentsMetrics | null;
}

export interface TransactionStats {
  PAID: number;
  DENIED: number;
  PENDING: number;
  CANCELED: number;
  EXPIRED: number;
  FAILED: number;
}

export interface SettlementStats {
  PENDING: number;
  COMPLETED: number;
  FAILED: number;
}

export interface FinancialTrendPoint {
  date: string;
  revenue: number;
  creditsGranted: number;
  successfulPayments: number;
  rejectedPayments: number;
}

export interface DecisionSignal {
  type: string;
  severity: string;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
}

export interface PaymentsMetrics {
  totalRevenue: number;
  successfulPaymentsCount: number;
  rejectedPaymentsCount: number;
  pendingPaymentsCount: number;
  paymentRejectionRate: number;
  averageTicket: number;
  totalCreditsApplied: number;
  totalCreditsGranted: number;
  creditsGrantedRate: number;
  netRevenueAfterCredits: number;
  transactionStats: TransactionStats;
  settlementStats: SettlementStats;
  settlementsPendingAmount: number;
  settlementsPaidAmount: number;
  financialTrends: FinancialTrendPoint[];
  decisionSignals: DecisionSignal[];
}

