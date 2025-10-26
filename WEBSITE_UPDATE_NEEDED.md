# Website Update Required for Remedy Auth

## Issue

Your `colabify.xyz` callback page is only sending the **access token**, but Supabase needs **both** the access token AND refresh token to create a valid session.

## Current Callback URL
```
http://localhost:8080/auth/callback?token=xxx&github_token=yyy
```

## Required Callback URL
```
http://localhost:8080/auth/callback?token=xxx&refresh_token=yyy&github_token=zzz
```

## File to Update

Update your `app/auth/callback/page.tsx` (or wherever you handle the IDE callback):

### Find this code (around line 64-79):

```typescript
if (isIDEFlow) {
  console.log('🔄 IDE flow detected - redirecting to callback server');
  
  // Build redirect URL with token
  const redirectUrl = new URL(ideRedirectUri);
  redirectUrl.searchParams.set('token', data.session.access_token);
  
  // ... rest of code
}
```

### Change it to:

```typescript
if (isIDEFlow) {
  console.log('🔄 IDE flow detected - redirecting to callback server');
  
  // Build redirect URL with BOTH tokens
  const redirectUrl = new URL(ideRedirectUri);
  redirectUrl.searchParams.set('token', data.session.access_token);
  redirectUrl.searchParams.set('refresh_token', data.session.refresh_token);  // ADD THIS LINE
  
  // Optional: also pass GitHub token if needed
  if (data.session.provider_token) {
    redirectUrl.searchParams.set('github_token', data.session.provider_token);
  }
  
  // ... rest of code
}
```

## Why Both Tokens Are Needed

- **Access Token**: Short-lived token (1 hour) for API requests
- **Refresh Token**: Long-lived token to get new access tokens when they expire

Without the refresh token, Supabase can't maintain the session or refresh it automatically.

## After Updating

Once you update your website and redeploy, restart Remedy and try signing in again. It should work! 🚀

