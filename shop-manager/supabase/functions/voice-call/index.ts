
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Missing Twilio credentials. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment variables.');
    }

    console.log('Processing request to voice-call function');
    const requestData = await req.json();
    const { action, phone_number, message, call_type, customer_id, notes } = requestData;

    console.log('Request data:', { action, phone_number, call_type, customer_id });

    // Basic validation
    if (!action || !phone_number) {
      throw new Error('Missing required parameters: action and phone_number are required');
    }

    // Handle different actions
    if (action === 'send_sms') {
      if (!message) {
        throw new Error('Message is required for SMS');
      }

      console.log(`Sending SMS to ${phone_number}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);

      // Call Twilio API to send SMS
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
          body: new URLSearchParams({
            'From': TWILIO_PHONE_NUMBER,
            'To': phone_number,
            'Body': message,
          }),
        }
      );

      const twilioData = await twilioResponse.json();
      
      if (!twilioResponse.ok) {
        console.error('Twilio SMS API error:', twilioData);
        throw new Error(`Twilio API error: ${JSON.stringify(twilioData)}`);
      }

      console.log('SMS sent successfully:', twilioData.sid);

      return new Response(
        JSON.stringify({ success: true, data: twilioData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (action === 'initiate_call') {
      if (!call_type) {
        throw new Error('Call type is required for initiating calls');
      }

      console.log(`Initiating ${call_type} call to ${phone_number}`);

      // TwiML for different call types
      let twiml = '';
      
      if (call_type === 'appointment_reminder') {
        twiml = `
          <Response>
            <Say>Hello! This is a reminder about your upcoming appointment. Please don't forget your scheduled service.</Say>
            <Pause length="1"/>
            <Say>Press 1 to confirm your appointment, or press 2 to reschedule.</Say>
            <Gather numDigits="1" action="${req.url}?action=handle_response&type=appointment" method="POST"/>
          </Response>
        `;
      } 
      else if (call_type === 'service_update') {
        twiml = `
          <Response>
            <Say>Hello! We have an update regarding your recent service request.</Say>
            <Pause length="1"/>
            <Say>Your vehicle service has been completed and is ready for pickup.</Say>
            <Pause length="1"/>
            <Say>Press 1 to acknowledge this message, or press 2 to speak with a representative.</Say>
            <Gather numDigits="1" action="${req.url}?action=handle_response&type=service" method="POST"/>
          </Response>
        `;
      }
      else if (call_type === 'satisfaction_survey') {
        twiml = `
          <Response>
            <Say>Hello! Thank you for choosing our service.</Say>
            <Pause length="1"/>
            <Say>We'd like to know about your recent experience. On a scale from 1 to 5, with 5 being excellent, how would you rate our service?</Say>
            <Gather numDigits="1" action="${req.url}?action=handle_response&type=survey" method="POST"/>
          </Response>
        `;
      }

      console.log('Using TwiML:', twiml.replace(/\s+/g, ' ').trim());

      // Call Twilio API to initiate call
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          },
          body: new URLSearchParams({
            'From': TWILIO_PHONE_NUMBER,
            'To': phone_number,
            'Twiml': twiml,
          }),
        }
      );

      const twilioData = await twilioResponse.json();
      
      if (!twilioResponse.ok) {
        console.error('Twilio Call API error:', twilioData);
        throw new Error(`Twilio API error: ${JSON.stringify(twilioData)}`);
      }

      console.log('Call initiated successfully:', twilioData.sid);

      return new Response(
        JSON.stringify({ success: true, data: twilioData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (action === 'handle_response') {
      // This would handle responses from TwiML Gather actions
      console.log('Handling call response:', requestData);
      
      // Process the DTMF input
      const Digits = requestData.Digits;
      const type = requestData.type;
      
      let responseTwiml = '';
      
      if (type === 'appointment') {
        if (Digits === '1') {
          responseTwiml = `
            <Response>
              <Say>Thank you for confirming your appointment. We look forward to seeing you.</Say>
            </Response>
          `;
        } else if (Digits === '2') {
          responseTwiml = `
            <Response>
              <Say>We understand you need to reschedule. A representative will contact you shortly to arrange a new appointment time.</Say>
            </Response>
          `;
        }
      }
      else if (type === 'service') {
        if (Digits === '1') {
          responseTwiml = `
            <Response>
              <Say>Thank you for acknowledging our message. We'll keep your vehicle ready for pickup.</Say>
            </Response>
          `;
        } else if (Digits === '2') {
          responseTwiml = `
            <Response>
              <Say>We're transferring you to a representative. Please hold.</Say>
              <Dial>+15551234567</Dial>
            </Response>
          `;
        }
      }
      else if (type === 'survey') {
        responseTwiml = `
          <Response>
            <Say>Thank you for your feedback. We appreciate your business.</Say>
          </Response>
        `;
      }
      
      return new Response(
        responseTwiml,
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }
    
    // Handle unknown action
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in voice-call function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
