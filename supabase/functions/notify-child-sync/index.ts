// Supabase Edge Function: notify-child-sync
// Deploy: supabase functions deploy notify-child-sync
// Secrets:
//   FCM_SERVER_KEY — Firebase Cloud Messaging legacy server key
//   (or set up HTTP v1 later with a service account)
//
// Also create a Database Webhook in the Supabase Dashboard that POSTs to this
// function on app_block_rules / children changes (recommended over pg_net).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Body = {
  child_id?: string;
  record?: { child_id?: string; profile_id?: string };
  old_record?: { child_id?: string; profile_id?: string };
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') ?? '';

    if (!supabaseUrl || !serviceRole) {
      return json({ error: 'Missing Supabase env' }, 500);
    }

    const payload = (await req.json()) as Body;
    const childId =
      payload.child_id ??
      payload.record?.child_id ??
      payload.record?.profile_id ??
      payload.old_record?.child_id ??
      payload.old_record?.profile_id;

    if (!childId) {
      return json({ error: 'child_id required' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: devices, error } = await admin
      .from('child_devices')
      .select('id, fcm_token')
      .eq('child_id', childId)
      .not('fcm_token', 'is', null);

    if (error) {
      return json({ error: error.message }, 500);
    }

    const tokens = (devices ?? [])
      .map(d => d.fcm_token as string | null)
      .filter((t): t is string => !!t && t.length > 0);

    if (tokens.length === 0) {
      return json({ ok: true, sent: 0, reason: 'no_fcm_tokens' });
    }

    if (!fcmServerKey) {
      return json({
        ok: true,
        sent: 0,
        reason: 'FCM_SERVER_KEY not configured — tokens stored, push skipped',
        tokens: tokens.length,
      });
    }

    let sent = 0;
    const failures: string[] = [];

    for (const token of tokens) {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          priority: 'high',
          // Data-only → wakes native receiver without showing a notification
          data: {
            type: 'parentkey_sync',
            child_id: childId,
          },
        }),
      });

      if (res.ok) {
        sent += 1;
      } else {
        failures.push(await res.text());
      }
    }

    return json({ ok: true, sent, failures });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
