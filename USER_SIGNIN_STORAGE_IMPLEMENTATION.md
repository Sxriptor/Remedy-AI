# User Sign-In Storage Implementation

## Summary

This implementation adds persistent storage of GitHub user information and updates the UI to display the user's name and GitHub avatar after authentication.

**⚠️ IMPORTANT:** For full persistent authentication (staying logged in across app restarts), see `PERSISTENT_AUTH_IMPLEMENTATION.md` which implements session token storage.

## Changes Made

### 1. **Updated User Type** (`src/types/level.types.ts`)
Added GitHub-specific fields to the `User` interface:
- `githubUsername`: The user's GitHub username
- `githubAvatarUrl`: The user's GitHub avatar URL
- `email`: The user's email address

### 2. **Store User Data on Sign-In**

#### Auth Manager (`src/main/services/auth-manager.ts`)
- When authentication succeeds via HTTP callback, the system now:
  - Extracts GitHub user metadata (username, avatar, email, display name)
  - Creates a User object with this data
  - Stores it to the level database using `levelKeys.user`

#### Supabase Sign-In Handler (`src/main/events/auth/supabase-signin.ts`)
- When handling the OAuth callback, the system now:
  - Extracts GitHub user metadata from Supabase session
  - Creates a User object with the GitHub data
  - Stores it persistently to the level database

### 3. **Load User Data on Startup** (`src/main/services/user/get-user-data.ts`)
- Updated to properly map stored GitHub data to UserDetails:
  - `username` now uses `githubUsername`
  - `email` now uses the stored email instead of null
  - `profileImageUrl` contains the GitHub avatar URL
  - `displayName` contains the user's GitHub display name

### 4. **Clear User Data on Sign-Out** (`src/main/events/auth/supabase-signin.ts`)
- The `supabaseSignOut` function now:
  - Deletes the stored user data from the level database
  - Ensures clean state after logout

### 5. **UI Display** (`src/renderer/src/components/sidebar/sidebar-profile.tsx`)
- No changes needed! The sidebar profile component already displays:
  - `userDetails.profileImageUrl` (now contains GitHub avatar)
  - `userDetails.displayName` (now contains GitHub name/username)

## How It Works

### Sign-In Flow:
1. User clicks "Sign in with GitHub" button
2. Browser opens for GitHub OAuth authentication
3. After successful auth, callback returns with tokens
4. System extracts GitHub user metadata from Supabase session:
   - `user_metadata.user_name` or `user_metadata.preferred_username` → `githubUsername`
   - `user_metadata.avatar_url` → `githubAvatarUrl` and `profileImageUrl`
   - `user_metadata.full_name` or `user_metadata.name` → `displayName`
   - `user.email` → `email`
5. User data is stored in level database at `levelKeys.user`
6. App navigates to home page

### Startup Flow:
1. App checks Supabase session for authentication
2. If authenticated, calls `getMe()` → `getUserData()`
3. `getUserData()` loads user data from level database
4. User data populates the sidebar profile with avatar and name
5. Data persists across app restarts

### Display Flow:
1. Sidebar profile component uses `useUserDetails()` hook
2. Hook provides `userDetails` from Redux state
3. Component displays:
   - Avatar using `userDetails.profileImageUrl` (GitHub avatar)
   - Name using `userDetails.displayName` (GitHub name)
4. If not logged in, shows "Sign In" button

## Testing Checklist

To verify the implementation works:

1. **Fresh Sign-In:**
   - [ ] Start the app
   - [ ] Click sign-in button
   - [ ] Complete GitHub OAuth in browser
   - [ ] Verify sidebar shows your GitHub avatar and name

2. **Persistence:**
   - [ ] Sign in successfully
   - [ ] Close the app completely
   - [ ] Reopen the app
   - [ ] Verify you're still logged in with avatar and name displayed

3. **Sign-Out:**
   - [ ] Click sign-out
   - [ ] Verify sidebar shows "Sign In" button again
   - [ ] Verify avatar and name are cleared

4. **Data Storage:**
   - [ ] Check level database has user data after sign-in
   - [ ] Verify fields include: `githubUsername`, `githubAvatarUrl`, `email`, `displayName`

## Files Modified

1. `src/types/level.types.ts` - Added GitHub fields to User type
2. `src/main/services/auth-manager.ts` - Store user data on HTTP callback
3. `src/main/events/auth/supabase-signin.ts` - Store user data on OAuth callback and clear on sign-out
4. `src/main/services/user/get-user-data.ts` - Map GitHub data to UserDetails
5. `USER_SIGNIN_STORAGE_IMPLEMENTATION.md` - This documentation file

## No Changes Required

- `src/renderer/src/components/sidebar/sidebar-profile.tsx` - Already correctly displays avatar and name
- All other UI components that use `userDetails` will automatically show the correct data

## Notes

- User data is stored locally in the level database for fast access
- Supabase session is still the source of truth for authentication
- GitHub avatar URLs are cached but will update on next sign-in
- The implementation gracefully handles missing fields (username, avatar, etc.)

