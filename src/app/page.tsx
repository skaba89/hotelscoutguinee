'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  LayoutDashboard, Building2, Search, Flame, GitBranch, Brain, Settings,
  Menu, Download, ExternalLink, Globe, Phone, Mail, Star, MapPin,
  RefreshCw, Plus, Trash2, Edit, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, Clock, AlertTriangle, Zap, MessageSquare, Send, Bot,
  ArrowRight, ArrowUpRight, TrendingUp, Users, Eye, Link2, Wifi,
  WifiOff, Filter, SortAsc, SortDesc, Play, Loader2, X, Check,
  Copy, Sparkles, ChevronDown, Info
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface Hotel {
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

interface Contact {
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

interface AIAnalysis {
  id: string
  hotelId: string
  providerId: string
  prompt: string
  response: string
  createdAt: string
}

interface VerificationLog {
  id: string
  hotelId: string
  url: string
  status: string
  statusCode: number | null
  responseMs: number | null
  error: string | null
  checkedAt: string
}

interface AIProvider {
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

interface Stats {
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
  lastUpdated: string
}

interface PipelineStage {
  stage: string
  label: string
  count: number
  hotels: Hotel[]
}

type PageType = 'dashboard' | 'hotels' | 'collecte' | 'prospects' | 'pipeline' | 'ia' | 'settings'

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_LABELS: Record<PageType, string> = {
  dashboard: 'Tableau de bord',
  hotels: 'Base Hôtels',
  collecte: 'Agent de Collecte',
  prospects: 'Prospects HOT',
  pipeline: 'Pipeline CRM',
  ia: 'Analyse IA',
  settings: 'Paramètres',
}

const PAGE_ICONS: Record<PageType, React.ElementType> = {
  dashboard: LayoutDashboard,
  hotels: Building2,
  collecte: Search,
  prospects: Flame,
  pipeline: GitBranch,
  ia: Brain,
  settings: Settings,
}

const STAGE_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  interesse: 'Intéressé',
  proposal: 'Proposition',
  client: 'Client',
}

const STAGE_COLORS: Record<string, string> = {
  nouveau: 'bg-slate-100 text-slate-700 border-slate-300',
  contacte: 'bg-blue-50 text-blue-700 border-blue-300',
  interesse: 'bg-amber-50 text-amber-700 border-amber-300',
  proposal: 'bg-purple-50 text-purple-700 border-purple-300',
  client: 'bg-emerald-50 text-emerald-700 border-emerald-300',
}

const PRIORITY_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700 border-red-300',
  warm: 'bg-amber-100 text-amber-700 border-amber-300',
  cold: 'bg-slate-100 text-slate-600 border-slate-300',
}

const DIGITAL_STATUS_COLORS: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  none: 'bg-red-100 text-red-700',
}

const DIGITAL_STATUS_LABELS: Record<string, string> = {
  ok: 'Complet',
  partial: 'Partiel',
  none: 'Aucun',
}

const AI_PROMPT_TEMPLATES = [
  { id: 'digital', label: 'Analyse digitale', icon: Wifi, prompt: 'Analyse la présence digitale de cet hôtel en Guinée. Évalue son site web, ses plateformes de réservation, et propose des améliorations concrètes pour augmenter sa visibilité en ligne.' },
  { id: 'prospect', label: 'Message de prospection', icon: Send, prompt: 'Rédige un message de prospection professionnel et personnalisé pour cet hôtel en Guinée, en proposant nos services de création de site web et de présence digitale. Le ton doit être chaleureux mais professionnel.' },
  { id: 'audit', label: 'Audit concurrentiel', icon: Eye, prompt: 'Réalise un audit concurrentiel pour cet hôtel en Guinée. Compare sa présence digitale avec les standards de l\'industrie hôtelière en Afrique de l\'Ouest et identifie les opportunités d\'amélioration.' },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n)
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

