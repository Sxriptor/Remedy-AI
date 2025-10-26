# Remedy AI - Hydra Cleanup Summary

This document summarizes all changes made to remove Hydra dependencies and branding from the codebase.

## ✅ Completed Changes

### 1. Branding & Identity
- **Repository**: Updated from `hydralauncher/hydra` to `Sxriptor/Remedy-AI`
- **App Name**: Changed from "Hydra" to "Remedy"
- **App ID**: Changed from `gg.hydralauncher.hydra` to `com.remedy.app`
- **Protocol**: Changed from `hydralauncher://` to `remedy://`
- **Database**: Renamed from `hydra-db` to `remedy-db`
- **Executable**: Changed from "Hydra" to "Remedy"
- **Python RPC**: Renamed from `hydra-python-rpc` to `remedy-python-rpc`
- **Decky Plugin**: Renamed from "Hydra" to "Remedy"

### 2. Removed Hydra Infrastructure
- **Deleted**: `src/main/services/hydra-api.ts` (Hydra's API client)
- **Deleted**: `src/main/services/download/hydra-debrid.ts` (Hydra's debrid service)
- **Deleted**: `src/main/events/misc/open-checkout.ts` (Payment/checkout)
- **Deleted**: `src/main/events/misc/hydra-api-call.ts`
- **Deleted**: `src/main/events/misc/install-hydra-decky-plugin.ts`
- **Deleted**: `src/main/events/misc/get-hydra-decky-plugin-info.ts`
- **Removed**: Hydra WebSocket client implementation
- **Removed**: Hydra Debrid downloader enum value
- **Removed**: `DownloadError.NotCachedOnHydra` enum

### 3. Cloud Sync Disabled
All cloud synchronization features have been stubbed out but kept locally functional:

- **`uploadGamesBatch()`**: No longer uploads games to remote server
- **`mergeWithRemoteGames()`**: No longer merges with remote data
- **`updateGamePlaytime()`**: No longer syncs playtime to cloud
- **`createGame()`**: No longer creates games on remote server
- **`mergeAchievements()`**: Achievements now only stored locally
- **`syncFriendRequests()`**: No longer syncs friend requests
- **`patchUserProfile()`**: Profile updates are local-only
- **`toggleGamePin()`**: Pin status local-only
- **`addGameToFavorites()`**: Favorites local-only
- **`removeGameFromFavorites()`**: Favorites local-only

### 4. API Client
- **Created**: `src/main/services/api-client.ts` - Generic stub API client
- **Purpose**: Maintains compatibility with existing code while removing Hydra dependencies
- **Status**: Ready for you to implement with Supabase

### 5. WebSocket Client
- **Created**: `src/main/services/ws/ws-client.ts` - Stubbed WebSocket client
- **Purpose**: Maintains code compatibility
- **Status**: Ready for you to implement for real-time features

### 6. Python RPC Cleanup
**Deleted Files**:
- `python_rpc/torrent_downloader.py`
- `python_rpc/http_multi_link_downloader.py`
- `python_rpc/profile_image_processor.py`

**Updated Files**:
- `python_rpc/main.py` - Now only handles HTTP downloads
- `python_rpc/setup.py` - Updated build config
- `requirements.txt` - Removed libtorrent and Pillow

**Removed Features**:
- Torrent downloading
- Multi-link downloads
- Profile image processing
- Seeding functionality

### 7. Environment Variables
**Removed**:
- `MAIN_VITE_API_URL`
- `MAIN_VITE_ANALYTICS_API_URL`
- `MAIN_VITE_AUTH_URL`
- `MAIN_VITE_CHECKOUT_URL`
- `MAIN_VITE_EXTERNAL_RESOURCES_URL`
- `MAIN_VITE_WS_URL`

**Added**:
- `REMEDY_API_URL` (optional) - For your custom backend

### 8. Staging Environment
- Removed all `isStaging` logic
- Removed staging-specific database and log paths
- Simplified to single production mode

### 9. Removed Dependencies
**Python**:
- `libtorrent`
- `Pillow`

**Note**: Other dependencies are kept as they may be used by other parts of the app.

## 🔧 What You Need To Do

### 1. Set Up Supabase Backend
- Configure `REMEDY_API_URL` environment variable
- Implement authentication in `src/main/services/api-client.ts`
- Update `handleExternalAuth()` method for Supabase auth flow

### 2. Optional: Implement WebSocket
- Update `src/main/services/ws/ws-client.ts` for real-time features
- Connect to your own WebSocket server

### 3. Build Python RPC
- Run `python setup.py build` in the `python_rpc` directory
- This will create the `remedy-python-rpc` binary

### 4. Environment Setup
Create a `.env` file with:
```
REMEDY_API_URL=https://your-backend-url.com/api
```

## 📁 Key Files Modified

### Configuration
- `package.json` - Updated repo and dependencies
- `electron-builder.yml` - Updated branding and resources
- `requirements.txt` - Removed libtorrent and Pillow

### Services
- `src/main/services/api-client.ts` - New generic API client
- `src/main/services/ws/ws-client.ts` - New stubbed WebSocket client
- `src/main/services/python-rpc.ts` - Updated to use remedy-python-rpc
- All library-sync services - Disabled cloud sync

### Constants
- `src/main/constants.ts` - Updated app naming
- `src/main/vite-env.d.ts` - Updated environment variables
- `src/shared/constants.ts` - Removed Hydra downloader enum

### Events
- Removed 3 Hydra-specific event handlers
- Updated multiple event handlers to remove cloud sync

## ✨ Features Still Intact

All core features remain functional but are now local-only:

- ✅ Game library management
- ✅ Achievement tracking (local)
- ✅ Playtime tracking (local)
- ✅ Favorites and pinned games (local)
- ✅ Download management (HTTP, RealDebrid, TorBox)
- ✅ Profile system (local)
- ✅ Friend requests system (needs backend)
- ✅ Cloud save backup (needs backend)
- ✅ Themes and customization
- ✅ Game launching and tracking

## 🚫 Features Removed

- ❌ Hydra-specific API integration
- ❌ Hydra Debrid service
- ❌ Torrent downloading (libtorrent)
- ❌ Multi-link downloads
- ❌ Subscription/payment system
- ❌ Profile image processing via Python
- ❌ Automatic cloud synchronization
- ❌ Staging environment mode

## 🎯 Next Steps

1. **Install Dependencies**: Run `yarn install`
2. **Build Check**: Run `yarn typecheck` to verify no errors
3. **Test Build**: Run `yarn build` to create a production build
4. **Configure Backend**: Set up your Supabase project
5. **Implement Auth**: Update the API client with Supabase auth
6. **Test Application**: Run `yarn dev` to test in development mode

## 📝 Notes

- All Hydra branding has been removed or renamed to Remedy
- The app is now self-contained and independent of Hydra's infrastructure
- You can now connect it to your own Supabase backend
- Local features work without any backend connection
- The codebase is cleaner and more maintainable

---

**Date**: October 26, 2025  
**Version**: 3.7.1  
**Status**: Ready for Supabase integration

