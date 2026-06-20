import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { callAiWithFallback, fetchAiSettings, logAiCall } from "../_shared/ai-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailAssistantRequest {
  action: "rewrite" | "generate" | "improve";
  content?: string;
  prompt?: string;
  style: "professional" | "friendly" | "funny" | "formal" | "casual" | "persuasive";
  outputFormat?: "text" | "html";
  template?: "minimal" | "modern" | "newsletter" | "announcement";
  context?: {
    subject?: string;
    recipient?: string;
  };
}

const stylePrompts: Record<string, string> = {
  professional: "Use a professional, business-appropriate tone. Be clear, concise, and respectful. Avoid slang and maintain formal language.",
  friendly: "Use a warm, approachable tone. Be personable and engaging while remaining respectful. Include appropriate greetings.",
  funny: "Add subtle humor and wit while keeping the message clear. Be playful but appropriate. Don't overdo the jokes.",
  formal: "Use highly formal language suitable for official correspondence. Be extremely polite and use proper titles and formal expressions.",
  casual: "Use a relaxed, conversational tone. Be natural and easy-going, like talking to a friend.",
  persuasive: "Use compelling language to convince the reader. Include clear benefits and a strong call-to-action.",
};

const htmlTemplates: Record<string, { wrapper: string; contentStyle: string }> = {
  minimal: {
    wrapper: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">{{CONTENT}}</div>`,
    contentStyle: "Keep the HTML simple with just paragraph tags, basic formatting (bold, italic), and simple lists if needed.",
  },
  modern: {
    wrapper: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">{{TITLE}}</h1>
      </div>
      <div style="padding: 30px 25px; line-height: 1.6; color: #444;">{{CONTENT}}</div>
      <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">{{FOOTER}}</div>
    </div>`,
    contentStyle: "Create visually appealing content with styled headings (h2, h3), colored links (#667eea), and well-spaced paragraphs. Use divs with padding for sections.",
  },
  newsletter: {
    wrapper: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #1a1a2e; padding: 25px; text-align: center;">
        <h1 style="color: #eee; margin: 0; font-size: 22px; letter-spacing: 1px;">{{TITLE}}</h1>
      </div>
      <div style="padding: 30px 25px;">{{CONTENT}}</div>
      <div style="background: #f5f5f5; padding: 25px; border-top: 3px solid #1a1a2e;">{{FOOTER}}</div>
    </div>`,
    contentStyle: "Structure content with clear sections using h2 headings with bottom borders, bullet points for lists, and call-to-action buttons (styled as inline-block links with background color #1a1a2e, padding, border-radius).",
  },
  announcement: {
    wrapper: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 2px solid #e0e0e0; border-radius: 8px;">
      <div style="background: #ff6b6b; padding: 15px 20px; text-align: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">{{BADGE}}</span>
      </div>
      <div style="padding: 35px 30px; text-align: center;">
        <h1 style="color: #333; margin: 0 0 20px 0; font-size: 28px;">{{TITLE}}</h1>
        {{CONTENT}}
      </div>
      <div style="background: #fafafa; padding: 20px; text-align: center; font-size: 13px; color: #777;">{{FOOTER}}</div>
    </div>`,
    contentStyle: "Create impactful announcement content with a large centered title, key message in a highlighted box (background #fff3cd, padding, border-radius), and a prominent call-to-action button (background #ff6b6b, white text, padding 15px 30px, border-radius).",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header if available
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
    }

    // Fetch AI settings
    const aiSettings = await fetchAiSettings(supabaseAdmin);

    const body: EmailAssistantRequest = await req.json();
    const { action, content, prompt, style, outputFormat = "text", template = "modern", context } = body;

    const isHtmlOutput = outputFormat === "html";
    const templateConfig = htmlTemplates[template] || htmlTemplates.modern;

    let systemPrompt = `You are an expert email writing assistant. Your task is to help compose and improve emails.
${stylePrompts[style] || stylePrompts.professional}

Guidelines:
- Keep the email concise and to the point
- Use proper email formatting with appropriate greetings and sign-offs
- Ensure the message is clear and actionable
- Match the requested tone consistently throughout
- Do not include subject lines unless specifically asked`;

    if (isHtmlOutput) {
      systemPrompt += `

HTML OUTPUT INSTRUCTIONS:
- Return ONLY valid HTML code that will be placed inside the template
- ${templateConfig.contentStyle}
- Use inline styles for all formatting (no CSS classes)
- Include proper semantic HTML (p, h2, h3, ul, ol, strong, em, a)
- For links, use style="color: #667eea; text-decoration: none;"
- For buttons, use: <a href="#" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Button Text</a>
- Return the HTML content that goes inside the main content area, NOT the full template wrapper`;
    } else {
      systemPrompt += `
- Return ONLY the email body content as plain text, nothing else`;
    }

    let userPrompt = "";

    switch (action) {
      case "rewrite":
        userPrompt = `Rewrite the following email in a ${style} style${isHtmlOutput ? " and format it as styled HTML" : ""}. Keep the core message but improve clarity and tone:\n\n${content}`;
        break;
      case "generate":
        userPrompt = `Write an email with the following request: "${prompt}"${isHtmlOutput ? ". Format it as styled HTML suitable for a " + template + " email template." : ""}`;
        if (context?.recipient) {
          userPrompt += `\nThe email is addressed to: ${context.recipient}`;
        }
        if (context?.subject) {
          userPrompt += `\nThe subject is: ${context.subject}`;
        }
        break;
      case "improve":
        userPrompt = `Improve the following email. Fix any grammar issues, improve flow, and make it more ${style}${isHtmlOutput ? ". Format the improved version as styled HTML" : ""}:\n\n${content}`;
        break;
      default:
        throw new Error("Invalid action");
    }

    console.log(`AI Email Assistant - Action: ${action}, Style: ${style}, Format: ${outputFormat}, Template: ${template}`);

    const requestBody = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    // 3-tier AI call
    const aiResult = await callAiWithFallback(
      requestBody,
      aiSettings.primaryProvider,
      aiSettings.primaryModel,
      aiSettings.fallbackProvider,
      aiSettings.fallbackModel,
    );

    const aiSuccess = aiResult.response.ok;

    // Log AI call
    await logAiCall(supabaseAdmin, 'email_assistant', 'ai-email-assistant', userId, aiSuccess, aiResult, {
      action,
      style,
      outputFormat,
      template: isHtmlOutput ? template : undefined,
    });

    if (!aiSuccess) {
      const errorText = await aiResult.response.text();
      console.error('All AI tiers failed for email assistant:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI email assistant failed after all fallbacks. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiResult.response.json();
    let generatedContent = data.choices?.[0]?.message?.content || "";
    console.log(`Email generated using ${aiResult.tierUsed} tier (${aiResult.modelUsed})`);

    // Clean up HTML if needed (remove markdown code blocks if present)
    if (isHtmlOutput && generatedContent) {
      generatedContent = generatedContent
        .replace(/```html\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();
    }

    return new Response(
      JSON.stringify({ 
        content: generatedContent, 
        style, 
        action,
        isHtml: isHtmlOutput,
        template: isHtmlOutput ? template : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("AI Email Assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
