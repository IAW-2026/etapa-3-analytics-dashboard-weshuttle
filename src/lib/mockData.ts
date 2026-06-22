// Types for the analytics response
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
  authorRole: 'Rider' | 'Driver';
  recipient: string;
  recipientRole: 'Rider' | 'Driver';
  date: string;
  reported: boolean;
}

export interface AnalyticsMetrics {
  averageDriverRating: number;
  averagePassengerRating: number;
  reviewCompletionRate: number;
  totalReviews: number;
  // Simulated metrics from other services
  totalRevenue: number;
  completedRides: number;
  activeUsers: number;
  ratingTrends: RatingTrendPoint[];
  worstReviews: ReviewItem[];
}

const worstCommentsMock: Omit<ReviewItem, 'id' | 'date'>[] = [
  {
    rating: 1,
    comment: "El conductor manejó a exceso de velocidad en el acceso al Polo Petroquímico y usaba el celular.",
    author: "Franco Gulino",
    authorRole: "Rider",
    recipient: "Carlos Gómez",
    recipientRole: "Driver",
    reported: true,
  },
  {
    rating: 1,
    comment: "La combi tenía olor a humo y el aire acondicionado no funcionaba. Hacía muchísimo calor en el viaje de ida.",
    author: "Juliana Pagani",
    authorRole: "Rider",
    recipient: "Martín Sosa",
    recipientRole: "Driver",
    reported: false,
  },
  {
    rating: 2,
    comment: "El chofer no me esperó en la parada de la Plaza Rivadavia a pesar de que faltaban 2 minutos para la partida.",
    author: "Juan Bassi",
    authorRole: "Rider",
    recipient: "Eduardo López",
    recipientRole: "Driver",
    reported: false,
  },
  {
    rating: 1,
    comment: "El pasajero venía hablando a los gritos por teléfono y molestando a todos durante el traslado al Puerto.",
    author: "Roberto Díaz",
    authorRole: "Driver",
    recipient: "Esteban Perez",
    recipientRole: "Rider",
    reported: true,
  },
  {
    rating: 2,
    comment: "La unidad llegó 15 minutos tarde al Parque Industrial. Perdí el fichado de entrada en la planta.",
    author: "Ignacio Ibarra",
    authorRole: "Rider",
    recipient: "Carlos Gómez",
    recipientRole: "Driver",
    reported: false,
  },
  {
    rating: 2,
    comment: "El pasajero arrojó basura en el piso de la combi y se negó a juntarla cuando se lo solicité.",
    author: "Carlos Gómez",
    authorRole: "Driver",
    recipient: "Franco Gulino",
    recipientRole: "Rider",
    reported: true,
  },
  {
    rating: 1,
    comment: "Frenadas muy bruscas todo el camino. Varios pasajeros nos golpeamos levemente con los asientos de adelante.",
    author: "Sofía Martínez",
    authorRole: "Rider",
    recipient: "Martín Sosa",
    recipientRole: "Driver",
    reported: true,
  },
  {
    rating: 2,
    comment: "El pasajero llegó tarde al punto de recogida y retrasó el viaje de todos los demás por 10 minutos.",
    author: "Eduardo López",
    authorRole: "Driver",
    recipient: "Ana Álvarez",
    recipientRole: "Rider",
    reported: false,
  },
  {
    rating: 1,
    comment: "El vehículo asignado no coincidía con la patente indicada en la aplicación. Muy desorganizado.",
    author: "Tomás Pérez",
    authorRole: "Rider",
    recipient: "Roberto Díaz",
    recipientRole: "Driver",
    reported: false,
  },
  {
    rating: 2,
    comment: "Mal trato por parte del chofer al preguntarle por el recorrido. Contestó de mala manera.",
    author: "Lucía Fernández",
    authorRole: "Rider",
    recipient: "Sebastián Castro",
    recipientRole: "Driver",
    reported: false,
  }
];

export function generateMockAnalyticsData(startDateStr: string, endDateStr: string): AnalyticsMetrics {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // Calculate days difference
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  const ratingTrends: RatingTrendPoint[] = [];
  let totalReviewsAccum = 0;
  
  // Seed random generator to keep it relatively stable for the same dates
  const seedString = `${startDateStr}-${endDateStr}`;
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed += seedString.charCodeAt(i);
  }
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Generate a data point for each day
  for (let i = 0; i <= diffDays; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    if (currentDate > end) break;

    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Average ratings with slight daily fluctuation
    const avgDriverRating = parseFloat((4.7 + random() * 0.25).toFixed(2));
    const avgPassengerRating = parseFloat((4.2 + random() * 0.35).toFixed(2));
    const dailyReviews = Math.floor(5 + random() * 15);
    totalReviewsAccum += dailyReviews;

    ratingTrends.push({
      date: dateStr,
      avgDriverRating,
      avgPassengerRating,
      reviewCount: dailyReviews,
    });
  }

  // Calculate final averages
  const averageDriverRating = parseFloat(
    (ratingTrends.reduce((acc, p) => acc + p.avgDriverRating, 0) / ratingTrends.length).toFixed(2)
  );
  const averagePassengerRating = parseFloat(
    (ratingTrends.reduce((acc, p) => acc + p.avgPassengerRating, 0) / ratingTrends.length).toFixed(2)
  );
  
  // Base completion rate
  const reviewCompletionRate = parseFloat((78 + random() * 10).toFixed(1));
  
  // Simulated business metrics based on period length
  const completedRides = Math.floor(diffDays * (35 + random() * 10));
  const activeUsers = Math.floor(diffDays * (120 + random() * 30));
  // Let's assume average ride cost is $1800 ARS per rider, average pool occupation is 8 riders
  const totalRevenue = completedRides * 8 * 1800;

  // Set worst reviews dates dynamically within the range
  const worstReviews: ReviewItem[] = worstCommentsMock.map((comment, index) => {
    const reviewDate = new Date(start);
    // Distribute reviews across the period
    const dayOffset = Math.floor(random() * diffDays);
    reviewDate.setDate(start.getDate() + dayOffset);
    
    return {
      ...comment,
      id: `rev-${index + 1}`,
      date: reviewDate.toISOString().split('T')[0],
    };
  }).sort((a, b) => b.date.localeCompare(a.date)); // Sort newest first

  return {
    averageDriverRating,
    averagePassengerRating,
    reviewCompletionRate,
    totalReviews: totalReviewsAccum,
    totalRevenue,
    completedRides,
    activeUsers,
    ratingTrends,
    worstReviews,
  };
}
