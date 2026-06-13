// HotelScout Guinea — Shared Constants
import React from 'react'
import {
  LayoutDashboard, Building2, Search, Flame, GitBranch, Brain, Settings,
  ShoppingCart, Wifi, Send, Eye, CheckCircle2, CreditCard, AlertCircle,
  Bed, Clock, MessageSquare,
} from 'lucide-react'
import type { PageType } from './types'

export const PAGE_LABELS: Record<PageType, string> = {
  menu: 'Menu & Réservation',
  dashboard: 'Tableau de bord',
  hotels: 'Base Hôtels',
  collecte: 'Agent de Collecte',
  prospects: 'Prospects HOT',
  pipeline: 'Pipeline CRM',
  ia: 'Analyse IA',
  settings: 'Paramètres',
}

export const PAGE_ICONS: Record<PageType, React.ElementType> = {
  menu: ShoppingCart,
  dashboard: LayoutDashboard,
  hotels: Building2,
  collecte: Search,
  prospects: Flame,
  pipeline: GitBranch,
  ia: Brain,
  settings: Settings,
}

export const STAGE_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  interesse: 'Intéressé',
  proposal: 'Proposition',
  client: 'Client',
}

export const STAGE_COLORS: Record<string, string> = {
  nouveau: 'bg-slate-100 text-slate-700 border-slate-300',
  contacte: 'bg-blue-50 text-blue-700 border-blue-300',
  interesse: 'bg-amber-50 text-amber-700 border-amber-300',
  proposal: 'bg-purple-50 text-purple-700 border-purple-300',
  client: 'bg-emerald-50 text-emerald-700 border-emerald-300',
}

export const PRIORITY_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700 border-red-300',
  warm: 'bg-amber-100 text-amber-700 border-amber-300',
  cold: 'bg-slate-100 text-slate-600 border-slate-300',
}

export const DIGITAL_STATUS_COLORS: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  none: 'bg-red-100 text-red-700',
}

export const DIGITAL_STATUS_LABELS: Record<string, string> = {
  ok: 'Complet',
  partial: 'Partiel',
  none: 'Aucun',
}

export const AI_PROMPT_TEMPLATES = [
  { id: 'digital', label: 'Analyse digitale', icon: Wifi, prompt: 'Analyse la présence digitale de cet hôtel en Guinée. Évalue son site web, ses plateformes de réservation, et propose des améliorations concrètes pour augmenter sa visibilité en ligne.' },
  { id: 'prospect', label: 'Message de prospection', icon: Send, prompt: 'Rédige un message de prospection professionnel et personnalisé pour cet hôtel en Guinée, en proposant nos services de création de site web et de présence digitale. Le ton doit être chaleureux mais professionnel.' },
  { id: 'audit', label: 'Audit concurrentiel', icon: Eye, prompt: 'Réalise un audit concurrentiel pour cet hôtel en Guinée. Compare sa présence digitale avec les standards de l\'industrie hôtelière en Afrique de l\'Ouest et identifie les opportunités d\'amélioration.' },
]

export const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  superior: 'Supérieure',
  deluxe: 'Deluxe',
  suite: 'Suite',
}

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
}

export const PLANNING_STEP_ICONS: Record<string, React.ElementType> = {
  reservation: ShoppingCart,
  confirmation: CheckCircle2,
  payment: CreditCard,
  checkin_reminder: AlertCircle,
  checkin: Bed,
  checkout: Clock,
  feedback: MessageSquare,
}
