// HotelScout Guinea — Shared TypeScript Types

export interface Hotel {
  id: string
  name: string
  city: string
  region: string
  address: string | null
  quartier: string | null
  stars: number
  phone: string | null
  email: string | null
  web: string | null
  webVerified: boolean
  webVerifiedAt: string | null
  webStatus: string | null
  fb: string | null
  wa: string | null
  bookingUrl: string | null
  tripadvisorUrl: string | null
  ratingBooking: number
  reviewsBooking: number
  ratingTripadvisor: number
  reviewsTripadvisor: number
  priceUsd: string | null
  rooms: number
  amenities: string | null
  hasBooking: boolean
  hasTripadvisor: boolean
  hasAgoda: boolean
  hasExpedia: boolean
  lat: number | null
  lng: number | null
  notes: string | null
  statusDigital: string
  score: number
  priority: string
  source: string | null
  pipelineStage: string
  lastContactAt: string | null
  contactCount: number
  createdAt: string
  updatedAt: string
  _count?: { contacts: number; aiAnalyses: number; verificationLogs: number }
  contacts?: Contact[]
  aiAnalyses?: AIAnalysis[]
  verificationLogs?: VerificationLog[]
}

export interface Contact {
  id: string
  hotelId: string
  channel: string
  direction: string
  subject: string | null
  message: string | null
  status: string
  sentAt: string
  createdAt: string
  hotel?: { id: string; name: string; city: string; pipelineStage: string }
}

export interface AIAnalysis {
  id: string
  hotelId: string
  providerId: string
  prompt: string
  response: string
  createdAt: string
}

export interface VerificationLog {
  id: string
  hotelId: string
  url: string
  status: string
  statusCode: number | null
  responseMs: number | null
  error: string | null
  checkedAt: string
}

export interface AIProvider {
  id: string
  name: string
  free: boolean
  models: string
  defaultModel: string
  keyPrefix: string
  format: string
  configured: boolean
  isActive: boolean
  lastUsedAt: string | null
  keyHint: string | null
}

export interface Stats {
  totalHotels: number
  byRegion: Record<string, number>
  byDigitalStatus: Record<string, number>
  averageScore: number
  pipelineDistribution: Record<string, number>
  priorityDistribution: Record<string, number>
  recentContactsCount: number
  totalContacts: number
  digitalReadiness: number
  hotelsWithWebsite: number
  hotelsWithPhone: number
  hotelsWithEmail: number
  hotelsWithBooking: number
  hotelsWithTripadvisor: number
  totalReservations: number
  pendingReservations: number
  lastUpdated: string
}

export interface PipelineStage {
  stage: string
  label: string
  count: number
  hotels: Hotel[]
}

export interface Reservation {
  id: string
  hotelId: string
  checkIn: string
  checkOut: string
  guests: number
  roomType: string
  specialRequests: string | null
  guestName: string
  guestEmail: string | null
  guestPhone: string | null
  status: string
  confirmationCode: string | null
  nights: number
  totalPrice: number
  createdAt: string
  updatedAt: string
  hotel?: { id: string; name: string; city: string; region: string; stars: number; phone: string | null; email: string | null }
  planningSteps?: PlanningStep[]
}

export interface PlanningStep {
  id: string
  reservationId: string
  step: string
  label: string
  status: string
  scheduledAt: string | null
  completedAt: string | null
  notes: string | null
  order: number
}

export type PageType = 'menu' | 'dashboard' | 'hotels' | 'collecte' | 'prospects' | 'pipeline' | 'ia' | 'settings'

export interface AppUser {
  id: string
  username: string
  name: string
  email: string | null
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}
