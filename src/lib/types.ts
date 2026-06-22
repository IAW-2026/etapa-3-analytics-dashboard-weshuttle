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

export interface AnalyticsMetrics {
  // From Rider App
  totalReservations: number | null;
  activeUsers: number | null;
  totalAmountCharged: number | null;
  destinations: Record<string, number> | null;
  reservationsByStatus: Record<string, number> | null;

  // From Feedback App
  averageDriverRating: number | null;
  averagePassengerRating: number | null;
  reviewCompletionRate: number | null;
  totalReviews: number | null;
  ratingTrends: RatingTrendPoint[];
  worstReviews: ReviewItem[];
}
