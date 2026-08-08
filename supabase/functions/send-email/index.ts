// Supabase Edge Function for sending emails
// Deploy this to: supabase/functions/send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Interface for email request
interface EmailRequest {
  to: string
  subject: string
  html: string
  text: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { to, subject, html, text }: EmailRequest = await req.json()

    // Validate required fields
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // PROVIDER-AGNOSTIC PLACEHOLDER
    // TODO: Integrate new email service provider here
    console.log('Email service called. Provider not configured.')
    console.log('Subject:', subject)
    console.log('To:', to)

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Email service provider not configured. Please integrate a new provider.'
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
