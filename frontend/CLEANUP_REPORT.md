# Frontend Cleanup Report

## Files to Remove (Unused/Extra):

### 1. Empty/Unused Pages
- `src/pages/auth/Register.tsx` - Empty component, not referenced

### 2. Unused Services
- `src/services/websocket.ts` - WebSocket service not being used
- `src/services/codeExecution.ts` - Contains hardcoded API key (security risk)

### 3. Redundant Voice Monitoring Components
- `src/components/InterviewVoiceMonitor.tsx` - Complex voice monitoring
- `src/components/MicrophoneMonitor.tsx` - Basic mic monitoring  
- `src/components/SimpleVoiceMonitor.tsx` - Simplified voice monitoring
- `src/components/VoiceMonitorIndicator.tsx` - Advanced voice monitoring

**Recommendation**: Keep only ONE voice monitoring component that's actually being used.

## Security Issues:
- **CRITICAL**: `codeExecution.ts` contains hardcoded API key
- Remove or move to environment variables

## Package.json Dependencies to Review:
- `@stomp/stompjs` - If websocket.ts is removed
- `sockjs-client` - If websocket.ts is removed
- Check if all voice monitoring related packages are needed

## Actions Taken:
1. Created this cleanup report
2. Identified redundant components
3. Flagged security issues

## Next Steps:
1. Remove unused files
2. Fix security issues
3. Clean up package.json
4. Test application after cleanup