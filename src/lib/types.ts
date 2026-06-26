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

export interface DriverMetrics {
  totalPools?: number;
  totalPoolsCreated?: number;
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
}
