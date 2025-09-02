import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Settings, Calendar, Server, Building } from 'lucide-react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import type { Widget } from '@/hooks/useDashboard'
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave'

export interface TimelineEvent {
  id: string
  title: string
  description: string
  timestamp: string
  category: string
  server_id?: string
  server_name?: string
  rack_name?: string
  room_name?: string
}

interface TimelineWidgetProps {
  widget: Widget
  onUpdate?: () => void
  onDelete?: () => void
  editMode?: boolean
}

const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase() || '') {
    case 'server':
    case 'deployment':
      return <Server className="h-4 w-4" />
    case 'rack':
    case 'room':
    case 'datacenter':
      return <Building className="h-4 w-4" />
    default:
      return <Calendar className="h-4 w-4" />
  }
}

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase() || '') {
    case 'server':
    case 'deployment':
      return 'bg-blue-500'
    case 'rack':
      return 'bg-green-500'
    case 'room':
      return 'bg-purple-500'
    case 'datacenter':
      return 'bg-orange-500'
    case 'maintenance':
      return 'bg-yellow-500'
    case 'incident':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

const formatEventDate = (timestamp: string) => {
  const date = parseISO(timestamp)
  
  if (isToday(date)) {
    return `Today at ${format(date, 'HH:mm')}`
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'HH:mm')}`
  } else {
    return format(date, 'MMM dd, yyyy HH:mm')
  }
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({
  widget,
  onUpdate,
  onDelete,
  editMode = false
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({})

  useUrlState(`${widget.id}_page`, page, setPage)
  useUrlState(`${widget.id}_filters`, filters, setFilters)

  // Direct fetch to widget-data function
  const fetchTimelineData = async (): Promise<TimelineEvent[]> => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000'}/functions/v1/widget-data?action=timeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          filters: widget.filters || [],
          config: widget.data_source || {},
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.success ? (result.data || []) : []
    } catch (err: any) {
      console.error('Timeline data fetch error:', err)
      setError(err.message)
      return []
    }
  }

  // Load timeline data
  const loadData = async () => {
    setIsRefreshing(true)
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetchTimelineData()
      setEvents(result)
    } catch (err) {
      console.error('Failed to load timeline data:', err)
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    loadData()
  }, [widget.filters])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <div className="flex items-center space-x-1">
          <Badge variant="secondary" className="text-xs">
            {events.length} events
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={isLoading || isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {editMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate && onUpdate()}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                ×
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="max-h-80 overflow-y-auto">
          {isLoading && events.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-500">
              <p className="text-sm">Failed to load timeline data</p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No events found</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200"></div>
              
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="relative flex items-start space-x-4">
                    {/* Timeline dot */}
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full ${getCategoryColor(event.category)} relative z-10`}></div>
                    
                    {/* Event content */}
                    <div className="flex-grow min-w-0 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2 mb-1">
                            {getCategoryIcon(event.category)}
                            <span className="font-medium text-sm">{event.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {event.category}
                            </Badge>
                          </div>
                          
                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{formatEventDate(event.timestamp)}</span>
                            
                            {event.server_name && (
                              <span className="flex items-center space-x-1">
                                <Server className="h-3 w-3" />
                                <span>{event.server_name}</span>
                              </span>
                            )}
                            
                            {event.rack_name && (
                              <span>Rack: {event.rack_name}</span>
                            )}
                            
                            {event.room_name && (
                              <span>Room: {event.room_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
