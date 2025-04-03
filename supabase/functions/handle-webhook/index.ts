// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// This Edge Function can be invoked without authentication (for webhook verification)
// @supabase/auth-helpers/anon

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai";

const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

console.log("🚀 WhatsApp webhook with OpenAI integration started");
console.log("DEBUG ENV - VERIFY_TOKEN:", verifyToken);
console.log("DEBUG ENV - PHONE_NUMBER_ID:", Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"));
console.log("DEBUG ENV - OPENAI API KEY:", openaiApiKey ? "✅ Set" : "❌ Missing");

Deno.serve(async (req: Request) => {
  console.log("⚡ Received request:", req.method, req.url);
  try {
    if (req.method === "GET") {
      // Webhook Verification
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("📝 Verification attempt:", { mode, token, challenge });

      if (mode === "subscribe" && token === verifyToken) {
        console.log("✅ Verification successful!");
        return new Response(challenge, { status: 200 });
      } else {
        console.log("❌ Verification failed!");
        return new Response("Forbidden", { status: 403 });
      }
    } else if (req.method === "POST") {
      // Webhook Event Handling
      console.log("📨 Webhook POST received");
      
      let body;
      try {
        body = await req.json();
        console.log("🔍 Full Webhook Payload:", JSON.stringify(body, null, 2));
      } catch (e) {
        console.error("❌ Failed to parse JSON:", e);
        console.log("Raw body:", await req.text());
        return new Response("Invalid JSON", { status: 400 });
      }
      
      // Extract messages if they exist
      try {
        const entries = body.entry || [];
        if (entries.length > 0) {
          for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
              if (change.field === "messages") {
                const messages = change.value.messages || [];
                for (const message of messages) {
                  console.log("📱 Message:", JSON.stringify(message, null, 2));
                  
                  // Process with OpenAI instead of echo
                  const phoneNumber = message.from;
                  let userText = "";
                  
                  // Handle different message types
                  if (message.text) {
                    userText = message.text.body;
                  } else if (message.image) {
                    userText = "[You sent an image. I can only respond to text messages.]";
                  } else if (message.audio) {
                    userText = "[You sent an audio message. I can only respond to text messages.]";
                  } else if (message.video) {
                    userText = "[You sent a video. I can only respond to text messages.]";
                  } else if (message.document) {
                    userText = "[You sent a document. I can only respond to text messages.]";
                  } else if (message.location) {
                    userText = `[You shared a location. I can only respond to text messages.]`;
                  } else if (message.contacts) {
                    userText = "[You shared contacts. I can only respond to text messages.]";
                  } else {
                    userText = "[I received your message but couldn't identify its type. I can only respond to text messages.]";
                  }
                  
                  if (phoneNumber && userText) {
                    console.log(`📤 Processing message from ${phoneNumber}: ${userText}`);
                    // Generate response with OpenAI
                    const aiResponse = await generateOpenAIResponse(userText);
                    await sendWhatsAppMessage(phoneNumber, aiResponse);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("❌ Error processing messages:", e);
      }

      return new Response("Event received", { status: 200 });
    } else {
      return new Response("Method Not Allowed", { status: 405 });
    }
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});

async function generateOpenAIResponse(userMessage: string): Promise<string> {
  try {
    console.log("🧠 Generating OpenAI response for:", userMessage);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: `You are a helpful, friendly, and concise assistant communicating via WhatsApp. 
          
Guidelines:
- Keep responses short and to the point (1-3 sentences when possible)
- Be conversational and friendly
- If you don't know something, admit it clearly
- Format important information with *asterisks* for bold text
- Use emojis occasionally to add personality 😊
- Avoid URLs unless specifically requested
- Never mention that you're an AI or discuss your limitations unprompted`
        },
        { 
          role: "user", 
          content: userMessage 
        }
      ],
      max_tokens: 150,
    });

    const responseText = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    console.log("🤖 Generated response:", responseText);
    
    return responseText;
  } catch (err) {
    console.error("❌ Error generating OpenAI response:", err);
    return "Sorry, I encountered an error while processing your message. Please try again later.";
  }
}

async function sendWhatsAppMessage(recipient: string, message: string) {
  try {
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

    console.log(`📤 Sending message to ${recipient} using phone ID: ${phoneNumberId}`);
    
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { body: message },
        }),
      },
    );

    const responseData = await response.text();
    console.log(`📬 WhatsApp API response (${response.status}):`, responseData);

    if (!response.ok) {
      console.error("❌ Error sending WhatsApp message:", responseData);
      return false;
    }
    
    console.log("✅ Message sent successfully!");
    return true;
  } catch (err) {
    console.error("❌ Error in sendWhatsAppMessage:", err);
    return false;
  }
}
