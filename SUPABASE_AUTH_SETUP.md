# Supabase Authentication Setup for Remedy

Your signin logic has been successfully integrated into Remedy! Here's what was implemented and how to set it up.

## What Was Implemented

### 1. Frontend Components
- **Login Page** (`src/renderer/src/pages/auth/login.tsx`)
  - Modern, styled login page with GitHub OAuth
  - Automatic auth check on load
  - Redirects to home if already authenticated

- **Auth Callback Page** (`src/renderer/src/pages/auth/callback.tsx`)
  - Handles OAuth callback from GitHub
  - Shows processing/success/error states
  - Auto-redirects after authentication

### 2. Main Process Handlers
- **`signInWithGitHub`** - Initiates GitHub OAuth flow in external browser
- **`getSupabaseSession`** - Retrieves current user session
- **`handleSupabaseCallback`** - Processes OAuth callback and sets session

### 3. Supabase Client
- **`src/main/services/supabase-client.ts`**
  - Initialized on app startup
  - Provides auth methods: `signInWithOAuth`, `setSession`, `getSession`, `getUser`, `signOut`
  - Singleton pattern to avoid multiple instances

### 4. Event System
- **`on-supabase-auth-success`** - Fired when authentication succeeds
- Automatically notifies renderer to update UI

## Setup Instructions

### Step 1: Install Dependencies
```bash
yarn install
```

### Step 2: Configure Environment Variables

Create/update your `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_REDIRECT_URL=http://localhost:3000
```

**Where to find these values:**
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon/public" key

### Step 3: Setup GitHub OAuth

1. **Create GitHub OAuth App**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in:
     - **Application name**: Remedy
     - **Homepage URL**: `http://localhost:3000`
     - **Authorization callback URL**: `http://localhost:3000/auth/callback`
   - Save and copy the Client ID and Client Secret

2. **Configure in Supabase**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable GitHub provider
   - Paste your GitHub Client ID and Client Secret
   - Save

### Step 4: Create Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Users table for custom user data
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  github_id INTEGER UNIQUE,
  github_username TEXT UNIQUE,
  avatar_url TEXT,
  notification_preference TEXT DEFAULT 'instant' CHECK (notification_preference IN ('instant', 'digest')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_github_username ON users(github_username);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Step 5: Test the Integration

1. **Start the app**:
   ```bash
   yarn dev
   ```

2. **Navigate to the login page**:
   - The app should open
   - If not authenticated, you'll see the login screen
   - Click "Sign in with GitHub"

3. **Complete OAuth flow**:
   - Your browser will open to GitHub
   - Authorize Remedy
   - You'll be redirected back to the app
   - Should automatically sign in and redirect to home

## How It Works

1. **User clicks "Sign in with GitHub"**
   - `window.electron.signInWithGitHub()` is called
   - Main process generates OAuth URL
   - Opens URL in user's default browser

2. **GitHub OAuth flow**
   - User authorizes on GitHub
   - GitHub redirects to callback URL with tokens in hash
   - Electron detects the custom protocol/callback URL

3. **Callback handling**
   - Auth callback page extracts tokens from URL hash
   - Calls `window.electron.handleSupabaseCallback(hash)`
   - Main process sets session in Supabase

4. **Session established**
   - Main process emits `on-supabase-auth-success` event
   - Frontend receives event and redirects to home
   - User is now authenticated

## API Reference

### Renderer API

```typescript
// Sign in with GitHub
const result = await window.electron.signInWithGitHub();
// Returns: { success: boolean, error?: string }

// Get current session
const session = await window.electron.getSupabaseSession();
// Returns: { user: any, session: any } | null

// Handle OAuth callback
const result = await window.electron.handleSupabaseCallback(hash);
// Returns: { success: boolean, error?: string }

// Listen for auth success
const unsubscribe = window.electron.onSupabaseAuthSuccess(() => {
  console.log("User signed in!");
  // Update UI, redirect, etc.
});
```

### Main Process API

```typescript
import { SupabaseClient } from "@main/services";

// Sign in with OAuth
const { data, error } = await SupabaseClient.signInWithOAuth({
  provider: "github",
  options: { redirectTo: "..." }
});

// Get current session
const { data, error } = await SupabaseClient.getSession();

// Get current user
const { data, error } = await SupabaseClient.getUser();

// Sign out
const { error } = await SupabaseClient.signOut();
```

## Troubleshooting

### "Supabase not initialized" error
- Make sure your `.env` file has the correct Supabase credentials
- Restart the app after adding/changing `.env`

### GitHub OAuth redirect fails
- Check that your GitHub OAuth app callback URL matches: `http://localhost:3000/auth/callback`
- Verify the callback URL is configured in Supabase GitHub provider settings

### Session not persisting
- Check that `persistSession: true` is set in `supabase-client.ts`
- Verify Supabase project URL and anon key are correct

### Browser doesn't open
- Check if `shell.openExternal()` has permissions
- Try running app with elevated permissions on Windows

## Next Steps

The authentication system is now fully integrated! You can:

1. **Add user management** - Use the `users` table to store additional user data
2. **Protect routes** - Add auth checks to prevent unauthorized access
3. **Integrate with existing features** - Connect user profiles, achievements, etc.
4. **Add sign-out** - Implement sign-out UI and connect to `SupabaseClient.signOut()`

## Files Modified

- `src/renderer/src/pages/auth/login.tsx` - Login page
- `src/renderer/src/pages/auth/login.scss` - Login styles
- `src/renderer/src/pages/auth/callback.tsx` - Callback page
- `src/renderer/src/pages/auth/callback.scss` - Callback styles
- `src/renderer/src/main.tsx` - Added auth routes
- `src/main/events/auth/sign-in-with-github.ts` - Sign-in handler
- `src/main/events/auth/get-supabase-session.ts` - Session getter
- `src/main/events/auth/handle-supabase-callback.ts` - Callback handler
- `src/main/services/supabase-client.ts` - Supabase client wrapper
- `src/main/main.ts` - Initialize Supabase on startup
- `src/preload/index.ts` - Exposed auth methods to renderer
- `src/renderer/src/declaration.d.ts` - TypeScript definitions

All TypeScript checks pass! ✅

