# Supabase Auth Implementation for Remedy

## ✅ Implementation Complete!

Your Supabase authentication is now fully integrated using the **HTTP callback server** approach (same as your working project).

## How It Works

### 1. User clicks "Sign in with GitHub"
- Remedy starts a local HTTP server on `localhost:8080-8090`
- Opens browser to: `https://colabify.xyz/login?source=ide&redirect_uri=http://localhost:8080/auth/callback`

### 2. User completes OAuth on GitHub
- Your website stores the `redirect_uri` in sessionStorage
- After GitHub OAuth completes, website redirects to: `http://localhost:8080/auth/callback?token=xxx`

### 3. Remedy receives the token
- Local HTTP server catches the callback
- Exchanges token for Supabase session
- Shows success page to user
- Notifies renderer process
- User is logged in!

## Files Implemented

### Main Process
- **`src/main/services/auth-manager.ts`** - HTTP callback server logic
- **`src/main/events/auth/sign-in-with-github.ts`** - Sign-in event handler
- **`src/main/events/auth/get-supabase-session.ts`** - Session getter
- **`src/main/services/supabase-client.ts`** - Supabase client wrapper

### Renderer Process  
- **`src/renderer/src/pages/auth/login.tsx`** - Login page
- **`src/renderer/src/pages/auth/callback.tsx`** - Callback page (backup)
- **`src/renderer/src/app.tsx`** - Auth protection logic

## Environment Variables

Make sure your `.env` has:

```env
MAIN_VITE_SUPABASE_URL=https://cteochxkksltaibnwexx.supabase.co
MAIN_VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Testing

1. **Restart Remedy**:
   ```bash
   yarn dev
   ```

2. **You should see the login page** on startup

3. **Click "Sign in with GitHub"**:
   - Browser opens to colabify.xyz/login
   - Sign in with GitHub
   - Browser shows success page
   - Remedy logs you in automatically
   - You can close the browser

## No Website Changes Needed!

Since your website already supports the `source=ide` flow with `redirect_uri` parameter, **no changes are needed** to colabify.xyz. It works out of the box! 🎉

## Benefits of This Approach

✅ **No protocol handler registration needed**  
✅ **Works on all platforms** (Windows, macOS, Linux)  
✅ **More reliable** than custom protocols  
✅ **Same code as your working project**  
✅ **No website modifications required**

## Troubleshooting

### Port already in use
The system tries ports 8080-8090. If all are busy, it will fail. This is rare.

### Browser doesn't open
Check if default browser is set correctly in your OS.

### Session not persisting
Supabase client has `persistSession: true` so sessions should survive app restarts.

### Stuck on "Loading Remedy..."
Check console logs for Supabase initialization errors. Make sure env vars are set correctly.

## Architecture

```
User clicks sign-in
    ↓
Remedy starts HTTP server (localhost:8080)
    ↓
Opens browser → colabify.xyz/login?redirect_uri=localhost:8080/auth/callback
    ↓
User signs in on GitHub
    ↓
colabify.xyz redirects → localhost:8080/auth/callback?token=xxx
    ↓
Remedy's HTTP server receives token
    ↓
Exchanges token for Supabase session
    ↓
Sends success event to renderer
    ↓
User logged in! ✅
```

That's it! Your authentication is fully integrated. 🚀

