import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const method = req.method;
    const url = new URL(req.url);
    
    // Handle GET request for webhook verification
    if (method === 'GET') {
      const challenge = url.searchParams.get('challenge');
      if (challenge) {
        console.log('TikTok webhook verification challenge:', challenge);
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }
      return new Response('OK', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Handle POST request for webhook events
    if (method === 'POST') {
      const webhookSecret = Deno.env.get('TIKTOK_WEBHOOK_SECRET');
      const authorization = req.headers.get('Authorization');

      if (!webhookSecret || !authorization || !constantTimeEqual(authorization, webhookSecret)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const body = await req.json();
      console.log('TikTok webhook event received');

      // Process different webhook event types
      const eventType = body.event;
      
      switch (eventType) {
        case 'authorize':
          break;
          
        case 'deauthorize':
          break;
          
        case 'video.publish.complete':
        case 'post.publish.complete':
          // Update platform_posts if we have publish_id
          if (body.publish_id) {
            await updatePlatformPostStatus(supabase, body.publish_id, 'success', null, body);
          }
          break;
          
        case 'video.publish.failed':
        case 'post.publish.failed':
          // Extract failure reason
          const failReason = body.fail_reason || body.error?.message || body.error_code || 'Unknown failure';
          
          // Update platform_posts with failure
          if (body.publish_id) {
            await updatePlatformPostStatus(supabase, body.publish_id, 'failed', failReason, body);
          }
          break;
          
        default:
          break;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('TikTok webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to update platform_posts based on TikTok publish_id
async function updatePlatformPostStatus(
  supabase: any,
  publishId: string,
  status: 'success' | 'failed',
  errorMessage: string | null,
  webhookData: any
) {
  try {
    // Find platform_post with this publish_id in response_data
    const { data: platformPosts, error: findError } = await supabase
      .from('platform_posts')
      .select('id, post_id, response_data')
      .eq('platform', 'tiktok')
      .or(`response_data->>tiktok_publish_id.eq.${publishId},response_data->>publish_id.eq.${publishId}`);

    if (findError) {
      console.error('Error finding platform_post:', findError);
      return;
    }

    if (!platformPosts || platformPosts.length === 0) {
      console.log('No platform_post found for publish_id:', publishId);
      return;
    }

    for (const platformPost of platformPosts) {
      console.log(`Updating platform_post ${platformPost.id} to status: ${status}`);
      
      const updateData: any = {
        status,
        posted_at: status === 'success' ? new Date().toISOString() : null,
        response_data: {
          ...platformPost.response_data,
          webhook_event: webhookData,
          final_status: status,
          updated_at: new Date().toISOString(),
        },
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      // If success and we have video_id, set the post URL
      if (status === 'success' && webhookData.video_id) {
        updateData.platform_post_id = webhookData.video_id;
        // We don't have username here, so URL will be built in frontend
      }

      const { error: updateError } = await supabase
        .from('platform_posts')
        .update(updateData)
        .eq('id', platformPost.id);

      if (updateError) {
        console.error('Error updating platform_post:', updateError);
        continue;
      }

      // Also update the parent post status
      await updateParentPostStatus(supabase, platformPost.post_id);
    }
  } catch (error) {
    console.error('Error in updatePlatformPostStatus:', error);
  }
}

// Update parent post status based on all platform_posts
async function updateParentPostStatus(supabase: any, postId: string) {
  try {
    const { data: allResults, error } = await supabase
      .from('platform_posts')
      .select('status')
      .eq('post_id', postId);

    if (error || !allResults) return;

    const statuses = allResults.map((r: any) => r.status);
    let newStatus = 'pending';

    if (statuses.every((s: string) => s === 'success')) {
      newStatus = 'completed';
    } else if (statuses.some((s: string) => s === 'failed')) {
      newStatus = 'failed';
    } else if (statuses.some((s: string) => s === 'success')) {
      newStatus = 'completed'; // Partial success
    }

    await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', postId);

  } catch (error) {
    console.error('Error updating parent post status:', error);
  }
}