function getScoreColor(score: number): string {
  if (score >= 60) return 'text-emerald-600'
  if (score >= 30) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreBg(score: number): string {
  if (score >= 60) return 'bg-emerald-500'
  if (score >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

// ============================================================================
// SKELETON LOADER COMPONENT
// ============================================================================

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

function Sidebar({
  activePage,
  onPageChange,
  collapsed,
  onToggle,
}: {
  activePage: PageType
  onPageChange: (p: PageType) => void
  collapsed: boolean
  onToggle: () => void
}) {
  const pages: PageType[] = ['dashboard', 'hotels', 'collecte', 'prospects', 'pipeline', 'ia', 'settings']

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border shrink-0`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-guinea-gold flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm shrink-0">
          HS
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-bold text-sm truncate">HotelScout</div>
            <div className="text-[10px] text-sidebar-foreground/60 truncate">Guinée v7</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-1">
        {pages.map((page) => {
          const Icon = PAGE_ICONS[page]
          const isActive = activePage === page
          return (
            <TooltipProvider key={page} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onPageChange(page)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{PAGE_LABELS[page]}</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="font-sans">
                    {PAGE_LABELS[page]}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </nav>

      {/* Footer flag stripe */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex gap-1 justify-center">
            <div className="h-1.5 w-8 rounded-full bg-guinea-red" />
            <div className="h-1.5 w-8 rounded-full bg-guinea-gold" />
            <div className="h-1.5 w-8 rounded-full bg-guinea-green" />
          </div>
          <p className="text-[10px] text-center mt-1.5 text-sidebar-foreground/50">
            République de Guinée
          </p>
        </div>
      )}
    </aside>
  )
}

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

function DashboardPage({ stats, loading, onNavigate }: {
  stats: Stats | null
  loading: boolean
  onNavigate: (p: PageType) => void
}) {
  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  const topRegions = Object.entries(stats.byRegion).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxRegionCount = topRegions.length > 0 ? topRegions[0][1] : 1

  const withoutWebsite = (stats.byDigitalStatus['none'] ?? 0)
  const withWebsite = stats.hotelsWithWebsite
  const partialDigital = (stats.byDigitalStatus['partial'] ?? 0)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-guinea-green">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Total Hôtels</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-guinea-green">{formatNumber(stats.totalHotels)}</div>
            <p className="text-xs text-muted-foreground mt-1">en Guinée</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Site web vérifié</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{formatNumber(withWebsite)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.digitalReadiness}% prêt digital</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-guinea-red">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Sans site web</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-guinea-red">{formatNumber(withoutWebsite)}</div>
            <button onClick={() => onNavigate('prospects')} className="text-xs text-guinea-gold hover:underline mt-1 cursor-pointer">
              Voir les prospects →
            </button>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-guinea-gold">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-xs">Score moyen</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-guinea-gold">{stats.averageScore}</div>
            <p className="text-xs text-muted-foreground mt-1">sur 100</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Region Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-guinea-green" />
              Distribution par région
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topRegions.map(([region, count]) => (
                <div key={region} className="flex items-center gap-3">
                  <span className="text-xs w-20 text-right text-muted-foreground truncate">{region}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-guinea-green to-guinea-green-light rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxRegionCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-guinea-green" />
                Pipeline CRM
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onNavigate('pipeline')}>
                Voir tout <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                const count = stats.pipelineDistribution[stage] ?? 0
                const pct = stats.totalHotels > 0 ? (count / stats.totalHotels) * 100 : 0
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-xs w-20 text-muted-foreground">{label}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBg(count > 0 ? stage === 'client' ? 80 : stage === 'proposal' ? 60 : stage === 'interesse' ? 45 : stage === 'contacte' ? 30 : 15 : 0)}`}
                        style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8">{count}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {stats.recentContactsCount} contacts cette semaine
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Digital Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wifi className="h-4 w-4 text-guinea-green" />
              Statut digital
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['ok', 'partial', 'none'] as const).map((status) => {
                const count = stats.byDigitalStatus[status] ?? 0
                const pct = stats.totalHotels > 0 ? Math.round((count / stats.totalHotels) * 100) : 0
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={DIGITAL_STATUS_COLORS[status]}>
                        {DIGITAL_STATUS_LABELS[status]}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{count}</span>
                      <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                    </div>
                  </div>
                )
              })}
              <Progress value={stats.digitalReadiness} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground">Prêt digital: {stats.digitalReadiness}%</p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Presence */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-guinea-green" />
              Plateformes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">B</div>
                  <span className="text-sm">Booking.com</span>
                </div>
                <span className="text-sm font-semibold">{stats.totalHotels > 0 ? '—' : '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">TA</div>
                  <span className="text-sm">TripAdvisor</span>
                </div>
                <span className="text-sm font-semibold">{stats.totalHotels > 0 ? '—' : '0'}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avec téléphone</span>
                <span className="font-semibold">{formatNumber(stats.hotelsWithPhone)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avec email</span>
                <span className="font-semibold">{formatNumber(stats.hotelsWithEmail)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-guinea-green" />
              Priorités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['hot', 'warm', 'cold'] as const).map((priority) => {
                const count = stats.priorityDistribution[priority] ?? 0
                const pct = stats.totalHotels > 0 ? Math.round((count / stats.totalHotels) * 100) : 0
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <Badge variant="outline" className={PRIORITY_COLORS[priority]}>
                      {priority === 'hot' ? '🔥 HOT' : priority === 'warm' ? '🌤 Tiède' : '❄️ Froid'}
                    </Badge>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{count}</span>
                      <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4 text-xs h-8" onClick={() => onNavigate('prospects')}>
              <Flame className="h-3 w-3 mr-1" /> Voir les prospects HOT
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// HOTELS PAGE (Base Hôtels)
// ============================================================================

function HotelsPage({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [hotelDetail, setHotelDetail] = useState<Hotel | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const limit = 15

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      if (search) params.set('search', search)
      if (regionFilter !== 'all') params.set('region', regionFilter)
      if (statusFilter !== 'all') params.set('statusDigital', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)

      const res = await fetch(`/api/hotels?${params}`)
      if (res.ok) {
        const data = await res.json()
        setHotels(data.hotels)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les hôtels', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, sortOrder, search, regionFilter, statusFilter, priorityFilter, toast])

  useEffect(() => { fetchHotels() }, [fetchHotels])

  const fetchHotelDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/hotels/${id}`)
      if (res.ok) {
        const data = await res.json()
        setHotelDetail(data.hotel)
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les détails', variant: 'destructive' })
    } finally {
      setDetailLoading(false)
    }
  }, [toast])

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortOrder('desc')
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (regionFilter !== 'all') params.set('region', regionFilter)
      if (statusFilter !== 'all') params.set('statusDigital', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      const res = await fetch(`/api/export?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hotels-guinea-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Export réussi', description: 'Le fichier CSV a été téléchargé' })
      }
    } catch {
      toast({ title: 'Erreur', description: "L'export a échoué", variant: 'destructive' })
    }
  }

  const handleDeleteHotel = async (id: string) => {
    try {
      const res = await fetch(`/api/hotels/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Supprimé', description: 'Hôtel supprimé avec succès' })
        fetchHotels()
        setSelectedHotel(null)
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un hôtel, ville, région..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Région" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes régions</SelectItem>
                <SelectItem value="Conakry">Conakry</SelectItem>
                <SelectItem value="Kankan">Kankan</SelectItem>
                <SelectItem value="Kindia">Kindia</SelectItem>
                <SelectItem value="Nzérékoré">Nzérékoré</SelectItem>
                <SelectItem value="Boké">Boké</SelectItem>
                <SelectItem value="Labé">Labé</SelectItem>
                <SelectItem value="Mamou">Mamou</SelectItem>
                <SelectItem value="Faranah">Faranah</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="ok">Complet</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="none">Aucun</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Priorité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="hot">🔥 HOT</SelectItem>
                <SelectItem value="warm">🌤 Tiède</SelectItem>
                <SelectItem value="cold">❄️ Froid</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleExport} title="Exporter CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">{formatNumber(total)} hôtels trouvés</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2">{page}/{totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotels Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={8} /></div>
          ) : hotels.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun hôtel trouvé</p>
              <p className="text-xs mt-1">Modifiez vos critères de recherche</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1">Nom {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}</span>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('region')}>
                      <span className="flex items-center gap-1">Région {sortBy === 'region' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}</span>
                    </TableHead>
                    <TableHead>Étoiles</TableHead>
                    <TableHead>Site web</TableHead>
                    <TableHead>Plateformes</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('score')}>
                      <span className="flex items-center gap-1">Score {sortBy === 'score' && (sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}</span>
                    </TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotels.map((hotel) => (
                    <TableRow key={hotel.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedHotel(hotel); fetchHotelDetail(hotel.id) }}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{hotel.name}</div>
                          <div className="text-xs text-muted-foreground">{hotel.city}</div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{hotel.region}</Badge></TableCell>
                      <TableCell>
                        {hotel.stars > 0 ? (
                          <div className="flex">
                            {Array.from({ length: Math.min(hotel.stars, 5) }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-guinea-gold text-guinea-gold" />
                            ))}
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${DIGITAL_STATUS_COLORS[hotel.statusDigital]}`}>
                          {DIGITAL_STATUS_LABELS[hotel.statusDigital]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {hotel.hasBooking && <Badge className="text-[9px] h-5 bg-blue-600">Booking</Badge>}
                          {hotel.hasTripadvisor && <Badge className="text-[9px] h-5 bg-emerald-600">TA</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-semibold ${getScoreColor(hotel.score)}`}>{hotel.score}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[hotel.priority]}`}>
                          {hotel.priority === 'hot' ? '🔥' : hotel.priority === 'warm' ? '🌤' : '❄️'} {hotel.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedHotel(hotel); fetchHotelDetail(hotel.id) }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteHotel(hotel.id) }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hotel Detail Dialog */}
      <Dialog open={!!selectedHotel} onOpenChange={(open) => { if (!open) { setSelectedHotel(null); setHotelDetail(null) } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-guinea-green" />
              {selectedHotel?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedHotel?.city}, {selectedHotel?.region}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : hotelDetail ? (
            <div className="space-y-4">
              {/* Key info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-guinea-gold" />
                  <span>{hotelDetail.stars > 0 ? `${hotelDetail.stars} étoiles` : 'Non classé'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-guinea-green" />
                  <Badge variant="outline" className={DIGITAL_STATUS_COLORS[hotelDetail.statusDigital]}>
                    {DIGITAL_STATUS_LABELS[hotelDetail.statusDigital]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-bold ${getScoreColor(hotelDetail.score)}`}>Score: {hotelDetail.score}/100</span>
                </div>
              </div>

              <Separator />

              {/* Contact Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1"><Phone className="h-4 w-4" /> Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {hotelDetail.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`tel:${hotelDetail.phone}`} className="text-guinea-green hover:underline">{hotelDetail.phone}</a>
                    </div>
                  )}
                  {hotelDetail.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`mailto:${hotelDetail.email}`} className="text-guinea-green hover:underline">{hotelDetail.email}</a>
                    </div>
                  )}
                  {hotelDetail.web && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={hotelDetail.web} target="_blank" rel="noopener noreferrer" className="text-guinea-green hover:underline flex items-center gap-1">
                        {hotelDetail.web.length > 35 ? hotelDetail.web.slice(0, 35) + '...' : hotelDetail.web}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <Badge variant="outline" className={`text-[9px] ${hotelDetail.webVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {hotelDetail.webVerified ? '✓ Vérifié' : '✗ Non vérifié'}
                      </Badge>
                    </div>
                  )}
                  {hotelDetail.wa && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={`https://wa.me/${hotelDetail.wa.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-guinea-green hover:underline">WhatsApp</a>
                    </div>
                  )}
                </div>
                {!hotelDetail.phone && !hotelDetail.email && !hotelDetail.web && (
                  <p className="text-sm text-muted-foreground italic">Aucune information de contact disponible</p>
                )}
              </div>

              <Separator />

              {/* Platforms */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1"><Globe className="h-4 w-4" /> Plateformes</h4>
                <div className="flex flex-wrap gap-2">
                  {hotelDetail.hasBooking && <Badge className="bg-blue-600">Booking.com{hotelDetail.ratingBooking > 0 ? ` (${hotelDetail.ratingBooking}/10, ${hotelDetail.reviewsBooking} avis)` : ''}</Badge>}
                  {hotelDetail.hasTripadvisor && <Badge className="bg-emerald-600">TripAdvisor{hotelDetail.ratingTripadvisor > 0 ? ` (${hotelDetail.ratingTripadvisor}/5, ${hotelDetail.reviewsTripadvisor} avis)` : ''}</Badge>}
                  {hotelDetail.hasAgoda && <Badge className="bg-red-600">Agoda</Badge>}
                  {hotelDetail.hasExpedia && <Badge className="bg-orange-600">Expedia</Badge>}
                  {!hotelDetail.hasBooking && !hotelDetail.hasTripadvisor && !hotelDetail.hasAgoda && !hotelDetail.hasExpedia && (
                    <p className="text-sm text-muted-foreground italic">Aucune plateforme détectée</p>
                  )}
                </div>
              </div>

              {/* Pipeline Stage */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Pipeline:</span>
                <Badge variant="outline" className={STAGE_COLORS[hotelDetail.pipelineStage]}>
                  {STAGE_LABELS[hotelDetail.pipelineStage] || hotelDetail.pipelineStage}
                </Badge>
                <Badge variant="outline" className={PRIORITY_COLORS[hotelDetail.priority]}>
                  {hotelDetail.priority.toUpperCase()}
                </Badge>
              </div>

              {/* Additional Info */}
              {(hotelDetail.priceUsd || hotelDetail.rooms > 0 || hotelDetail.address) && (
                <div className="text-sm space-y-1">
                  {hotelDetail.address && <p>📍 {hotelDetail.address}{hotelDetail.quartier ? `, ${hotelDetail.quartier}` : ''}</p>}
                  {hotelDetail.priceUsd && <p>💰 À partir de {hotelDetail.priceUsd}</p>}
                  {hotelDetail.rooms > 0 && <p>🛏️ {hotelDetail.rooms} chambres</p>}
                </div>
              )}

              {/* Verification Logs */}
              {hotelDetail.verificationLogs && hotelDetail.verificationLogs.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1"><RefreshCw className="h-4 w-4" /> Vérifications URL</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                      {hotelDetail.verificationLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-center gap-2 text-xs">
                          {log.status === 'ok' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> :
                           log.status === 'timeout' ? <Clock className="h-3 w-3 text-amber-500" /> :
                           <XCircle className="h-3 w-3 text-red-500" />}
                          <span className="text-muted-foreground">{formatDateTime(log.checkedAt)}</span>
                          <Badge variant="outline" className="text-[9px]">{log.status}</Badge>
                          {log.responseMs && <span className="text-muted-foreground">{log.responseMs}ms</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {hotelDetail.notes && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground font-medium">Notes:</span> {hotelDetail.notes}
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedHotel(null); setHotelDetail(null) }}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// AGENT DE COLLECTE PAGE
// ============================================================================

function CollectePage({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [collecting, setCollecting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{ found: number; added: number; updated: number; errors: number; details: string[] } | null>(null)
  const [verifyResults, setVerifyResults] = useState<{ verified: number; summary: Record<string, number> } | null>(null)
  const [enrichResults, setEnrichResults] = useState<{ totalProcessed: number; enriched: number; notEnriched: number } | null>(null)
  const [searchResults, setSearchResults] = useState<{ totalResults: number; hotelsAdded: number; hotelsSkipped: number } | null>(null)

  const handleCollect = async () => {
    setCollecting(true)
    setResults(null)
    try {
      const res = await fetch('/api/cron/collect', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        toast({ title: 'Collecte terminée', description: `${data.added} ajoutés, ${data.updated} mis à jour` })
      } else {
        toast({ title: 'Erreur de collecte', description: 'La collecte automatique a échoué', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de lancer la collecte', variant: 'destructive' })
    } finally {
      setCollecting(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResults(null)
    try {
      const res = await fetch('/api/hotels/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verifyAll: true }) })
      if (res.ok) {
        const data = await res.json()
        setVerifyResults(data)
        toast({ title: 'Vérification terminée', description: `${data.verified} URLs vérifiées` })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de vérifier les URLs', variant: 'destructive' })
    } finally {
      setVerifying(false)
    }
  }

  const handleEnrich = async () => {
    setEnriching(true)
    setEnrichResults(null)
    try {
      const res = await fetch('/api/hotels/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrichAllMissing: true }) })
      if (res.ok) {
        const data = await res.json()
        setEnrichResults(data)
        toast({ title: 'Enrichissement terminé', description: `${data.enriched} hôtels enrichis sur ${data.totalProcessed}` })
      }
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'enrichir les données", variant: 'destructive' })
    } finally {
      setEnriching(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults(null)
    try {
      const res = await fetch('/api/hotels/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchQuery }) })
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
        toast({ title: 'Recherche terminée', description: `${data.hotelsAdded} nouveaux hôtels trouvés` })
      }
    } catch {
      toast({ title: 'Erreur', description: 'La recherche a échoué', variant: 'destructive' })
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Auto Collect */}
        <Card className="border-guinea-green/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-guinea-green" />
              Collecte automatique
            </CardTitle>
            <CardDescription className="text-xs">
              Lance 8 requêtes de recherche prédéfinies pour couvrir toutes les régions de Guinée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-guinea-green hover:bg-guinea-green-light" onClick={handleCollect} disabled={collecting}>
              {collecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {collecting ? 'Collecte en cours...' : 'Lancer la collecte'}
            </Button>
            {results && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Résultats trouvés</span><span className="font-semibold">{results.found}</span></div>
                <div className="flex justify-between"><span className="text-emerald-600">Ajoutés</span><span className="font-semibold text-emerald-600">{results.added}</span></div>
                <div className="flex justify-between"><span className="text-blue-600">Mis à jour</span><span className="font-semibold text-blue-600">{results.updated}</span></div>
                <div className="flex justify-between"><span className="text-red-600">Erreurs</span><span className="font-semibold text-red-600">{results.errors}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verify URLs */}
        <Card className="border-guinea-gold/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4 text-guinea-gold" />
              Vérification URLs
            </CardTitle>
            <CardDescription className="text-xs">
              Vérifie la validité de tous les sites web d&apos;hôtels enregistrés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-guinea-gold hover:bg-guinea-gold-light text-white" onClick={handleVerify} disabled={verifying}>
              {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {verifying ? 'Vérification...' : 'Vérifier les URLs'}
            </Button>
            {verifyResults && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">URLs vérifiées</span><span className="font-semibold">{verifyResults.verified}</span></div>
                <div className="flex justify-between"><span className="text-emerald-600">✓ OK</span><span className="font-semibold">{verifyResults.summary.ok ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-red-600">✗ Hors ligne</span><span className="font-semibold">{verifyResults.summary.down ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-amber-600">⏱ Timeout</span><span className="font-semibold">{verifyResults.summary.timeout ?? 0}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrich Data */}
        <Card className="border-guinea-red/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-guinea-red" />
              Enrichissement données
            </CardTitle>
            <CardDescription className="text-xs">
              Recherche les informations manquantes (téléphone, email, site web) pour tous les hôtels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-guinea-red hover:bg-red-700 text-white" onClick={handleEnrich} disabled={enriching}>
              {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {enriching ? 'Enrichissement...' : 'Enrichir les données'}
            </Button>
            {enrichResults && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Hôtels traités</span><span className="font-semibold">{enrichResults.totalProcessed}</span></div>
                <div className="flex justify-between"><span className="text-emerald-600">Enrichis</span><span className="font-semibold text-emerald-600">{enrichResults.enriched}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Non enrichis</span><span className="font-semibold">{enrichResults.notEnriched}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4 text-guinea-green" />
            Recherche manuelle
          </CardTitle>
          <CardDescription className="text-xs">
            Recherchez de nouveaux hôtels sur le web avec une requête personnalisée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Ex: hôtels Conakry site web, hotels Kindia booking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Rechercher
            </Button>
          </div>
          {searchResults && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Résultats web</span><span className="font-semibold">{searchResults.totalResults}</span></div>
              <div className="flex justify-between"><span className="text-emerald-600">Hôtels ajoutés</span><span className="font-semibold text-emerald-600">{searchResults.hotelsAdded}</span></div>
              <div className="flex justify-between"><span className="text-amber-600">Ignorés (doublons)</span><span className="font-semibold text-amber-600">{searchResults.hotelsSkipped}</span></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collection Log */}
      {results && results.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-guinea-green" />
              Journal de collecte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-1">
                {results.details.map((detail, i) => (
                  <div key={i} className={`text-xs py-1 px-2 rounded ${detail.startsWith('Error') || detail.startsWith('Search failed') ? 'bg-red-50 text-red-700' : detail.startsWith('Added') ? 'bg-emerald-50 text-emerald-700' : detail.startsWith('Updated') ? 'bg-blue-50 text-blue-700' : 'bg-muted/50'}`}>
                    {detail}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// PROSPECTS HOT PAGE
// ============================================================================

function ProspectsPage({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchProspects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/hotels?statusDigital=none&limit=50&sortBy=score&sortOrder=desc')
      if (res.ok) {
        const data = await res.json()
        setHotels(data.hotels)
      }
      // Also fetch partial
      const res2 = await fetch('/api/hotels?statusDigital=partial&limit=50&sortBy=score&sortOrder=desc')
      if (res2.ok) {
        const data2 = await res2.json()
        setHotels(prev => [...prev, ...data2.hotels].sort((a, b) => b.score - a.score))
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les prospects', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchProspects() }, [fetchProspects])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === hotels.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(hotels.map(h => h.id)))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-guinea-red" />
            Prospects HOT
          </h2>
          <p className="text-xs text-muted-foreground">Hôtels sans site web ou présence digitale partielle — {hotels.length} prospects</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Badge variant="outline" className="h-8 px-3">{selectedIds.size} sélectionné(s)</Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchProspects}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : hotels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun prospect HOT trouvé</p>
            <p className="text-xs mt-1">Tous les hôtels ont une présence digitale complète !</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === hotels.length && hotels.length > 0}
              onChange={toggleAll}
              className="rounded border-gray-300"
            />
            <span className="text-xs text-muted-foreground">Tout sélectionner</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hotels.map((hotel) => (
              <Card key={hotel.id} className={`transition-colors ${selectedIds.has(hotel.id) ? 'border-guinea-green ring-1 ring-guinea-green/30' : ''}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(hotel.id)}
                      onChange={() => toggleSelect(hotel.id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm truncate">{hotel.name}</h3>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${PRIORITY_COLORS[hotel.priority]}`}>
                          {hotel.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 inline mr-1" />{hotel.city}, {hotel.region}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${DIGITAL_STATUS_COLORS[hotel.statusDigital]}`}>
                          {DIGITAL_STATUS_LABELS[hotel.statusDigital]}
                        </Badge>
                        <span className={`text-xs font-semibold ${getScoreColor(hotel.score)}`}>{hotel.score}/100</span>
                        {hotel.stars > 0 && (
                          <div className="flex">
                            {Array.from({ length: Math.min(hotel.stars, 5) }).map((_, i) => (
                              <Star key={i} className="h-2.5 w-2.5 fill-guinea-gold text-guinea-gold" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        {hotel.phone && (
                          <a href={`tel:${hotel.phone}`} className="text-xs flex items-center gap-1 text-guinea-green hover:underline">
                            <Phone className="h-3 w-3" /> Appeler
                          </a>
                        )}
                        {hotel.email && (
                          <a href={`mailto:${hotel.email}`} className="text-xs flex items-center gap-1 text-guinea-green hover:underline">
                            <Mail className="h-3 w-3" /> Email
                          </a>
                        )}
                        {hotel.wa && (
                          <a href={`https://wa.me/${hotel.wa.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-guinea-green hover:underline">
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PIPELINE CRM PAGE
// ============================================================================

function PipelinePage({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pipeline')
      if (res.ok) {
        const data = await res.json()
        setStages(data.stages)
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger le pipeline', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchPipeline() }, [fetchPipeline])

  const moveStage = async (hotelId: string, newStage: string) => {
    setMovingId(hotelId)
    try {
      const res = await fetch('/api/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, stage: newStage }),
      })
      if (res.ok) {
        toast({ title: 'Déplacé', description: `Hôtel déplacé vers ${STAGE_LABELS[newStage]}` })
        fetchPipeline()
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de déplacer', variant: 'destructive' })
    } finally {
      setMovingId(null)
    }
  }

  const stageOrder = ['nouveau', 'contacte', 'interesse', 'proposal', 'client']

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-guinea-green" />
            Pipeline CRM
          </h2>
          <p className="text-xs text-muted-foreground">Glissez les hôtels entre les étapes du pipeline</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPipeline}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stageOrder.map((stageKey) => {
          const stage = stages.find(s => s.stage === stageKey)
          const hotels = stage?.hotels ?? []
          return (
            <div key={stageKey} className="min-w-[220px] flex-1">
              {/* Stage Header */}
              <div className={`rounded-t-lg px-3 py-2 ${STAGE_COLORS[stageKey]} border font-semibold text-sm flex items-center justify-between`}>
                <span>{STAGE_LABELS[stageKey]}</span>
                <Badge variant="secondary" className="text-xs h-5">{stage?.count ?? 0}</Badge>
              </div>
              {/* Stage Body */}
              <div className="bg-muted/30 rounded-b-lg border border-t-0 min-h-[300px] p-2 space-y-2">
                {hotels.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun hôtel</p>
                ) : (
                  hotels.map((hotel) => (
                    <div key={hotel.id} className="kanban-card bg-card rounded-lg border p-3 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-xs leading-tight">{hotel.name}</h4>
                        <Badge variant="outline" className={`text-[8px] shrink-0 ml-1 ${PRIORITY_COLORS[hotel.priority]}`}>
                          {hotel.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{hotel.city}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] font-semibold ${getScoreColor(hotel.score)}`}>{hotel.score}/100</span>
                        <div className="flex gap-0.5">
                          {/* Move left */}
                          {stageOrder.indexOf(stageKey) > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={movingId === hotel.id}
                              onClick={() => moveStage(hotel.id, stageOrder[stageOrder.indexOf(stageKey) - 1])}
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                          )}
                          {/* Move right */}
                          {stageOrder.indexOf(stageKey) < stageOrder.length - 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={movingId === hotel.id}
                              onClick={() => moveStage(hotel.id, stageOrder[stageOrder.indexOf(stageKey) + 1])}
                            >
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// ANALYSE IA PAGE
// ============================================================================

function AnalyseIAPage({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [prompt, setPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string; provider?: string }[]>([])
  const [sending, setSending] = useState(false)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchProviders = useCallback(async () => {
    setLoadingProviders(true)
    try {
      const res = await fetch('/api/ai/providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers)
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingProviders(false)
    }
  }, [])

  const fetchHotels = useCallback(async () => {
    try {
      const res = await fetch('/api/hotels?limit=100&sortBy=name&sortOrder=asc')
      if (res.ok) {
        const data = await res.json()
        setHotels(data.hotels)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => { fetchProviders(); fetchHotels() }, [fetchProviders, fetchHotels])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  const configuredProviders = providers.filter(p => p.configured)

  const handleSend = async () => {
    if (!prompt.trim()) return
    setSending(true)
    const userMsg = prompt
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setPrompt('')

    try {
      const body: { prompt: string; hotelId?: string; preferredProvider?: string } = { prompt: userMsg }
      if (selectedHotelId) body.hotelId = selectedHotelId
      if (selectedProvider) body.preferredProvider = selectedProvider

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.text, provider: data.providerName }])
      } else {
        const data = await res.json()
        setChatHistory(prev => [...prev, { role: 'assistant', content: `❌ Erreur: ${data.error || 'Réponse invalide'}` }])
      }
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: '❌ Erreur de connexion au serveur' }])
    } finally {
      setSending(false)
    }
  }

  const applyTemplate = (templatePrompt: string) => {
    const hotel = hotels.find(h => h.id === selectedHotelId)
    let finalPrompt = templatePrompt
    if (hotel) {
      finalPrompt += `\n\nHôtel: ${hotel.name}\nVille: ${hotel.city}, ${hotel.region}\nSite web: ${hotel.web || 'Aucun'}\nTéléphone: ${hotel.phone || 'Non renseigné'}\nEmail: ${hotel.email || 'Non renseigné'}\nStatut digital: ${DIGITAL_STATUS_LABELS[hotel.statusDigital]}\nScore: ${hotel.score}/100`
    }
    setPrompt(finalPrompt)
  }

  return (
    <div className="space-y-4">
      {/* Provider Pills */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Fournisseurs IA:</span>
            {loadingProviders ? (
              <Skeleton className="h-6 w-24" />
            ) : providers.length === 0 ? (
              <span className="text-xs text-muted-foreground">Aucun configuré</span>
            ) : (
              providers.map((p) => (
                <Badge
                  key={p.id}
                  variant={p.configured ? 'default' : 'outline'}
                  className={`text-xs cursor-pointer ${p.configured ? 'bg-guinea-green' : 'opacity-50'}`}
                  onClick={() => p.configured && setSelectedProvider(selectedProvider === p.id ? '' : p.id)}
                >
                  {p.name}
                  {p.free && <span className="ml-1 text-[9px] opacity-80">gratuit</span>}
                  {p.configured && <Check className="h-3 w-3 ml-1" />}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Panel: Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-guinea-green" />
                Sélection hôtel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                <SelectTrigger><SelectValue placeholder="Choisir un hôtel..." /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {hotels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name} — {h.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedHotelId && (() => {
                const h = hotels.find(h => h.id === selectedHotelId)
                if (!h) return null
                return (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    <p className="font-medium">{h.name}</p>
                    <p className="text-muted-foreground">{h.city}, {h.region}</p>
                    <p>Statut: <Badge variant="outline" className={`text-[9px] ${DIGITAL_STATUS_COLORS[h.statusDigital]}`}>{DIGITAL_STATUS_LABELS[h.statusDigital]}</Badge></p>
                    <p>Score: <span className={getScoreColor(h.score)}>{h.score}/100</span></p>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-guinea-gold" />
                Modèles de prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {AI_PROMPT_TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon
                return (
                  <button
                    key={tmpl.id}
                    className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    onClick={() => applyTemplate(tmpl.prompt)}
                  >
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Icon className="h-3.5 w-3.5 text-guinea-green" />
                      {tmpl.label}
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Chat */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-guinea-green" />
              Chat IA
              {selectedProvider && (
                <Badge variant="outline" className="text-[10px] ml-2">
                  {providers.find(p => p.id === selectedProvider)?.name || selectedProvider}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-[400px]">
            {/* Chat messages */}
            <ScrollArea className="flex-1 mb-3">
              <div className="space-y-3 pr-4">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sélectionnez un hôtel et posez une question</p>
                    <p className="text-xs mt-1">ou utilisez un modèle de prompt</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-guinea-green text-white'
                        : 'bg-muted'
                    }`}>
                      {msg.role === 'assistant' && msg.provider && (
                        <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                          <Bot className="h-3 w-3" /> {msg.provider}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-guinea-green" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Posez votre question ou utilisez un modèle..."
                className="resize-none min-h-[60px] max-h-[120px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                disabled={sending}
              />
              <Button className="bg-guinea-green hover:bg-guinea-green-light self-end" onClick={handleSend} disabled={sending || !prompt.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// SETTINGS PAGE
// ============================================================================

function SettingsPage({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) setStats(await res.json())
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => { fetchProviders(); fetchStats() }, [fetchProviders, fetchStats])

  const handleSaveKey = async (providerId: string) => {
    const key = apiKeys[providerId]
    if (!key?.trim()) return
    setSaving(providerId)
    try {
      const res = await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, apiKey: key }),
      })
      if (res.ok) {
        toast({ title: 'Clé sauvegardée', description: `Clé API ${providerId} configurée avec succès` })
        setApiKeys(prev => ({ ...prev, [providerId]: '' }))
        fetchProviders()
      } else {
        const data = await res.json()
        toast({ title: 'Erreur', description: data.error || 'Impossible de sauvegarder', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Connexion impossible', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const handleDeleteKey = async (providerId: string) => {
    try {
      const res = await fetch(`/api/ai/providers/${providerId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Clé supprimée', description: `Clé API ${providerId} retirée` })
        fetchProviders()
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai"><Brain className="h-4 w-4 mr-1" /> Fournisseurs IA</TabsTrigger>
          <TabsTrigger value="agency"><Building2 className="h-4 w-4 mr-1" /> Agence</TabsTrigger>
          <TabsTrigger value="database"><Settings className="h-4 w-4 mr-1" /> Base de données</TabsTrigger>
        </TabsList>

        {/* AI Providers Tab */}
        <TabsContent value="ai" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Fournisseurs d&apos;IA</h3>
              <p className="text-xs text-muted-foreground">Configurez vos clés API pour activer l&apos;analyse IA. {providers.filter(p => p.configured).length}/{providers.length} configurés</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 7 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((provider) => (
                <Card key={provider.id} className={provider.configured ? 'border-guinea-green/30' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{provider.name}</h4>
                        {provider.free && <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600">Gratuit</Badge>}
                      </div>
                      {provider.configured ? (
                        <Badge className="bg-guinea-green text-[10px]">
                          <Check className="h-3 w-3 mr-1" /> Configuré
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Non configuré</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Modèle: {provider.defaultModel}</p>
                    {provider.keyPrefix && <p className="text-xs text-muted-foreground mb-2">Préfixe clé: <code className="bg-muted px-1 rounded">{provider.keyPrefix}</code></p>}
                    {provider.configured && provider.keyHint && (
                      <p className="text-xs text-muted-foreground mb-2">Clé: <code className="bg-muted px-1 rounded">{provider.keyHint}</code></p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Input
                        type="password"
                        placeholder={provider.configured ? 'Nouvelle clé API...' : 'Clé API...'}
                        className="text-xs"
                        value={apiKeys[provider.id] || ''}
                        onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveKey(provider.id)}
                      />
                      <Button size="sm" onClick={() => handleSaveKey(provider.id)} disabled={saving === provider.id || !apiKeys[provider.id]?.trim()}>
                        {saving === provider.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                      {provider.configured && (
                        <Button variant="outline" size="sm" onClick={() => handleDeleteKey(provider.id)} className="text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Agency Tab */}
        <TabsContent value="agency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informations de l&apos;agence</CardTitle>
              <CardDescription className="text-xs">Ces informations seront utilisées dans les communications de prospection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Nom de l&apos;agence</Label>
                  <Input placeholder="HotelScout Guinea" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email de contact</Label>
                  <Input placeholder="contact@hotelscout-gn.com" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Téléphone</Label>
                  <Input placeholder="+224 XXX XXX XXX" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Site web</Label>
                  <Input placeholder="https://hotelscout-gn.com" className="mt-1" />
                </div>
              </div>
              <Button className="bg-guinea-green hover:bg-guinea-green-light">Sauvegarder</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Statistiques de la base</CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total hôtels</span><span className="font-semibold">{formatNumber(stats.totalHotels)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Avec site web</span><span className="font-semibold">{formatNumber(stats.hotelsWithWebsite)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Avec téléphone</span><span className="font-semibold">{formatNumber(stats.hotelsWithPhone)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Avec email</span><span className="font-semibold">{formatNumber(stats.hotelsWithEmail)}</span></div>
                    <Separator />
                    <div className="flex justify-between"><span className="text-muted-foreground">Total contacts</span><span className="font-semibold">{formatNumber(stats.totalContacts)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Contacts (7 jours)</span><span className="font-semibold">{formatNumber(stats.recentContactsCount)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Prêt digital</span><span className="font-semibold">{stats.digitalReadiness}%</span></div>
                  </div>
                ) : (
                  <TableSkeleton rows={7} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actions de maintenance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => { fetch('/api/hotels/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verifyAll: true }) }); toast({ title: 'Vérification lancée' }) }}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Vérifier toutes les URLs
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => { fetch('/api/hotels/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrichAllMissing: true }) }); toast({ title: 'Enrichissement lancé' }) }}>
                  <Sparkles className="h-3.5 w-3.5 mr-2" /> Enrichir les données manquantes
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => { fetch('/api/cron/collect', { method: 'POST' }); toast({ title: 'Collecte lancée' }) }}>
                  <Search className="h-3.5 w-3.5 mr-2" /> Lancer la collecte automatique
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => { window.open('/api/export', '_blank'); toast({ title: 'Export lancé' }) }}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Exporter la base en CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function Home() {
  const [activePage, setActivePage] = useState<PageType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const { toast } = useToast()

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        setStats(await res.json())
      }
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePageChange = (page: PageType) => {
    setActivePage(page)
    setMobileMenuOpen(false)
    if (page === 'dashboard') fetchStats()
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage stats={stats} loading={statsLoading} onNavigate={handlePageChange} />
      case 'hotels':
        return <HotelsPage toast={toast} />
      case 'collecte':
        return <CollectePage toast={toast} />
      case 'prospects':
        return <ProspectsPage toast={toast} />
      case 'pipeline':
        return <PipelinePage toast={toast} />
      case 'ia':
        return <AnalyseIAPage toast={toast} />
      case 'settings':
        return <SettingsPage toast={toast} />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          activePage={activePage}
          onPageChange={handlePageChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-60 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar
            activePage={activePage}
            onPageChange={handlePageChange}
            collapsed={false}
            onToggle={() => setMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b flex items-center gap-3 px-4 bg-card shrink-0">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>

          {/* Page Title */}
          <div className="flex items-center gap-2">
            {React.createElement(PAGE_ICONS[activePage], { className: 'h-5 w-5 text-guinea-green' })}
            <h1 className="font-semibold text-sm md:text-base">{PAGE_LABELS[activePage]}</h1>
          </div>

          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchStats}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualiser les données</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="hidden sm:flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-guinea-red" />
              <div className="h-1.5 w-1.5 rounded-full bg-guinea-gold" />
              <div className="h-1.5 w-1.5 rounded-full bg-guinea-green" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </div>

        {/* Footer */}
        <footer className="h-8 border-t flex items-center justify-center px-4 bg-card shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>HotelScout Guinea v7</span>
            <span>•</span>
            <span>Prospection Hôtelière Intelligente</span>
            <div className="flex gap-0.5 ml-2">
              <div className="h-1 w-3 rounded-full bg-guinea-red" />
              <div className="h-1 w-3 rounded-full bg-guinea-gold" />
              <div className="h-1 w-3 rounded-full bg-guinea-green" />
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
