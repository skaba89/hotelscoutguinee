'use client'

import React, { useState, useEffect, useCallback, useRef, Component, ReactNode } from 'react'
import { useTheme } from '@/components/theme-provider'
import { useToast } from '@/hooks/use-toast'
import type { Hotel, Contact, AIAnalysis, VerificationLog, AIProvider, Stats, PipelineStage, Reservation, PlanningStep, PageType, AppUser } from '@/lib/types'
import { PAGE_LABELS, PAGE_ICONS, STAGE_LABELS, STAGE_COLORS, PRIORITY_COLORS, DIGITAL_STATUS_COLORS, DIGITAL_STATUS_LABELS, AI_PROMPT_TEMPLATES, ROOM_TYPE_LABELS, RESERVATION_STATUS_COLORS, RESERVATION_STATUS_LABELS, PLANNING_STEP_ICONS } from '@/lib/constants'
import { formatNumber, formatDate, formatDateTime, getScoreColor, getScoreBg } from '@/lib/format'
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
  Copy, Sparkles, ChevronDown, Info, Calendar, ShoppingCart, Bed,
  User, CreditCard, ClipboardList, AlertCircle, Sun, Moon, LogIn, LogOut, Lock
} from 'lucide-react'

// ============================================================================
// AUTH HELPERS — Bearer token management for API authentication
// ============================================================================

const AUTH_TOKEN_KEY = 'hotelscout_auth_token'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

