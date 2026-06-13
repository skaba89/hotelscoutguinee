'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary that catches JavaScript errors anywhere in its child
 * component tree, logs those errors, and displays a fallback UI instead of
 * crashing the whole application.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Card className="w-full max-w-md border-red-200 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Une erreur est survenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-red-600/80">
                {this.state.error?.message || 'Une erreur inattendue s\'est produite.'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-100"
                onClick={this.handleReset}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Page-level error boundary with a more prominent fallback UI.
 * Used to wrap entire page sections (Dashboard, Hotels, Pipeline, etc.).
 */
export class PageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PageErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <Card className="w-full max-w-lg border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Erreur sur cette page
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-600/80">
                {this.state.error?.message || 'Une erreur inattendue s\'est produite lors du chargement de cette page.'}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-100"
                  onClick={this.handleReset}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Réessayer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Recharger la page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
