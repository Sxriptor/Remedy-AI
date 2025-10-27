# Persistent Authentication Implementation

## Summary

This implementation enables persistent authentication using Supabase sessions stored in the local level database. Users no longer need to sign in every time the app starts - their authentication tokens are securely stored and automatically restored on app restart.

## Changes Made

### 1. **Custom Storage Adapter** (`src/main/services/supabase-client.ts`)

Created a custom storage adapter called `ElectronStorage` that implements Supabase's storage interface using the level database:

```typescript
const ElectronStorage = {
  async getItem(key: string): Promise<string | null>
  async setItem(key: string, value: string): Promise<void>
  async removeItem(key: string): Promise<void>
}
```

**How it works:**

- Stores session data with key prefix `supabase_` to avoid conflicts
- Uses level database (`db.put`, `db.get`, `db.del`) for persistence
- Handles errors gracefully (returns null for missing keys)

**Configuration:**

```typescript
createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence
    autoRefreshToken: true, // Auto-refresh expired tokens
    storage: ElectronStorage, // Use our custom storage
    storageKey: "auth-token", // Storage key name
    detectSessionInUrl: false, // Disable URL detection (not needed in Electron)
  },
});
```

### 2. **Session Restoration Logging**

Added logging to verify session restoration on app startup:

- ✅ Logs when existing session is restored
- ℹ️ Logs when no session exists (user needs to sign in)
- ❌ Logs errors if session restoration fails

### 3. **Sign-Out Cleanup** (Multiple Files)

Updated sign-out handlers to properly clear stored session tokens:

#### `src/main/events/auth/supabase-signin.ts`

- Calls Supabase `signOut()` method
- Deletes user data: `db.del(levelKeys.user)`
- Deletes session tokens: `db.del("supabase_auth-token")`
- Notifies renderer of sign-out

#### `src/main/events/auth/sign-out.ts`

- Batch deletes auth data, user data, AND session tokens
- Clears all games and downloads
- Closes WebSocket connection
- Ensures complete cleanup

## How It Works

### 📥 Sign-In Flow (Token Storage)

1. User clicks "Sign in with GitHub"
2. OAuth completes successfully
3. Supabase receives access_token and refresh_token
4. `setSession()` is called with tokens
5. **Custom storage adapter saves to level database:**
   - Key: `"supabase_auth-token"`
   - Value: JSON string containing session data (tokens, expiry, user info)
6. User data (avatar, name, email) also saved separately
7. App navigates to home screen

### 🔄 App Restart Flow (Token Restoration)

1. App starts → `loadState()` called
2. `initializeSupabase()` creates Supabase client with custom storage
3. Supabase automatically calls `ElectronStorage.getItem("auth-token")`
4. Stored session is loaded from level database
5. **If session exists:**
   - Session is restored automatically
   - If token expired, auto-refresh triggers
   - User sees home screen with avatar/name
6. **If no session:**
   - User sees login screen
   - Must sign in again

### 📤 Sign-Out Flow (Token Removal)

1. User clicks sign out
2. Supabase `signOut()` called
3. **Storage cleanup:**
   - Session deleted from Supabase
   - `db.del("supabase_auth-token")` removes stored tokens
   - `db.del(levelKeys.user)` removes user data
4. Renderer notified → shows login screen
5. All local state cleared

## Key Features

### ✅ Automatic Token Refresh

- Supabase automatically refreshes expired tokens
- Uses the stored refresh_token
- No user intervention needed
- Works seamlessly in background

### ✅ Secure Storage

- Tokens stored in local level database
- Database is application-specific
- Not accessible to other apps
- No exposure through browser localStorage

### ✅ Complete Cleanup

- Sign-out removes ALL authentication data
- No orphaned tokens or sessions
- Clean state for next sign-in

### ✅ Error Handling

- Graceful handling of missing sessions
- Logs all storage operations
- Returns null for missing keys
- Doesn't crash on storage errors

## Storage Schema

### Session Storage

- **Key:** `"supabase_auth-token"`
- **Value:** JSON string containing:
  ```json
  {
    "access_token": "eyJ...",
    "refresh_token": "xYz...",
    "expires_in": 3600,
    "expires_at": 1234567890,
    "token_type": "bearer",
    "user": { ... }
  }
  ```
- **Encoding:** UTF-8 string

### User Data Storage

