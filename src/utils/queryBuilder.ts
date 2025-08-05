import { ServerFilterConfig, EnhancedFilterConfig } from '@/types/filterTypes'
import { supabase } from '@/integrations/supabase/client'

export interface QueryBuilderOptions {
  table: string
  select?: string
  serverFilters?: ServerFilterConfig
  basicFilters?: EnhancedFilterConfig[]
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  groupBy?: string
  orderBy?: string
  limit?: number
}

export class QueryBuilder {
  private query: any
  private options: QueryBuilderOptions

  constructor(options: QueryBuilderOptions) {
    this.options = options
    this.query = supabase.from(options.table)
    
    // Set select clause
    if (options.select) {
      this.query = this.query.select(options.select)
    } else if (options.aggregation === 'count') {
      this.query = this.query.select('*', { count: 'exact' })
    } else {
      this.query = this.query.select('*')
    }
  }

  // Apply server-specific filters
  private applyServerFilters(serverFilters: ServerFilterConfig) {
    // Model filters
    if (serverFilters.models?.length) {
      this.query = this.query.in('model', serverFilters.models)
    }

    // Data Center hierarchy filters
    if (serverFilters.dc_sites?.length) {
      this.query = this.query.in('dc_site', serverFilters.dc_sites)
    }
    if (serverFilters.dc_buildings?.length) {
      this.query = this.query.in('dc_building', serverFilters.dc_buildings)
    }
    if (serverFilters.dc_floors?.length) {
      this.query = this.query.in('dc_floor', serverFilters.dc_floors)
    }
    if (serverFilters.dc_rooms?.length) {
      this.query = this.query.in('dc_room', serverFilters.dc_rooms)
    }

    // Allocation filters
    if (serverFilters.allocations?.length) {
      this.query = this.query.in('allocation', serverFilters.allocations)
    }

    // Environment filters
    if (serverFilters.environments?.length) {
      this.query = this.query.in('environment', serverFilters.environments)
    }

    // Status filters
    if (serverFilters.status?.length) {
      this.query = this.query.in('status', serverFilters.status)
    }

    // Device type filters
    if (serverFilters.device_types?.length) {
      this.query = this.query.in('device_type', serverFilters.device_types)
    }

    // Brand filters
    if (serverFilters.brands?.length) {
      this.query = this.query.in('brand', serverFilters.brands)
    }

    return this
  }

  // Apply basic filters for non-server tables
  private applyBasicFilters(basicFilters: EnhancedFilterConfig[]) {
    basicFilters.forEach(filter => {
      switch (filter.operator) {
        case 'equals':
          this.query = this.query.eq(filter.field, filter.value)
          break
        case 'not_equals':
          this.query = this.query.neq(filter.field, filter.value)
          break
        case 'contains':
          this.query = this.query.ilike(filter.field, `%${filter.value}%`)
          break
        case 'in':
          this.query = this.query.in(filter.field, Array.isArray(filter.value) ? filter.value : [filter.value])
          break
        case 'not_in':
          this.query = this.query.not(filter.field, 'in', Array.isArray(filter.value) ? filter.value : [filter.value])
          break
        case 'gt':
          this.query = this.query.gt(filter.field, filter.value)
          break
        case 'gte':
          this.query = this.query.gte(filter.field, filter.value)
          break
        case 'lt':
          this.query = this.query.lt(filter.field, filter.value)
          break
        case 'lte':
          this.query = this.query.lte(filter.field, filter.value)
          break
        default:
          console.warn(`Unknown filter operator: ${filter.operator}`)
      }
    })

    return this
  }

  // Build and execute the query
  async execute() {
    try {
      // Apply filters based on table type
      if (this.options.table === 'servers' && this.options.serverFilters) {
        this.applyServerFilters(this.options.serverFilters)
      } else if (this.options.basicFilters?.length) {
        this.applyBasicFilters(this.options.basicFilters)
      }

      // Apply grouping
      if (this.options.groupBy) {
        // For grouped queries, we need to handle aggregation differently
        if (this.options.aggregation === 'count') {
          this.query = supabase
            .from(this.options.table)
            .select(`${this.options.groupBy}, count(*)`, { count: 'exact' })
          
          // Reapply filters for grouped query
          if (this.options.table === 'servers' && this.options.serverFilters) {
            this.applyServerFilters(this.options.serverFilters)
          } else if (this.options.basicFilters?.length) {
            this.applyBasicFilters(this.options.basicFilters)
          }
        }
      }

      // Apply ordering
      if (this.options.orderBy) {
        this.query = this.query.order(this.options.orderBy)
      }

      // Apply limit
      if (this.options.limit) {
        this.query = this.query.limit(this.options.limit)
      }

      const result = await this.query

      if (result.error) {
        throw result.error
      }

      return {
        data: result.data,
        count: result.count,
        error: null
      }

    } catch (error) {
      console.error('Query execution error:', error)
      return {
        data: null,
        count: 0,
        error: error instanceof Error ? error.message : 'Query execution failed'
      }
    }
  }

  // Get the raw query for debugging
  getQuery() {
    return this.query
  }
}

// Convenience function to build and execute server queries
export async function executeServerQuery(options: QueryBuilderOptions) {
  const builder = new QueryBuilder(options)
  return builder.execute()
}

// Helper function to validate server filters
export async function validateServerFilters(filters: ServerFilterConfig) {
  try {
    const builder = new QueryBuilder({
      table: 'servers',
      select: 'id',
      serverFilters: filters
    })

    const result = await builder.execute()
    
    return {
      isValid: !result.error,
      errors: result.error ? [result.error] : [],
      warnings: result.count === 0 ? ['No servers match the selected filters'] : [],
      resultCount: result.count || 0
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Validation failed'],
      warnings: [],
      resultCount: 0
    }
  }
}