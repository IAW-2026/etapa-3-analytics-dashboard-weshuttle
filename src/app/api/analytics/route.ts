import { NextRequest, NextResponse } from "next/server";
import { generateMockAnalyticsData, RatingTrendPoint, ReviewItem } from "@/lib/mockData";

interface FeedbackMetrics {
  averageDriverRating?: number;
  averagePassengerRating?: number;
  reviewCompletionRate?: number;
  totalReviews?: number;
  ratingTrends?: RatingTrendPoint[];
  worstReviews?: ReviewItem[];
}

interface PaymentsMetrics {
  totalRevenue?: number;
}

interface DriverMetrics {
  completedRides?: number;
}

interface RiderMetrics {
  activeUsers?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  // Fallback dates: default to the last 15 days
  const today = new Date();
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(today.getDate() - 15);

  const start = startDate || fifteenDaysAgo.toISOString().split("T")[0];
  const end = endDate || today.toISOString().split("T")[0];

  const feedbackAppApiUrl = process.env.FEEDBACK_APP_API_URL;
  const paymentsAppApiUrl = process.env.PAYMENTS_APP_API_URL;
  const driverAppApiUrl = process.env.DRIVER_APP_API_URL;
  const riderAppApiUrl = process.env.RIDER_APP_API_URL;

  // Build fetch promises with a 4-second timeout to maintain responsive page loads
  const feedbackPromise = feedbackAppApiUrl 
    ? fetch(`${feedbackAppApiUrl}/api/ratings/analytics/metrics?start_date=${start}&end_date=${end}`, { 
        signal: AbortSignal.timeout(4000),
        cache: 'no-store'
      })
    : Promise.reject(new Error("FEEDBACK_APP_API_URL is not configured"));

  const paymentsPromise = paymentsAppApiUrl
    ? fetch(`${paymentsAppApiUrl}/api/payments/analytics/metrics?start_date=${start}&end_date=${end}`, { 
        signal: AbortSignal.timeout(4000),
        cache: 'no-store'
      })
    : Promise.reject(new Error("PAYMENTS_APP_API_URL is not configured"));

  const driverPromise = driverAppApiUrl
    ? fetch(`${driverAppApiUrl}/api/drivers/analytics/metrics?start_date=${start}&end_date=${end}`, { 
        signal: AbortSignal.timeout(4000),
        cache: 'no-store'
      })
    : Promise.reject(new Error("DRIVER_APP_API_URL is not configured"));

  const riderPromise = riderAppApiUrl
    ? fetch(`${riderAppApiUrl}/api/riders/analytics/metrics?start_date=${start}&end_date=${end}`, { 
        signal: AbortSignal.timeout(4000),
        cache: 'no-store'
      })
    : Promise.reject(new Error("RIDER_APP_API_URL is not configured"));

  // Fetch all endpoints concurrently using Promise.allSettled
  const results = await Promise.allSettled([
    feedbackPromise,
    paymentsPromise,
    driverPromise,
    riderPromise
  ]);

  const responseStatus: Record<string, { status: string; error: string | null }> = {
    feedback: { status: "unknown", error: null },
    payments: { status: "unknown", error: null },
    driver: { status: "unknown", error: null },
    rider: { status: "unknown", error: null },
  };

  let feedbackData: FeedbackMetrics | null = null;
  let paymentsData: PaymentsMetrics | null = null;
  let driverData: DriverMetrics | null = null;
  let riderData: RiderMetrics | null = null;

  // Helper to parse settled fetch results
  const parseResult = async <T,>(result: PromiseSettledResult<Response>, key: string): Promise<T | null> => {
    if (result.status === "fulfilled") {
      const response = result.value;
      if (response.ok) {
        try {
          const data = await response.json() as T;
          responseStatus[key] = { status: "success", error: null };
          return data;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          responseStatus[key] = { status: "error", error: `Invalid JSON: ${errMsg}` };
        }
      } else {
        responseStatus[key] = { status: "error", error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } else {
      const reason = result.reason;
      const errMsg = reason instanceof Error ? reason.message : String(reason || "Network request failed");
      responseStatus[key] = { status: "error", error: errMsg };
    }
    return null;
  };

  // Parse results in parallel
  feedbackData = await parseResult<FeedbackMetrics>(results[0], "feedback");
  paymentsData = await parseResult<PaymentsMetrics>(results[1], "payments");
  driverData = await parseResult<DriverMetrics>(results[2], "driver");
  riderData = await parseResult<RiderMetrics>(results[3], "rider");

  // Generate complete fallback mock data
  const mockData = generateMockAnalyticsData(start, end);

  // Consolidate values. Use real service data if successful, else fall back to mock data
  const finalMetrics = { ...mockData };

  // 1. Feedback app consolidation
  if (responseStatus.feedback.status === "success" && feedbackData) {
    finalMetrics.averageDriverRating = feedbackData.averageDriverRating ?? mockData.averageDriverRating;
    finalMetrics.averagePassengerRating = feedbackData.averagePassengerRating ?? mockData.averagePassengerRating;
    finalMetrics.reviewCompletionRate = feedbackData.reviewCompletionRate ?? mockData.reviewCompletionRate;
    finalMetrics.totalReviews = feedbackData.totalReviews ?? mockData.totalReviews;
    if (feedbackData.ratingTrends) {
      finalMetrics.ratingTrends = feedbackData.ratingTrends;
    }
    if (feedbackData.worstReviews) {
      finalMetrics.worstReviews = feedbackData.worstReviews;
    }
  }

  // 2. Payments app consolidation (Simulated for now, but ready for future integration)
  if (responseStatus.payments.status === "success" && paymentsData) {
    finalMetrics.totalRevenue = paymentsData.totalRevenue ?? mockData.totalRevenue;
  }

  // 3. Driver & Rider app consolidation (Simulated for now, but ready for future integration)
  if (responseStatus.driver.status === "success" && driverData) {
    finalMetrics.completedRides = driverData.completedRides ?? mockData.completedRides;
  }
  if (responseStatus.rider.status === "success" && riderData) {
    finalMetrics.activeUsers = riderData.activeUsers ?? mockData.activeUsers;
  }

  // Return consolidated metrics and the connection status of each service
  return NextResponse.json({
    metrics: finalMetrics,
    status: responseStatus,
    meta: {
      startDate: start,
      endDate: end,
      isFeedbackMocked: responseStatus.feedback.status !== "success",
      isPaymentsMocked: responseStatus.payments.status !== "success",
      isDriverMocked: responseStatus.driver.status !== "success",
      isRiderMocked: responseStatus.rider.status !== "success",
    }
  });
}
