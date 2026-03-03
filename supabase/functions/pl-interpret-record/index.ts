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

  let recordId: string | undefined;

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

    const { record_id, image_urls, pet_species, pet_breed, record_type } = await req.json();
    recordId = record_id;
    console.log(`[pl-interpret] Starting for record: ${record_id}, images: ${image_urls?.length}`);
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Use admin client for storage & DB — the forwarded user JWT doesn't reliably
    // resolve auth.uid() for storage RLS in the Deno edge function runtime.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update status to processing
    await adminClient
      .from('pl_health_records')
      .update({ processing_status: 'processing' })
      .eq('id', record_id);

    // Download images and convert to base64
    const imageContents = [];
    for (const imagePath of image_urls) {
      const { data: imageData, error: downloadError } = await adminClient.storage
        .from('pl-record-images')
        .download(imagePath);

      if (downloadError) throw downloadError;

      const buffer = await imageData.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      console.log(`[pl-interpret] Image ${imagePath}: ${bytes.length} bytes`);
      if (bytes.length === 0) {
        throw new Error(`Downloaded image is empty: ${imagePath}`);
      }
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpeg';
      const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';

      imageContents.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      });
    }

    const systemPrompt = `You are a veterinary record interpreter for pet owners. You receive scanned veterinary documents and your job is to:
1. Extract ALL text and data from the document image(s)
2. Organize the information into clear sections
3. Translate every medical term, abbreviation, and lab value into plain English
4. For lab values, indicate if they are within normal range for the species and breed
5. Flag any values outside normal range with severity: "info" (minor/FYI), "watch" (monitor this), or "urgent" (discuss with vet soon)
6. Extract numeric values (weight, lab values) into structured data for trend tracking
7. Extract vaccination dates and medication schedules
8. Write a "Summary for Pet Parent" in warm, reassuring but honest language
9. Suggest 2-4 specific questions the owner could ask their vet
10. Detect the primary record type from the document content. Choose one of: "lab_results", "vet_visit", "vaccine", "prescription", "other"
11. Extract the date of the visit, exam, or test from the document (YYYY-MM-DD). If multiple dates appear, use the primary visit/exam date. If no date is found, omit this field.
12. Extract the patient's breed and date of birth if visible on the document. For age mentions like "3 year old", compute an approximate date of birth from the document date. If the document says the breed, extract it exactly as written.

CRITICAL RULES:
- NEVER diagnose conditions. Only interpret what the document says.
- ALWAYS recommend consulting the veterinarian for medical decisions.
- Use warm, empowering language — not clinical or scary.
- If you cannot read part of the document, say so clearly.
- You MUST populate extracted_values with ALL medications, lab values, and vaccines found in the document. Do NOT leave these arrays/objects empty if the document contains relevant data. Every medication mentioned must appear in medications, every numeric lab result in lab_values, and every vaccine in vaccines.
- For vaccines: ANY mention of a vaccine name (Rabies, DHPP, DAPP, Bordetella, Leptospirosis, Lyme, Canine Influenza, FVRCP, FeLV, etc.) counts — even in a vet visit summary, vaccination history section, or list of services rendered. If the document says a vaccine was given, is due, or is recorded in the patient's history, it MUST appear in the vaccines array with whatever dates are available.
- Do NOT create placeholder or empty entries. Only include a medication in the medications array if you can identify a specific drug name from the document. If no specific medications are mentioned, leave the medications array empty.
- Species: ${pet_species}, Breed: ${pet_breed}, Record Type: ${record_type}

Respond ONLY with valid JSON matching this exact schema (example values shown — replace with actual data from the document):
{
  "summary": "Plain English summary paragraph for the pet parent",
  "interpreted_sections": [
    { "title": "Section Name", "plain_english_content": "Explanation..." }
  ],
  "flagged_items": [
    { "item": "Item name", "value": "measured value", "normal_range": "expected range", "severity": "info|watch|urgent", "explanation": "What this means..." }
  ],
  "extracted_values": {
    "record_date": "2025-02-15",
    "breed": "Golden Retriever",
    "date_of_birth": "2022-01-15",
    "weight_kg": 12.5,
    "lab_values": {
      "BUN": { "value": 18, "unit": "mg/dL", "date": "2025-01-15" },
      "ALT": { "value": 45, "unit": "U/L", "date": "2025-01-15" }
    },
    "vaccines": [
      { "name": "Rabies", "date_given": "2025-01-15", "next_due": "2026-01-15" }
    ],
    "medications": [
      { "name": "Carprofen", "dosage": "25mg", "frequency": "Twice daily" }
    ]
  },
  "suggested_vet_questions": ["Question 1", "Question 2"],
  "detected_record_type": "lab_results|vet_visit|vaccine|prescription|other"
}`;

    console.log(`[pl-interpret] Downloaded ${imageContents.length} images, calling Anthropic API...`);

    // Abort if the API doesn't respond within 60s so the catch block can
    // update the DB to 'failed' before Supabase kills the edge function.
    const controller = new AbortController();
    const apiTimeout = setTimeout(() => controller.abort(), 60_000);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContents,
              { type: 'text', text: 'Please interpret this veterinary record.' },
            ],
          },
        ],
      }),
    });

    const aiData = await response.json();
    clearTimeout(apiTimeout);
    console.log(`[pl-interpret] API responded: status=${response.status}`);

    if (!response.ok) {
      throw new Error(aiData.error?.message || 'AI API request failed');
    }

    const responseText = aiData.content[0].text;
    let interpretation;
    try {
      interpretation = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        interpretation = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    const flaggedCount = interpretation.flagged_items?.length ?? 0;
    const hasUrgent = interpretation.flagged_items?.some(
      (item: any) => item.severity === 'urgent'
    ) ?? false;

    // Auto-correct record_type if AI detected a different type
    const allowedTypes = ['lab_results', 'vet_visit', 'vaccine', 'prescription', 'other'];
    const detectedType = interpretation.detected_record_type;
    delete interpretation.detected_record_type;

    // --- Extract transient fields from extracted_values BEFORE storing ---
    // These are consumed here and removed so they don't persist in the interpretation JSON.
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

    const extractedDate = interpretation.extracted_values?.record_date;
    if (interpretation.extracted_values) delete interpretation.extracted_values.record_date;

    const extractedBreed = interpretation.extracted_values?.breed;
    if (interpretation.extracted_values) delete interpretation.extracted_values.breed;

    const extractedDob = interpretation.extracted_values?.date_of_birth;
    if (interpretation.extracted_values) delete interpretation.extracted_values.date_of_birth;

    // --- Build the primary update payload (must always succeed) ---
    const updatePayload: Record<string, any> = {
      interpretation,
      raw_text_extracted: responseText,
      processing_status: 'completed',
      flagged_items_count: flaggedCount,
      has_urgent_flags: hasUrgent,
    };

    if (detectedType && allowedTypes.includes(detectedType)) {
      updatePayload.record_type = detectedType;
      console.log(`[pl-interpret] Auto-correcting record_type to: ${detectedType}`);
    }

    // Only add record_date to payload if it's a valid YYYY-MM-DD string
    if (typeof extractedDate === 'string' && ISO_DATE_RE.test(extractedDate) && !isNaN(new Date(extractedDate).getTime())) {
      updatePayload.record_date = extractedDate;
      console.log(`[pl-interpret] Updating record_date to: ${extractedDate}`);
    }

    // Update record with interpretation
    const { error: updateError } = await adminClient
      .from('pl_health_records')
      .update(updatePayload)
      .eq('id', record_id);

    if (updateError) {
      // If the full update fails (e.g., invalid record_date), retry without record_date
      console.error(`[pl-interpret] Update failed: ${updateError.message}, retrying without record_date`);
      delete updatePayload.record_date;
      const { error: retryError } = await adminClient
        .from('pl_health_records')
        .update(updatePayload)
        .eq('id', record_id);
      if (retryError) throw new Error(`DB update failed: ${retryError.message}`);
    }

    console.log(`[pl-interpret] Record ${record_id} completed successfully`);

    // --- Sync extracted pet profile fields (non-blocking) ---
    try {
      const petUpdates: Record<string, any> = {};

      const extractedWeight = interpretation.extracted_values?.weight_kg;
      if (typeof extractedWeight === 'number' && extractedWeight > 0) {
        petUpdates.weight_kg = extractedWeight;
      }

      if (extractedBreed || extractedDob || Object.keys(petUpdates).length > 0) {
        const { data: rec } = await adminClient
          .from('pl_health_records')
          .select('pet_id')
          .eq('id', record_id)
          .single();

        if (rec?.pet_id) {
          // Only fill breed/DOB if pet's current value is null
          if (extractedBreed || extractedDob) {
            const { data: pet } = await adminClient
              .from('pl_pets')
              .select('breed, date_of_birth')
              .eq('id', rec.pet_id)
              .single();

            if (typeof extractedBreed === 'string' && extractedBreed && !pet?.breed) {
              petUpdates.breed = extractedBreed;
            }
            if (typeof extractedDob === 'string' && ISO_DATE_RE.test(extractedDob) && !isNaN(new Date(extractedDob).getTime()) && !pet?.date_of_birth) {
              petUpdates.date_of_birth = extractedDob;
            }
          }

          if (Object.keys(petUpdates).length > 0) {
            await adminClient.from('pl_pets').update(petUpdates).eq('id', rec.pet_id);
            console.log(`[pl-interpret] Updated pet ${rec.pet_id}:`, Object.keys(petUpdates));
          }
        }
      }
    } catch (petErr: any) {
      // Pet profile sync is best-effort — never block the main flow
      console.error(`[pl-interpret] Pet profile sync error (non-fatal): ${petErr.message}`);
    }

    return new Response(JSON.stringify({ success: true, interpretation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Interpretation error:', error);

    // Try to update record as failed
    console.log(`[pl-interpret] Error recovery: updating record ${recordId} to failed`);
    try {
      if (recordId) {
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await adminClient
          .from('pl_health_records')
          .update({
            processing_status: 'failed',
            processing_error: error.message,
          })
          .eq('id', recordId);
      }
    } catch {}

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
