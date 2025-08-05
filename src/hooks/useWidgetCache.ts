import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface CachedWidgetData {
  id: string
  widget_id: string
  data: any
  computed_at: string
  expires_at: string
}

export const useWidgetCache = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get cached data for a widget
  const getCachedData = async (widgetId: string): Promise<any | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      // First try to get from cache
      const { data: cached, error: cacheError } = await supabase
        .from('widget_data_cache')
        .select('data, expires_at')
        .eq('widget_id', widgetId)
        .single()

      if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw cacheError
      }

      // Check if cache is still valid
      if (cached && new Date(cached.expires_at) > new Date()) {
        console.log(`Using cached data for widget ${widgetId}`)
        return cached.data
      }

      // Cache miss or expired - trigger refresh and return null for now
      console.log(`Cache miss for widget ${widgetId}, triggering refresh`)
      await triggerWidgetRefresh(widgetId)
      return null

    } catch (err: any) {
      console.error('Failed to get cached widget data:', err)
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Trigger refresh for a specific widget
  const triggerWidgetRefresh = async (widgetId?: string) => {
    try {
      const response = await fetch('/functions/v1/widget-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ 
          action: 'refresh',
          widget_id: widgetId // If provided, refresh only this widget
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Widget refresh triggered:', result)
      return result
    } catch (err: any) {
      console.error('Failed to trigger widget refresh:', err)
      throw err
    }
  }

  // Manually refresh all widgets
  const refreshAllWidgets = async () => {
    return await triggerWidgetRefresh()
  }

  return {
    isLoading,
    error,
    getCachedData,
    triggerWidgetRefresh,
    refreshAllWidgets
  }
}
