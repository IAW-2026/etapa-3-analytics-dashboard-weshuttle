import { NextRequest, NextResponse } from "next/server";
import { RatingTrendPoint, ReviewItem, PaymentsMetrics } from "@/lib/types";

interface DriverMetrics {
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
    driverStats: any[];
    driverOfTheMonth: any | null;
    driversAtRisk: any[];
  };
}

interface FeedbackMetrics {
  averageDriverRating?: number;
  averagePassengerRating?: number;
  reviewCompletionRate?: number;
  totalReviews?: number;
  ratingTrends?: RatingTrendPoint[];
  worstReviews?: ReviewItem[];
  topDriversGood?: any[];
  topDriversBad?: any[];
  topRidersGood?: any[];
  topRidersBad?: any[];
  dayOfWeekDistribution?: Record<string, number>;
  businessInsights?: string[];
}

interface RiderSummaryMetrics {
  passengers: {
    total: number;
    active: number;
  };
  reservations: {
    total: number;
    by_status: Record<string, number>;
    by_destination: Record<string, number>;
  };
  financials: {
    total_max_price: number;
    total_amount_charged: number;
    total_credit_applied: number;
  };
  insights?: {
    dayOfWeekDistribution: Record<string, number>;
    vipPassengers: { name: string; count: number; extraDetail?: string }[];
    atRiskPassengers: { name: string; count: number; extraDetail?: string }[];
    peakHour: string;
    warnings: string[];
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  // Fallback dates: default to the last 15 days, going 7 days into the future for upcoming reservations
  const today = new Date();
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(today.getDate() - 15);

  const futureEnd = new Date();
  futureEnd.setDate(today.getDate() + 7);

  const start = startDate || fifteenDaysAgo.toISOString().split("T")[0];
  const end = endDate || futureEnd.toISOString().split("T")[0];

  const feedbackAppApiUrl = process.env.FEEDBACK_APP_API_URL;
  const riderAppApiUrl = process.env.RIDER_APP_API_URL;
  const driverAppApiUrl = process.env.DRIVER_APP_API_URL;
  const paymentsAppApiUrl = process.env.PAYMENTS_APP_API_URL;

  // Fetch Feedback App metrics
  const feedbackPromise = feedbackAppApiUrl
    ? fetch(
      `${feedbackAppApiUrl}/api/ratings/analytics/metrics?start_date=${start}&end_date=${end}`,
      {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${process.env.ANALYTICS_API_KEY || ""}`,
        },
      }
    )
    : Promise.reject(new Error("FEEDBACK_APP_API_URL is not configured"));

  // Fetch Rider App analytics summary
  const riderPromise = riderAppApiUrl
    ? fetch(`${riderAppApiUrl}/api/analytics/summary?start_date=${start}&end_date=${end}`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.ANALYTICS_API_KEY || ""}`,
      },
    })
    : Promise.reject(new Error("RIDER_APP_API_URL is not configured"));

  // Fetch Driver App analytics metrics
  const driverPromise = driverAppApiUrl
    ? fetch(`${driverAppApiUrl}/api/analytics/metrics?start_date=${start}&end_date=${end}`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.ANALYTICS_API_KEY || ""}`,
      },
    })
    : Promise.reject(new Error("DRIVER_APP_API_URL is not configured"));

  // Fetch Payments App metrics
  const paymentsPromise = paymentsAppApiUrl
    ? fetch(`${paymentsAppApiUrl}/api/analytics/metrics?start_date=${start}&end_date=${end}`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.ANALYTICS_API_KEY || ""}`,
      },
    })
    : Promise.reject(new Error("PAYMENTS_APP_API_URL is not configured"));

  // Fetch all endpoints concurrently
  const [feedbackResult, riderResult, driverResult, paymentsResult] = await Promise.allSettled([
    feedbackPromise,
    riderPromise,
    driverPromise,
    paymentsPromise,
  ]);

  const responseStatus: Record<string, { status: string; error: string | null }> = {
    feedback: { status: "unknown", error: null },
    rider: { status: "unknown", error: null },
    driver: { status: "unknown", error: null },
    payments: { status: "unknown", error: null },
  };

  let feedbackData: FeedbackMetrics | null = null;
  let riderData: RiderSummaryMetrics | null = null;
  let driverData: DriverMetrics | null = null;
  let paymentsData: { metrics: PaymentsMetrics } | null = null;

  // Helper to parse settled fetch results
  const parseResult = async <T>(
    result: PromiseSettledResult<Response>,
    key: string
  ): Promise<T | null> => {
    if (result.status === "fulfilled") {
      const response = result.value;
      if (response.ok) {
        try {
          const data = (await response.json()) as T;
          responseStatus[key] = { status: "success", error: null };
          return data;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          responseStatus[key] = {
            status: "error",
            error: `Invalid JSON: ${errMsg}`,
          };
        }
      } else {
        responseStatus[key] = {
          status: "error",
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } else {
      const reason = result.reason;
      const errMsg =
        reason instanceof Error
          ? reason.message
          : String(reason || "Network request failed");
      responseStatus[key] = { status: "error", error: errMsg };
    }
    return null;
  };

  feedbackData = await parseResult<FeedbackMetrics>(feedbackResult, "feedback");
  riderData = await parseResult<RiderSummaryMetrics>(riderResult, "rider");
  driverData = await parseResult<DriverMetrics>(driverResult, "driver");
  paymentsData = await parseResult<{ metrics: PaymentsMetrics }>(paymentsResult, "payments");

  // Build metrics only from real data — no mocks, no fallbacks with invented values
  const metrics = {
    // From Rider App
    totalReservations: riderData?.reservations?.total ?? null,
    activeUsers: riderData?.passengers?.active ?? null,
    totalAmountCharged: riderData?.financials?.total_amount_charged ?? null,
    destinations: riderData?.reservations?.by_destination ?? null,
    reservationsByStatus: riderData?.reservations?.by_status ?? null,
    insights: riderData?.insights ?? null,

    // From Feedback App
    averageDriverRating: feedbackData?.averageDriverRating ?? null,
    averagePassengerRating: feedbackData?.averagePassengerRating ?? null,
    reviewCompletionRate: feedbackData?.reviewCompletionRate ?? null,
    totalReviews: feedbackData?.totalReviews ?? null,
    ratingTrends: feedbackData?.ratingTrends ?? [],
    worstReviews: feedbackData?.worstReviews ?? [],
    topDriversGood: feedbackData?.topDriversGood ?? [],
    topDriversBad: feedbackData?.topDriversBad ?? [],
    topRidersGood: feedbackData?.topRidersGood ?? [],
    topRidersBad: feedbackData?.topRidersBad ?? [],
    feedbackDayOfWeekDistribution: feedbackData?.dayOfWeekDistribution ?? null,
    feedbackInsights: feedbackData?.businessInsights ?? [],

    // From Driver App
    driver: driverData ?? null,

    // From Payments App
    payments: paymentsData?.metrics ?? null,
  };

  return NextResponse.json({
    metrics,
    status: responseStatus,
    meta: {
      startDate: start,
      endDate: end,
      isFeedbackOnline: responseStatus.feedback.status === "success",
      isRiderOnline: responseStatus.rider.status === "success",
      isDriverOnline: responseStatus.driver.status === "success",
      isPaymentsOnline: responseStatus.payments.status === "success",
    },
  });
}
