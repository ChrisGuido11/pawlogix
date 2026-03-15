# Debugging Notes

Recurring issues and their solutions for future reference.

---

## JWT Error on Edge Function Invocation (March 2026)

**Symptom:** Every call to `pl-interpret-record` (and potentially other Edge Functions) fails with an "invalid JWT" error. The app shows a processing failure on the record scanning screen.

**Key diagnostic clue:** Edge Function logs in Supabase dashboard show `booted` and `shutdown` but NO request logs — meaning the request never reaches the function code.

**Root cause:** The Supabase API gateway has a `verify_jwt` flag (enabled by default) that validates JWTs *before* forwarding requests to Edge Functions. When this gateway-level check rejects the token, the function never executes and produces no logs. This can happen after:
- JWT secret rotation on the Supabase project
- Project pause/resume (free tier)
- Supabase platform updates that affect JWT validation

**Solution:** Deploy Edge Functions with `--no-verify-jwt`:
```bash
supabase functions deploy pl-interpret-record --no-verify-jwt
supabase functions deploy pl-health-chat --no-verify-jwt
supabase functions deploy pl-delete-account --no-verify-jwt
```

This is safe because each function already validates auth internally via `supabase.auth.getUser()`, which checks the JWT against the auth service directly. The gateway check is redundant.

**How to diagnose if this happens again:**
1. Check Edge Function logs — if you see `booted`/`shutdown` but zero request logs, the gateway is blocking
2. Test with curl to confirm the function is deployed and responding:
   ```bash
   curl -s -w "\nHTTP_STATUS: %{http_code}\n" \
     -X POST "$SUPABASE_URL/functions/v1/pl-interpret-record" \
     -H "Content-Type: application/json" \
     -H "apikey: $ANON_KEY" \
     -H "Authorization: Bearer $ANON_KEY" \
     -d '{"record_id":"test"}'
   ```
3. If no response or generic JWT error from gateway (vs function's own "Unauthorized"), redeploy with `--no-verify-jwt`

**Also applies to:** `pl-health-chat`, `pl-delete-account`, and any future `pl-*` Edge Functions.
