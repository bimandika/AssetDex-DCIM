import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

// Deno environment type declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to ensure logo bucket exists
async function ensureLogoBucket(supabase: any): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.warn('Failed to list buckets:', listError.message)
      return
    }

    const logoBucket = buckets?.find((bucket: any) => bucket.id === 'logos')
    
    if (!logoBucket) {
      console.log('Creating logo bucket...')
      
      const { data: bucket, error: createError } = await supabase.storage.createBucket('logos', {
        public: true,
        allowedMimeTypes: [
          'image/png', 
          'image/jpeg', 
          'image/jpg', 
          'image/gif', 
          'image/webp', 
          'image/svg+xml'
        ],
        fileSizeLimit: 5242880 // 5MB in bytes
      })

      if (createError) {
        console.error('Failed to create logo bucket:', createError.message)
        throw new Error(`Failed to create logo bucket: ${createError.message}`)
      }

      console.log('Logo bucket created successfully:', bucket)
    } else {
      console.log('Logo bucket already exists')
    }
  } catch (error) {
    console.error('Error ensuring logo bucket:', error)
    throw new Error(`Failed to ensure logo bucket: ${(error as Error).message || 'Unknown error'}`)
  }
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const formData = await req.formData()
    const logoFile = formData.get('logo') as File

    if (!logoFile) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!logoFile.type.startsWith('image/') || !allowedTypes.includes(logoFile.type)) {
      return new Response(
        JSON.stringify({ error: 'Please upload a supported image file: PNG, JPG, WebP, GIF, or SVG' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate file size (5MB limit)
    if (logoFile.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 5MB' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
      // Ensure the logo bucket exists
      await ensureLogoBucket(supabase)

      // Convert file to blob for upload
      const fileExt = logoFile.name.split('.').pop() || 'png'
      const fileName = `organization-logo.${fileExt}`
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true // This will replace existing file
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      console.log('Logo uploaded successfully:', uploadData)
      console.log('Public URL:', urlData.publicUrl)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Logo uploaded successfully!',
          path: urlData.publicUrl,
          fileName: fileName
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (fileError) {
      console.error('Storage upload error:', fileError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload logo to storage',
          details: (fileError as Error).message || 'Unknown error'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ error: 'Upload failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}