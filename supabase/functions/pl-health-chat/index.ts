import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { health_record_id, message, chat_history } = await req.json();
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Fetch the record interpretation for context
    const { data: record } = await supabase
      .from('pl_health_records')
      .select('interpretation, record_type')
      .eq('id', health_record_id)
      .single();

    if (!record?.interpretation) {
      return new Response(JSON.stringify({ error: 'Record not found or not interpreted yet' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a friendly veterinary record interpreter helping a pet owner understand their pet's health records. You have already interpreted a record for them and they have follow-up questions.

Here is the interpreted record for context:
${JSON.stringify(record.interpretation)}

RULES:
- Answer questions about the record in plain, warm language
- If asked about something not in the record, say you can only help with this specific record
- NEVER diagnose. NEVER prescribe. ALWAYS recommend the vet for medical decisions.
- Keep responses concise (2-4 paragraphs max)
- End each response with encouragement, not anxiety`;

    const messages = [
      ...(chat_history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });

    const aiData = await response.json();

    if (!response.ok) {
      throw new Error(aiData.error?.message || 'AI API request failed');
    }

    const reply = aiData.content[0].text;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
