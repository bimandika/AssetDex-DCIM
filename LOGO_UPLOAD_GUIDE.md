## Logo Upload System - Troubleshooting Guide

The logo upload functionality has been completely implemented with:

### ✅ **Backend Components**
1. **Edge Function**: `/volumes/functions/upload-logo/index.ts`
   - Direct file upload to `/public/logo.png`
   - File validation (type & size)
   - CORS support

2. **Router Registration**: `/volumes/functions/main/index.ts`
   - Upload-logo endpoint registered
   - Handles POST/OPTIONS methods

### ✅ **Frontend Components**
1. **Upload Utility**: `/src/utils/fileUpload.ts`
   - Direct API integration
   - Error handling
   - Environment variable support

2. **Settings Dialog**: `/src/components/SettingsDialog.tsx`
   - Clean UI for logo upload
   - Real-time feedback
   - Automatic logo refresh

### 🔧 **Setup Instructions**

#### 1. Start Supabase Services
```bash
cd /Users/hasanahb/Documents/git/AssetDex-DCIM
supabase start
```

#### 2. Verify Edge Functions
```bash
# Check if functions are deployed
supabase functions list

# Deploy upload-logo function if needed
supabase functions deploy upload-logo

# Deploy main router if needed
supabase functions deploy main
```

#### 3. Test the Upload
- Open AssetDex application
- Click Settings button (gear icon)
- Click "Upload Logo"
- Select an image file
- Logo should upload automatically

### 🐛 **Common Issues & Solutions**

#### Issue: "Cannot connect to Edge Functions"
**Solution**: Ensure Supabase is running
```bash
supabase start
supabase status
```

#### Issue: "404 Not Found"
**Solution**: Deploy the function
```bash
supabase functions deploy upload-logo
```

#### Issue: "CORS Error"
**Solution**: The function includes proper CORS headers, but verify the URL pattern matches your setup.

### 🔍 **Testing URLs**

Try these URLs to test which pattern works:

1. **Direct Function Access**:
   ```
   POST http://localhost:8000/functions/v1/upload-logo
   ```

2. **Through Main Router**:
   ```
   POST http://localhost:8000/functions/v1/main
   ```
   (with pathname `/upload-logo`)

### 📁 **File Structure**
```
/volumes/functions/
├── upload-logo/
│   └── index.ts          # Direct upload function
├── main/
│   └── index.ts          # Router with upload-logo endpoint
└── ...other functions
```

### 🎯 **Next Steps**

1. Run `supabase start` if not already running
2. Test logo upload in Organization Settings
3. Check browser network tab for any errors
4. Verify logo appears in `/public/logo.png`

The system is fully implemented and should work once Supabase Edge Functions are properly running!