/** Auth-aware fetch: automatically adds Bearer token to API requests */
async function authFetch(input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(init?.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Merge Content-Type if not already set and body is present
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, { ...init, headers })

  // If we get a 401, the token is invalid or expired
  if (response.status === 401 && token) {
    setAuthToken(null)
  }

  return response
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
// THEME TOGGLE COMPONENT
// ============================================================================

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {resolvedTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </span>
          </button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
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
  const pages: PageType[] = ['menu', 'dashboard', 'hotels', 'collecte', 'prospects', 'pipeline', 'ia', 'settings']

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

      {/* Dark mode toggle */}
      <div className="px-2 pb-2">
        <ThemeToggle />
      </div>

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
// MENU & RESERVATION PAGE (Homepage)
// ============================================================================

function MenuReservationPage({ toast, onNavigate }: { toast: ReturnType<typeof useToast>['toast']; onNavigate: (p: PageType) => void }) {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [showReservation, setShowReservation] = useState(false)
  const [reservationForm, setReservationForm] = useState({
    guestName: '', guestEmail: '', guestPhone: '',
    checkIn: '', checkOut: '', guests: 1, roomType: 'standard',
    specialRequests: '',
  })
  const [creating, setCreating] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [showReservations, setShowReservations] = useState(false)
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)
  const [showPlanning, setShowPlanning] = useState(false)
  const [newStep, setNewStep] = useState({ step: '', label: '' })
  const [showAddStep, setShowAddStep] = useState(false)
  const [updatingStep, setUpdatingStep] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [hotelsRes, statsRes] = await Promise.all([
        authFetch('/api/hotels?limit=200&sortBy=score&sortOrder=desc'),
        authFetch('/api/stats'),
      ])
      if (hotelsRes.ok) {
        const data = await hotelsRes.json()
        setHotels(data.hotels ?? [])
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data ?? null)
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchReservations = useCallback(async () => {
    try {
      const res = await authFetch('/api/reservations')
      if (res.ok) {
        const data = await res.json()
        setReservations(data.reservations ?? [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  // Derived data
  const regions = stats ? Object.keys(stats.byRegion).sort() : []
  const categories = ['all', ...new Set(hotels.map(h => h.stars > 0 ? `${h.stars} étoiles` : 'Non classé'))].filter(Boolean)

  const filteredHotels = hotels.filter(h => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !h.city.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedRegion !== 'all' && h.region !== selectedRegion) return false
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'Non classé' && h.stars > 0) return false
      if (selectedCategory !== 'Non classé' && h.stars !== parseInt(selectedCategory)) return false
    }
    return true
  })

  const handleCreateReservation = async () => {
    if (!selectedHotel || !reservationForm.guestName || !reservationForm.checkIn || !reservationForm.checkOut) {
      toast({ title: 'Champs manquants', description: 'Remplissez le nom, les dates et sélectionnez un hôtel', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await authFetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: selectedHotel.id,
          ...reservationForm,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({ title: 'Réservation créée', description: `Confirmation: ${data.reservation?.confirmationCode ?? 'N/A'}` })
        setShowReservation(false)
        setActiveReservation(data.reservation ?? null)
        setShowPlanning(true)
        fetchReservations()
        setReservationForm({ guestName: '', guestEmail: '', guestPhone: '', checkIn: '', checkOut: '', guests: 1, roomType: 'standard', specialRequests: '' })
      } else {
        const data = await res.json()
        toast({ title: 'Erreur', description: data.error || 'Impossible de créer la réservation', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Connexion impossible', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateStep = async (stepId: string, status: string) => {
    setUpdatingStep(stepId)
    try {
      const res = await authFetch('/api/planning', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, status }),
      })
      if (res.ok) {
        toast({ title: 'Étape mise à jour', description: status === 'completed' ? 'Étape terminée' : status === 'skipped' ? 'Étape ignorée' : 'Étape en cours' })
        // Refresh the active reservation
        if (activeReservation) {
          const res2 = await fetch(`/api/reservations/${activeReservation.id}`)
          if (res2.ok) {
            const data = await res2.json()
            setActiveReservation(data.reservation ?? null)
          }
        }
        fetchReservations()
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour', variant: 'destructive' })
    } finally {
      setUpdatingStep(null)
    }
  }

  const handleAddStep = async () => {
    if (!activeReservation || !newStep.step || !newStep.label) return
    try {
      const res = await authFetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: activeReservation.id, step: newStep.step, label: newStep.label }),
      })
      if (res.ok) {
        toast({ title: 'Étape ajoutée', description: 'Nouvelle étape de planning ajoutée' })
        setShowAddStep(false)
        setNewStep({ step: '', label: '' })
        // Refresh
        const res2 = await fetch(`/api/reservations/${activeReservation.id}`)
        if (res2.ok) {
          const data = await res2.json()
          setActiveReservation(data.reservation ?? null)
        }
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter l\'étape', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-guinea-green via-guinea-green-light to-guinea-green p-8 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-9xl font-bold opacity-20">GH</div>
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">HotelScout Guinée</h1>
          <p className="text-white/80 text-sm md:text-base mb-4">Trouvez et réservez le meilleur hôtel en Guinée — Planifiez votre séjour de bout en bout</p>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-sm">
              <span className="font-bold text-lg">{stats?.totalHotels ?? 0}</span> hôtels
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-sm">
              <span className="font-bold text-lg">{regions.length}</span> régions
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-sm">
              <span className="font-bold text-lg">{reservations.length}</span> réservations
            </div>
            <Button
              variant="secondary"
              className="bg-guinea-gold hover:bg-guinea-gold-light text-black"
              onClick={() => setShowReservations(true)}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Mes réservations
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un hôtel ou une ville..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Région" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les régions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {categories.filter(c => c !== 'all').map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">{filteredHotels.length} hôtels trouvés</span>
          </div>
        </CardContent>
      </Card>

      {/* Hotels Grid */}
      {filteredHotels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun hôtel trouvé</p>
            <p className="text-xs mt-1">Modifiez vos critères de recherche</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHotels.map((hotel) => (
            <Card key={hotel.id} className="transition-all hover:shadow-lg hover:-translate-y-0.5 group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold group-hover:text-guinea-green transition-colors">{hotel.name}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.region}
                    </CardDescription>
                  </div>
                  {hotel.stars > 0 && (
                    <div className="flex">
                      {Array.from({ length: Math.min(hotel.stars, 5) }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-guinea-gold text-guinea-gold" />
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className={`text-[10px] ${DIGITAL_STATUS_COLORS[hotel.statusDigital]}`}>
                    {DIGITAL_STATUS_LABELS[hotel.statusDigital]}
                  </Badge>
                  {hotel.hasBooking && <Badge className="text-[9px] h-5 bg-blue-600">Booking</Badge>}
                  {hotel.hasTripadvisor && <Badge className="text-[9px] h-5 bg-emerald-600">TA</Badge>}
                  <Badge variant="outline" className={`text-[10px] ${PRIORITY_COLORS[hotel.priority]}`}>
                    {hotel.priority.toUpperCase()}
                  </Badge>
                </div>
                {hotel.rooms > 0 && (
                  <p className="text-xs text-muted-foreground mb-1"><Bed className="h-3 w-3 inline mr-1" />{hotel.rooms} chambres</p>
                )}
                {hotel.priceUsd && (
                  <p className="text-xs text-muted-foreground mb-2">A partir de <span className="font-semibold text-guinea-green">{hotel.priceUsd}</span></p>
                )}
                <div className="flex gap-2 mt-2">
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
                </div>
                <Button
                  className="w-full mt-3 bg-guinea-green hover:bg-guinea-green-light text-sm h-9"
                  onClick={() => { setSelectedHotel(hotel); setShowReservation(true) }}
                >
                  <Calendar className="h-4 w-4 mr-2" /> Réserver
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reservation Dialog */}
      <Dialog open={showReservation} onOpenChange={setShowReservation}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-guinea-green" />
              Réserver — {selectedHotel?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedHotel?.city}, {selectedHotel?.region}
              {selectedHotel?.stars ? ` — ${selectedHotel.stars} étoiles` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nom complet *</Label><Input className="mt-1" value={reservationForm.guestName} onChange={(e) => setReservationForm(p => ({ ...p, guestName: e.target.value }))} placeholder="Votre nom" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" className="mt-1" value={reservationForm.guestEmail} onChange={(e) => setReservationForm(p => ({ ...p, guestEmail: e.target.value }))} placeholder="email@exemple.com" /></div>
              <div><Label className="text-xs">Téléphone</Label><Input className="mt-1" value={reservationForm.guestPhone} onChange={(e) => setReservationForm(p => ({ ...p, guestPhone: e.target.value }))} placeholder="+224 XXX XXX XXX" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date d&apos;arrivée *</Label><Input type="date" className="mt-1" value={reservationForm.checkIn} onChange={(e) => setReservationForm(p => ({ ...p, checkIn: e.target.value }))} /></div>
              <div><Label className="text-xs">Date de départ *</Label><Input type="date" className="mt-1" value={reservationForm.checkOut} onChange={(e) => setReservationForm(p => ({ ...p, checkOut: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nombre de personnes</Label>
                <Input type="number" min={1} max={10} className="mt-1" value={reservationForm.guests} onChange={(e) => setReservationForm(p => ({ ...p, guests: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label className="text-xs">Type de chambre</Label>
                <Select value={reservationForm.roomType} onValueChange={(v) => setReservationForm(p => ({ ...p, roomType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Demandes spéciales</Label><Textarea className="mt-1" value={reservationForm.specialRequests} onChange={(e) => setReservationForm(p => ({ ...p, specialRequests: e.target.value }))} placeholder="Arrivée tardive, préférences..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReservation(false)}>Annuler</Button>
            <Button className="bg-guinea-green hover:bg-guinea-green-light" onClick={handleCreateReservation} disabled={creating || !reservationForm.guestName || !reservationForm.checkIn || !reservationForm.checkOut}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Confirmer la réservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reservations List Dialog */}
      <Dialog open={showReservations} onOpenChange={setShowReservations}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-guinea-green" />
              Mes réservations
            </DialogTitle>
            <DialogDescription>{reservations.length} réservation(s)</DialogDescription>
          </DialogHeader>
          {reservations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Aucune réservation</p>
              <p className="text-xs mt-1">Réservez un hôtel pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reservations.map((res) => (
                <Card key={res.id} className="cursor-pointer hover:border-guinea-green/50 transition-colors" onClick={() => { setActiveReservation(res); setShowPlanning(true); setShowReservations(false) }}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{res.hotel?.name ?? 'Hôtel'}</p>
                        <p className="text-xs text-muted-foreground">{res.hotel?.city}, {res.hotel?.region}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${RESERVATION_STATUS_COLORS[res.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {RESERVATION_STATUS_LABELS[res.status] ?? res.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(res.checkIn)} → {formatDate(res.checkOut)}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {res.guests} pers.</span>
                      <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {ROOM_TYPE_LABELS[res.roomType] ?? res.roomType}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {res.nights} nuit(s)</span>
                    </div>
                    {res.confirmationCode && (
                      <p className="text-xs mt-2 font-mono text-guinea-green">Code: {res.confirmationCode}</p>
                    )}
                    {res.planningSteps && res.planningSteps.length > 0 && (
                      <div className="mt-2">
                        <Progress value={(res.planningSteps.filter(s => s.status === 'completed').length / res.planningSteps.length) * 100} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">{res.planningSteps.filter(s => s.status === 'completed').length}/{res.planningSteps.length} étapes complétées</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Planning Timeline Dialog */}
      <Dialog open={showPlanning} onOpenChange={setShowPlanning}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-guinea-green" />
              Planning de la réservation
            </DialogTitle>
            <DialogDescription>
              {activeReservation?.hotel?.name} — {activeReservation?.confirmationCode}
            </DialogDescription>
          </DialogHeader>
          {activeReservation?.planningSteps && (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Progression</span>
                  <span className="font-semibold">{activeReservation.planningSteps?.filter(s => s.status === 'completed').length ?? 0}/{activeReservation.planningSteps?.length ?? 0}</span>
                </div>
                <Progress value={activeReservation.planningSteps?.length ? (activeReservation.planningSteps.filter(s => s.status === 'completed').length / activeReservation.planningSteps.length) * 100 : 0} className="h-2" />
              </div>
              <div className="space-y-2">
                {activeReservation.planningSteps.map((step, idx) => {
                  const StepIcon = PLANNING_STEP_ICONS[step.step] ?? CheckCircle2
                  const isCompleted = step.status === 'completed'
                  const isPending = step.status === 'pending'
                  const isOverdue = isPending && step.scheduledAt && new Date(step.scheduledAt) < new Date()
                  return (
                    <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isCompleted ? 'bg-emerald-50 border-emerald-200' :
                      isOverdue ? 'bg-red-50 border-red-200' :
                      'bg-muted/30 border-muted'
                    }`}>
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-emerald-500 text-white' :
                          isOverdue ? 'bg-red-500 text-white' :
                          'bg-guinea-gold text-white'
                        }`}>
                          {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                        </div>
                        {idx < (activeReservation.planningSteps?.length ?? 0) - 1 && (
                          <div className={`w-0.5 h-6 ${isCompleted ? 'bg-emerald-300' : 'bg-muted'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-700 line-through' : isOverdue ? 'text-red-700' : ''}`}>
                            {step.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {isCompleted && <Badge className="text-[9px] bg-emerald-500">Fait</Badge>}
                            {isOverdue && <Badge className="text-[9px] bg-red-500">En retard</Badge>}
                            {isPending && !isOverdue && <Badge className="text-[9px] bg-amber-500">En attente</Badge>}
                          </div>
                        </div>
                        {step.scheduledAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Prévu: {formatDateTime(step.scheduledAt)}
                          </p>
                        )}
                        {step.completedAt && (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            <CheckCircle2 className="h-3 w-3 inline mr-1" />
                            Complété: {formatDateTime(step.completedAt)}
                          </p>
                        )}
                        {!isCompleted && (
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              disabled={updatingStep === step.id}
                              onClick={() => handleUpdateStep(step.id, 'completed')}>
                              {updatingStep === step.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                              Terminer
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" 
                              disabled={updatingStep === step.id}
                              onClick={() => handleUpdateStep(step.id, 'skipped')}>
                              Ignorer
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button variant="outline" className="w-full mt-3" onClick={() => setShowAddStep(true)}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter une étape
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Custom Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Ajouter une étape de planning</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Identifiant</Label><Input className="mt-1 text-sm" value={newStep.step} onChange={(e) => setNewStep(p => ({ ...p, step: e.target.value }))} placeholder="ex: transport" /></div>
            <div><Label className="text-xs">Libellé</Label><Input className="mt-1 text-sm" value={newStep.label} onChange={(e) => setNewStep(p => ({ ...p, label: e.target.value }))} placeholder="ex: Organisation transport" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStep(false)}>Annuler</Button>
            <Button className="bg-guinea-green hover:bg-guinea-green-light" onClick={handleAddStep} disabled={!newStep.step || !newStep.label}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating mobile reservations button */}
      <div className="fixed bottom-16 right-4 md:hidden z-50">
        <Button
          className="rounded-full h-12 w-12 shadow-lg bg-guinea-gold hover:bg-guinea-gold-light text-black"
          onClick={() => setShowReservations(true)}
        >
          <ClipboardList className="h-5 w-5" />
        </Button>
      </div>
    </div>
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
                <span className="text-sm font-semibold">{formatNumber(stats.hotelsWithBooking ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">TA</div>
                  <span className="text-sm">TripAdvisor</span>
                </div>
                <span className="text-sm font-semibold">{formatNumber(stats.hotelsWithTripadvisor ?? 0)}</span>
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
  const [availableRegions, setAvailableRegions] = useState<string[]>([])
  const [editHotel, setEditHotel] = useState<Hotel | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const limit = 15

  // Fetch available regions from stats
  useEffect(() => {
    authFetch('/api/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.byRegion && typeof data.byRegion === 'object') {
          setAvailableRegions(Object.keys(data.byRegion).sort())
        }
      })
      .catch(() => {})
  }, [])

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
        setHotels(data.hotels ?? [])
        setTotalPages(data.pagination?.totalPages ?? 1)
        setTotal(data.pagination?.total ?? 0)
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
        setHotelDetail(data.hotel ?? null)
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

  const handleEditHotel = (hotel: Hotel) => {
    setEditHotel(hotel)
    setEditForm({
      name: hotel.name,
      city: hotel.city,
      region: hotel.region,
      stars: hotel.stars,
      phone: hotel.phone ?? '',
      email: hotel.email ?? '',
      web: hotel.web ?? '',
      rooms: hotel.rooms,
      priceUsd: hotel.priceUsd ?? '',
      notes: hotel.notes ?? '',
      address: hotel.address ?? '',
      priority: hotel.priority,
      pipelineStage: hotel.pipelineStage,
      statusDigital: hotel.statusDigital,
    })
  }

  const handleSaveEdit = async () => {
    if (!editHotel) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/hotels/${editHotel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast({ title: 'Mis à jour', description: 'Hôtel modifié avec succès' })
        setEditHotel(null)
        fetchHotels()
      } else {
        toast({ title: 'Erreur', description: 'Impossible de modifier', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Connexion impossible', variant: 'destructive' })
    } finally {
      setEditSaving(false)
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
                {availableRegions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEditHotel(hotel) }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(hotel.id) }}>
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

      {/* Edit Hotel Dialog */}
      <Dialog open={!!editHotel} onOpenChange={(open) => { if (!open) setEditHotel(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-guinea-green" />
              Modifier l&apos;hôtel
            </DialogTitle>
            <DialogDescription>{editHotel?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nom</Label><Input className="mt-1 text-sm" value={String(editForm.name ?? '')} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label className="text-xs">Ville</Label><Input className="mt-1 text-sm" value={String(editForm.city ?? '')} onChange={(e) => setEditForm(p => ({ ...p, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Région</Label><Input className="mt-1 text-sm" value={String(editForm.region ?? '')} onChange={(e) => setEditForm(p => ({ ...p, region: e.target.value }))} /></div>
              <div><Label className="text-xs">Étoiles</Label><Input type="number" min={0} max={5} className="mt-1 text-sm" value={String(editForm.stars ?? 0)} onChange={(e) => setEditForm(p => ({ ...p, stars: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Téléphone</Label><Input className="mt-1 text-sm" value={String(editForm.phone ?? '')} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label className="text-xs">Email</Label><Input className="mt-1 text-sm" value={String(editForm.email ?? '')} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Site web</Label><Input className="mt-1 text-sm" value={String(editForm.web ?? '')} onChange={(e) => setEditForm(p => ({ ...p, web: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Chambres</Label><Input type="number" min={0} className="mt-1 text-sm" value={String(editForm.rooms ?? 0)} onChange={(e) => setEditForm(p => ({ ...p, rooms: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label className="text-xs">Prix (USD)</Label><Input className="mt-1 text-sm" value={String(editForm.priceUsd ?? '')} onChange={(e) => setEditForm(p => ({ ...p, priceUsd: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Priorité</Label>
                <Select value={String(editForm.priority ?? 'cold')} onValueChange={(v) => setEditForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">🔥 HOT</SelectItem>
                    <SelectItem value="warm">🌤 Tiède</SelectItem>
                    <SelectItem value="cold">❄️ Froid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Pipeline</Label>
                <Select value={String(editForm.pipelineStage ?? 'nouveau')} onValueChange={(v) => setEditForm(p => ({ ...p, pipelineStage: v }))}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Adresse</Label>
              <Input className="mt-1 text-sm" value={String(editForm.address ?? '')} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="mt-1 text-sm" value={String(editForm.notes ?? '')} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHotel(null)}>Annuler</Button>
            <Button className="bg-guinea-green hover:bg-guinea-green-light" onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-guinea-red">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L&apos;hôtel et toutes ses données associées seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirmId) { handleDeleteHotel(deleteConfirmId); setDeleteConfirmId(null) } }}>
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  const [results, setResults] = useState<{ searched: number; added: number; verified: number; enriched: number } | null>(null)
  const [verifyResults, setVerifyResults] = useState<{ verified: number; summary: Record<string, number> } | null>(null)
  const [enrichResults, setEnrichResults] = useState<{ totalProcessed: number; enriched: number; notEnriched: number } | null>(null)
  const [searchResults, setSearchResults] = useState<{ totalResults: number; hotelsAdded: number; hotelsSkipped: number } | null>(null)

  const handleCollect = async () => {
    setCollecting(true)
    setResults(null)
    try {
      const res = await authFetch('/api/cron/scheduled', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        toast({ title: 'Collecte terminée', description: `${data.added ?? 0} ajoutés, ${data.enriched ?? 0} enrichis, ${data.verified ?? 0} vérifiés` })
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
      const res = await authFetch('/api/hotels/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verifyAll: true }) })
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
      const res = await authFetch('/api/hotels/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrichAllMissing: true }) })
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
      const res = await authFetch('/api/hotels/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: searchQuery }) })
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
                <div className="flex justify-between"><span className="text-muted-foreground">Recherches web</span><span className="font-semibold">{results.searched ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-emerald-600">Ajoutés</span><span className="font-semibold text-emerald-600">{results.added ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-blue-600">Enrichis</span><span className="font-semibold text-blue-600">{results.enriched ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-amber-600">URLs vérifiées</span><span className="font-semibold text-amber-600">{results.verified ?? 0}</span></div>
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
      const res = await authFetch('/api/hotels?statusDigital=none&limit=50&sortBy=score&sortOrder=desc')
      if (res.ok) {
        const data = await res.json()
        setHotels(data.hotels ?? [])
      }
      // Also fetch partial
      const res2 = await authFetch('/api/hotels?statusDigital=partial&limit=50&sortBy=score&sortOrder=desc')
      if (res2.ok) {
        const data2 = await res2.json()
        setHotels(prev => [...prev, ...(data2.hotels ?? [])].sort((a, b) => b.score - a.score))
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
      const res = await authFetch('/api/pipeline')
      if (res.ok) {
        const data = await res.json()
        setStages(data.stages ?? [])
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
      const res = await authFetch('/api/pipeline', {
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
      const res = await authFetch('/api/ai/providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingProviders(false)
    }
  }, [])

  const fetchHotels = useCallback(async () => {
    try {
      const res = await authFetch('/api/hotels?limit=100&sortBy=name&sortOrder=asc')
      if (res.ok) {
        const data = await res.json()
        setHotels(data.hotels ?? [])
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

      const res = await authFetch('/api/ai/chat', {
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
  const [agency, setAgency] = useState({ name: '', email: '', phone: '', website: '', address: '' })
  const [agencySaving, setAgencySaving] = useState(false)
  const [users, setUsers] = useState<AppUser[]>([])
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', email: '', role: 'agent' })
  const [addingUser, setAddingUser] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/ai/providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data ?? null)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const fetchAgency = useCallback(async () => {
    try {
      const res = await authFetch('/api/agency')
      if (res.ok) {
        const data = await res.json()
        const s = data.settings
        setAgency({
          name: s?.name ?? '',
          email: s?.email ?? '',
          phone: s?.phone ?? '',
          website: s?.website ?? '',
          address: s?.address ?? '',
        })
      }
    } catch {
      /* ignore */
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
      }
    } catch {
      /* ignore - users table may not exist yet */
    }
  }, [])

  useEffect(() => { fetchProviders(); fetchStats(); fetchAgency(); fetchUsers() }, [fetchProviders, fetchStats, fetchAgency, fetchUsers])

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast({ title: 'Champs manquants', description: 'Nom d\'utilisateur, mot de passe et nom sont requis', variant: 'destructive' })
      return
    }
    setAddingUser(true)
    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      if (res.ok) {
        toast({ title: 'Utilisateur ajouté', description: `${newUser.name} (${newUser.role}) créé avec succès` })
        setNewUser({ username: '', password: '', name: '', email: '', role: 'agent' })
        setShowNewUser(false)
        fetchUsers()
      } else {
        const data = await res.json()
        toast({ title: 'Erreur', description: data.error || 'Impossible de créer l\'utilisateur', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Connexion impossible', variant: 'destructive' })
    } finally {
      setAddingUser(false)
    }
  }

  const handleToggleUser = async (userId: string, isActive: boolean) => {
    try {
      const res = await authFetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        toast({ title: isActive ? 'Utilisateur désactivé' : 'Utilisateur réactivé', description: 'Statut mis à jour' })
        fetchUsers()
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de modifier', variant: 'destructive' })
    }
  }

  const handleSaveAgency = async () => {
    setAgencySaving(true)
    try {
      const res = await authFetch('/api/agency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agency),
      })
      if (res.ok) {
        toast({ title: 'Sauvegardé', description: 'Informations de l\'agence mises à jour' })
      } else {
        toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Connexion impossible', variant: 'destructive' })
    } finally {
      setAgencySaving(false)
    }
  }

  const handleSaveKey = async (providerId: string) => {
    const key = apiKeys[providerId]
    if (!key?.trim()) return
    setSaving(providerId)
    try {
      const res = await authFetch('/api/ai/providers', {
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
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Utilisateurs</TabsTrigger>
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
                  <Input placeholder="HotelScout Guinea" className="mt-1" value={agency.name} onChange={(e) => setAgency(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Email de contact</Label>
                  <Input placeholder="contact@hotelscout-gn.com" className="mt-1" value={agency.email} onChange={(e) => setAgency(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Téléphone</Label>
                  <Input placeholder="+224 XXX XXX XXX" className="mt-1" value={agency.phone} onChange={(e) => setAgency(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Site web</Label>
                  <Input placeholder="https://hotelscout-gn.com" className="mt-1" value={agency.website} onChange={(e) => setAgency(p => ({ ...p, website: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Adresse</Label>
                <Input placeholder="Conakry, Guinée" className="mt-1" value={agency.address} onChange={(e) => setAgency(p => ({ ...p, address: e.target.value }))} />
              </div>
              <Button className="bg-guinea-green hover:bg-guinea-green-light" onClick={handleSaveAgency} disabled={agencySaving}>
                {agencySaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Gestion des utilisateurs</h3>
              <p className="text-xs text-muted-foreground">{users.length} utilisateur{users.length !== 1 ? 's' : ''} enregistré{users.length !== 1 ? 's' : ''}</p>
            </div>
            <Button size="sm" className="bg-guinea-green hover:bg-guinea-green-light" onClick={() => setShowNewUser(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un utilisateur
            </Button>
          </div>

          {/* New User Form */}
          {showNewUser && (
            <Card className="border-guinea-green/30">
              <CardHeader>
                <CardTitle className="text-sm">Nouvel utilisateur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Nom d&apos;utilisateur *</Label>
                    <Input placeholder="ex: agent1" className="mt-1" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Mot de passe *</Label>
                    <Input type="password" placeholder="Min. 6 caractères" className="mt-1" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Nom complet *</Label>
                    <Input placeholder="ex: Mamadou Bah" className="mt-1" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input type="email" placeholder="email@exemple.com" className="mt-1" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Rôle</Label>
                    <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="viewer">Observateur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="bg-guinea-green hover:bg-guinea-green-light" onClick={handleAddUser} disabled={addingUser}>
                    {addingUser ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Créer l&apos;utilisateur
                  </Button>
                  <Button variant="outline" onClick={() => { setShowNewUser(false); setNewUser({ username: '', password: '', name: '', email: '', role: 'agent' }) }}>Annuler</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          {users.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Aucun utilisateur en base de données</p>
                <p className="text-xs text-muted-foreground mt-1">Utilisez ADMIN_PASSWORD pour le super-admin ou ajoutez des utilisateurs ci-dessus</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Utilisateur</TableHead>
                      <TableHead className="text-xs">Nom</TableHead>
                      <TableHead className="text-xs">Rôle</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">Dernière connexion</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="text-xs font-mono">{user.username}</TableCell>
                        <TableCell className="text-xs">{user.name}</TableCell>
                        <TableCell>
                          <Badge className={user.role === 'admin' ? 'bg-guinea-red text-[10px]' : user.role === 'agent' ? 'bg-guinea-green text-[10px]' : 'bg-blue-500 text-[10px]'}>
                            {user.role === 'admin' ? 'Admin' : user.role === 'agent' ? 'Agent' : 'Observateur'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'outline'} className={user.isActive ? 'bg-emerald-500 text-[10px]' : 'text-[10px]'}>
                            {user.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Jamais'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleToggleUser(user.id, user.isActive)}>
                            {user.isActive ? <XCircle className="h-3 w-3 mr-1 text-amber-500" /> : <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />}
                            {user.isActive ? 'Désactiver' : 'Réactiver'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Role descriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Descriptions des rôles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <Badge className="bg-guinea-red text-[10px] shrink-0">Admin</Badge>
                  <span className="text-muted-foreground">Accès complet : gestion des utilisateurs, configuration IA, export, toutes les opérations de lecture et écriture</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="bg-guinea-green text-[10px] shrink-0">Agent</Badge>
                  <span className="text-muted-foreground">Opérations courantes : création/modification d&apos;hôtels, réservations, contacts, collecte, prospection</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="bg-blue-500 text-[10px] shrink-0">Observateur</Badge>
                  <span className="text-muted-foreground">Lecture seule : consultation des données, tableau de bord, statistiques</span>
                </div>
              </div>
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
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => { authFetch('/api/hotels/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verifyAll: true }) }); toast({ title: 'Vérification lancée' }) }}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Vérifier toutes les URLs
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => { authFetch('/api/hotels/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrichAllMissing: true }) }); toast({ title: 'Enrichissement lancé' }) }}>
                  <Sparkles className="h-3.5 w-3.5 mr-2" /> Enrichir les données manquantes
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => { authFetch('/api/cron/scheduled', { method: 'POST' }); toast({ title: 'Collecte lancée' }) }}>
                  <Search className="h-3.5 w-3.5 mr-2" /> Lancer la collecte automatique
                </Button>
                <Button variant="outline" className="w-full justify-start text-xs" onClick={async () => { try { const res = await authFetch('/api/export'); if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); window.open(url, '_blank'); } else { toast({ title: 'Erreur', description: 'Export non autorisé', variant: 'destructive' }); } } catch { toast({ title: 'Erreur', description: 'Export échoué', variant: 'destructive' }); } }}>
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
// LOGIN MODAL — Authenticates admin user to get Bearer token
// ============================================================================

function LoginModal({ open, onClose, onLogin }: { open: boolean; onClose: () => void; onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.authenticated) {
        if (data.token) {
          setAuthToken(data.token)
          onLogin(data.token)
        } else {
          // No ADMIN_PASSWORD set — auth not required
          onLogin('__no_auth_required__')
        }
        onClose()
      } else {
        setError(data.error || 'Identifiants invalides')
      }
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-guinea-green/10">
            <Lock className="h-6 w-6 text-guinea-green" />
          </div>
          <CardTitle className="text-lg">Connexion Admin</CardTitle>
          <CardDescription>Entrez vos identifiants pour accéder à l&apos;application</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Nom d&apos;utilisateur</Label>
              <Input id="login-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Mot de passe</Label>
              <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe admin" />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full bg-guinea-green hover:bg-guinea-green-light" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// ERROR BOUNDARY — Prevents the entire app from crashing on runtime errors
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-lg">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto text-muted-foreground">
                  {this.state.error.message}
                </pre>
              )}
              <Button
                className="w-full"
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function HomeInner() {
  const [activePage, setActivePage] = useState<PageType>('menu')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [dbError, setDbError] = useState(false)
  const { toast } = useToast()

  // Check for existing auth token on mount — no blocking API call needed
  useEffect(() => {
    const token = getAuthToken()
    if (token) {
      setIsAuthenticated(true)
    }
    // If no token, try a lightweight probe to see if auth is required
    // We use fetch('/api/auth') with no body — if ADMIN_PASSWORD is not set,
    // the server returns { authenticated: true, token: null }
    if (!token) {
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then(res => res.json()).then(data => {
        if (data.authenticated && !data.token) {
          // No ADMIN_PASSWORD set — no auth needed
          setIsAuthenticated(true)
          setAuthToken('__no_auth_required__')
        } else {
          setShowLogin(true)
        }
      }).catch(() => {
        // Network error — try without auth (might be a public instance)
        setIsAuthenticated(true)
        setAuthToken('__no_auth_required__')
      })
    }
  }, [])

  const handleLogin = (token: string) => {
    setIsAuthenticated(true)
    setShowLogin(false)
    fetchStats()
  }

  const handleLogout = () => {
    setAuthToken(null)
    setIsAuthenticated(false)
    setShowLogin(true)
  }

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await authFetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data ?? null)
        setDbError(!!data?.dbError)
      } else {
        setDbError(true)
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
      case 'menu':
        return <MenuReservationPage toast={toast} onNavigate={handlePageChange} />
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

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginModal open={showLogin} onClose={() => {}} onLogin={handleLogin} />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md w-full mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-guinea-green/10">
                <Building2 className="h-6 w-6 text-guinea-green" />
              </div>
              <CardTitle className="text-lg">HotelScout Guinée</CardTitle>
              <CardDescription>Authentification requise pour accéder à l&apos;application</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="bg-guinea-green hover:bg-guinea-green-light" onClick={() => setShowLogin(true)}>
                <LogIn className="h-4 w-4 mr-2" /> Se connecter
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />
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
        {/* Database Error Banner */}
        {dbError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Base de données indisponible — les données affichées peuvent être vides. Redémarrez le service ou vérifiez la configuration.</span>
          </div>
        )}
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
            {isAuthenticated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Déconnexion</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
    </>
  )
}

export default function Home() {
  return (
    <ErrorBoundary>
      <HomeInner />
    </ErrorBoundary>
  )
}
