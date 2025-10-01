import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
}

// Function to ensure backup bucket exists
async function ensureBackupBucket(supabase: any): Promise<void> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.warn('Failed to list buckets:', listError.message)
      return
    }

    const backupBucket = buckets?.find((bucket: any) => bucket.id === 'backups')
    
    if (!backupBucket) {
      console.log('Creating backup bucket...')
      
      // Create the bucket
      const { data: bucket, error: createError } = await supabase.storage.createBucket('backups', {
        public: false,
        allowedMimeTypes: ['application/sql', 'application/json', 'text/plain']
      })

      if (createError) {
        console.error('Failed to create backup bucket:', createError.message)
        throw new Error(`Failed to create backup bucket: ${createError.message}`)
      }

      console.log('Backup bucket created successfully:', bucket)
    } else {
      console.log('Backup bucket already exists')
    }
  } catch (error) {
    console.error('Error ensuring backup bucket:', error)
    // Throw the error so we know what's wrong with bucket creation
    throw new Error(`Failed to ensure backup bucket: ${error.message}`)
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super_admin (following admin-create-user pattern)
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole || userRole.role !== 'super_admin') {
      // Log unauthorized access attempt
      await supabaseAdmin.from('activity_logs').insert({
        user_id: user.id,
        category: 'security',
        action: 'unauthorized_backup_access',
        resource_type: 'system',
        severity: 'warning',
        details: { 
          attempted_action: req.method,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        }
      })
      
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Super admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'list'

    switch (req.method) {
      case 'GET':
        if (action === 'list') {
          return await listBackups()
        } else if (action === 'download') {
          const backupId = url.searchParams.get('backup_id')
          if (!backupId) {
            return new Response(
              JSON.stringify({ error: 'backup_id required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          return await downloadBackup(backupId)
        }
        break

      case 'POST':
        const body = await req.json()
        if (body.action === 'create') {
          return await createBackup(body.name)
        } else if (body.action === 'restore') {
          return await restoreBackup(body.backup_id)
        }
        break

      case 'DELETE':
        const backupId = url.searchParams.get('backup_id')
        if (!backupId) {
          return new Response(
            JSON.stringify({ error: 'backup_id required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return await deleteBackup(backupId)
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-backup function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// Helper functions using Deno commands and database functions
async function createBackup(backupName?: string): Promise<Response> {
  try {
    // Create supabase client for bucket operations
    const supabaseForBucket = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
    await ensureBackupBucket(supabaseForBucket)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = backupName ? 
      `${backupName}_${timestamp}.sql` : 
      `assetdx_backup_${timestamp}.sql`
    
    // Create supabase client for database operations
    const supabaseForBackup = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
    
    // Instead of pg_dump, use Supabase to export data
    console.log('Creating backup using Supabase database functions...')
    
    // Call the backup function we created in the database
    const { data: backupResult, error: backupError } = await supabaseForBackup
      .rpc('create_database_backup', {
        backup_name: backupName || 'automated_backup'
      })
    
    if (backupError) {
      console.error('Backup creation failed:', backupError)
      throw new Error(`Failed to create backup: ${backupError.message}`)
    }
    
    const backupData = backupResult || 'Database backup completed'
    
    // Store backup in Supabase Storage
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Step 2: Append enum data and metadata using existing functions
    const { data: enumData } = await supabaseAdmin.rpc('get_enum_values')
    const enumBackup = `\n-- Custom Enum Values Backup\n-- ${JSON.stringify(enumData, null, 2)}\n`
    
    // Step 3: Include activity logs summary for audit trail
    const { data: recentActivity } = await supabaseAdmin
      .from('activity_logs')
      .select('category, action, count(*)')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100)
    
    const activitySummary = `\n-- Activity Summary (Last 7 Days)\n-- ${JSON.stringify(recentActivity, null, 2)}\n`
    
    const fullBackup = backupData + enumBackup + activitySummary

    const { error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(`${fileName}`, new Blob([fullBackup], { type: 'application/sql' }))

    if (uploadError) {
      throw new Error(`Failed to store backup: ${uploadError.message}`)
    }

    // Log backup creation activity (following existing pattern)
    await supabaseAdmin.from('activity_logs').insert({
      category: 'backup',
      action: 'backup_created', 
      resource_type: 'database',
      resource_id: fileName,
      severity: 'info',
      details: {
        backup_name: backupName,
        file_size: fullBackup.length,
        timestamp: timestamp
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        backup_id: fileName,
        backup_name: backupName || 'Automated Backup',
        size: fullBackup.length,
        message: 'Backup created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Backup creation failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function listBackups(): Promise<Response> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Ensure backup bucket exists before listing
    await ensureBackupBucket(supabaseAdmin)

    // List all files in the backups bucket
    const { data: files, error } = await supabaseAdmin.storage
      .from('backups')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('Storage list error:', error)
      return new Response(
        JSON.stringify({ error: `Failed to list backups: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform file data to backup info format
    const backups = files?.map(file => ({
      id: file.name,
      name: file.name.replace(/^assetdx_backup_|\.sql$/g, '').replace(/[-_]/g, ' '),
      filename: file.name,
      size: formatFileSize(file.metadata?.size || 0),
      sizeBytes: file.metadata?.size || 0,
      createdAt: file.created_at,
      lastModified: file.updated_at,
      path: file.name,
      type: 'database_backup'
    })) || []

    // Log list operation for audit
    await supabaseAdmin.from('activity_logs').insert({
      category: 'backup',
      action: 'backup_list_viewed',
      resource_type: 'storage',
      severity: 'info',
      details: {
        backup_count: backups.length,
        total_size: backups.reduce((sum, b) => sum + b.sizeBytes, 0)
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        backups: backups,
        total: backups.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('List backups error:', error)
    return new Response(
      JSON.stringify({ error: `Failed to list backups: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function restoreBackup(backupId: string): Promise<Response> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Download backup from storage
    const { data: backupData, error: downloadError } = await supabaseAdmin.storage
      .from('backups')
      .download(backupId)

    if (downloadError) {
      throw new Error(`Failed to download backup: ${downloadError.message}`)
    }

    const sqlContent = await backupData.text()
    
    // Parse and execute SQL statements using Supabase client
    // Split by lines and filter out comments and empty lines
    const sqlLines = sqlContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--') && !line.startsWith('/*'))

    // Join lines that belong to the same statement (until semicolon)
    const sqlStatements: string[] = []
    let currentStatement = ''
    
    for (const line of sqlLines) {
      currentStatement += line + ' '
      if (line.endsWith(';')) {
        sqlStatements.push(currentStatement.trim())
        currentStatement = ''
      }
    }

    // Execute each SQL statement
    let executedStatements = 0
    let errors: string[] = []

    for (const statement of sqlStatements) {
      if (statement.trim()) {
        try {
          // Execute via RPC to handle complex SQL
          const { error } = await supabaseAdmin.rpc('execute_sql', { 
            sql_statement: statement 
          })
          
          if (error) {
            errors.push(`Statement error: ${error.message}`)
          } else {
            executedStatements++
          }
        } catch (err) {
          errors.push(`Execution error: ${err.message}`)
        }
      }
    }

    // Log restore activity
    await supabaseAdmin.from('activity_logs').insert({
      category: 'backup',
      action: 'backup_restored', 
      resource_type: 'database',
      resource_id: backupId,
      severity: errors.length > 0 ? 'warning' : 'info',
      details: {
        backup_file: backupId,
        executed_statements: executedStatements,
        errors: errors.length,
        restored_at: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Database restore completed. Executed ${executedStatements} statements.`,
        backup_id: backupId,
        executed_statements: executedStatements,
        errors: errors.length > 0 ? errors : undefined,
        restored_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Restore failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function downloadBackup(backupId: string): Promise<Response> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Validate backup ID format
    if (!backupId || !backupId.endsWith('.sql')) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Download the backup file
    const { data, error } = await supabaseAdmin.storage
      .from('backups')
      .download(backupId)

    if (error) {
      console.error('Download error:', error)
      return new Response(
        JSON.stringify({ error: `Backup file not found: ${error.message}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log download activity
    await supabaseAdmin.from('activity_logs').insert({
      category: 'backup',
      action: 'backup_downloaded',
      resource_type: 'storage',
      resource_id: backupId,
      severity: 'info',
      details: {
        backup_file: backupId,
        download_timestamp: new Date().toISOString()
      }
    })

    // Return file with proper headers for download
    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${backupId}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Download backup error:', error)
    return new Response(
      JSON.stringify({ error: `Download failed: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function deleteBackup(backupId: string): Promise<Response> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Validate backup ID
    if (!backupId || !backupId.endsWith('.sql')) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First check if the file exists
    const { data: fileExists } = await supabaseAdmin.storage
      .from('backups')
      .list('', { search: backupId })

    if (!fileExists || fileExists.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Backup file not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Delete the backup file
    const { error } = await supabaseAdmin.storage
      .from('backups')
      .remove([backupId])

    if (error) {
      console.error('Delete error:', error)
      return new Response(
        JSON.stringify({ error: `Failed to delete backup: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log deletion activity
    await supabaseAdmin.from('activity_logs').insert({
      category: 'backup',
      action: 'backup_deleted',
      resource_type: 'storage',
      resource_id: backupId,
      severity: 'warning', // Deletion is a potentially destructive action
      details: {
        backup_file: backupId,
        deleted_at: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Backup deleted successfully',
        deleted_file: backupId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Delete backup error:', error)
    return new Response(
      JSON.stringify({ error: `Delete failed: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// For local testing
if (typeof Deno.serve === 'function') {
  Deno.serve(handler)
}

// Export for Supabase Edge Functions
export default handler