- **Key:** `levelKeys.user` (string: "user")
- **Value:** User object (JSON)
- **Encoding:** JSON

## Testing Checklist

### ✅ Initial Sign-In

- [ ] Start fresh app (no stored session)
- [ ] Click "Sign in with GitHub"
- [ ] Complete OAuth flow
- [ ] Verify sidebar shows avatar and name
- [ ] Check logs: "Supabase client initialized successfully with persistent storage"

### ✅ Session Persistence

- [ ] Sign in successfully
- [ ] Check logs: Session is stored
- [ ] **Close app completely**
- [ ] **Reopen app**
- [ ] Check logs: "Restored existing session for user: [email]"
- [ ] Verify sidebar STILL shows avatar and name
- [ ] Verify you can use app features without signing in again

### ✅ Token Refresh

- [ ] Wait for token to expire (default: 1 hour)
- [ ] Continue using app
- [ ] Verify token is refreshed automatically
- [ ] No sign-in prompt appears

### ✅ Sign-Out

- [ ] While signed in, click sign out
- [ ] Check logs: "User signed out successfully"
- [ ] Check logs: "Session tokens cleared from database"
- [ ] Verify sidebar shows "Sign In" button
- [ ] Close and reopen app
- [ ] Verify you're NOT signed in (login screen appears)

### ✅ Multiple Restarts

- [ ] Sign in
- [ ] Restart app → verify still signed in
- [ ] Restart again → verify still signed in
- [ ] Restart 5 times → verify still signed in
- [ ] Sign out
- [ ] Restart → verify NOT signed in

## Technical Details

### Why Custom Storage?

Supabase's default storage uses `localStorage`, which doesn't work in Electron's main process:

- Main process has no DOM/browser APIs
- `localStorage` is undefined
- Sessions would not persist

Our solution:

- Implements Supabase's storage interface
- Uses level database (works in Node.js/Electron)
- Fully compatible with Supabase auth flow
- Automatic token refresh still works

### Database Keys

All Supabase session data is stored with this key:

```
"supabase_auth-token"
```

The prefix `"supabase_"` is added by our adapter to:

- Avoid conflicts with other data
- Make it easy to identify session data
- Allow for future Supabase-related keys

### Token Security

**Stored:**

- Access tokens (JWT, short-lived)
- Refresh tokens (long-lived)

**Security measures:**

- Stored in local database only
- Not transmitted except to Supabase
- Cleared completely on sign-out
- Database is app-specific (isolated)

**NOT stored:**

- Passwords (OAuth flow only)
- GitHub personal access tokens
- Any secrets from GitHub

## Debugging

### Check if session is stored:

1. Sign in
2. Open level database at: `[app-data]/leveldb/`
3. Look for key: `"supabase_auth-token"`
4. Value should be JSON with tokens

### Check logs:

- ✅ "Restored existing session for user: [email]" → Session working
- ⚠️ "No existing session found" → No stored session
- ❌ "Error checking for existing session" → Storage problem

### Force re-authentication:

1. Close app
2. Delete level database or just the session key
3. Restart app
4. User will need to sign in again

## Files Modified

1. **`src/main/services/supabase-client.ts`**
   - Added `ElectronStorage` custom storage adapter
   - Configured Supabase client with persistent storage
   - Added session restoration logging

2. **`src/main/events/auth/supabase-signin.ts`**
   - Added session token cleanup on sign-out
   - Ensures stored tokens are deleted

3. **`src/main/events/auth/sign-out.ts`**
   - Added session token to batch delete operation
   - Complete cleanup on sign-out

4. **`PERSISTENT_AUTH_IMPLEMENTATION.md`**
   - This documentation file

## Additional Notes

- Session restoration is automatic - no code changes needed in renderer
- Works with existing auth flow - fully backward compatible
- Token refresh happens transparently in background
- Works across app updates (level database persists)
- Compatible with both sign-in flows (GitHub OAuth)

## Troubleshooting

### Session not persisting?

- Check if Supabase credentials are configured (.env file)
- Verify level database is writable
- Check logs for storage errors
- Ensure custom storage adapter is properly configured

### User signed out unexpectedly?

- Check token expiry (default: 1 hour)
- Verify auto-refresh is working
- Check for Supabase errors in logs
- Ensure refresh token is valid

### Clean slate needed?

- Call sign-out function (clears everything)
- OR manually delete level database
- OR delete specific keys from database
