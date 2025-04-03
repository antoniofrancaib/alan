// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.0";
import { DateTime } from "npm:luxon@3.5.0";

interface Paper {
  title: string;
  link: string;
  description: string;
  authors: string[];
  date: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(sendPapersToUsers);

// Rate limiter utility
async function rateLimit(
  items: any[],
  limit: number,
  callback: (item: any) => Promise<void>
) {
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    await Promise.all(batch.map(callback));
    if (i + limit < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
    }
  }
}

async function sendPapersToUsers() {
  try {
    // Current timestamp
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    // Fetch today's papers
    const { data: papersData, error: papersError } = await supabase
      .from("daily_papers")
      .select("papers")
      .eq("date", today)
      .single();

    if (papersError || !papersData?.papers) {
      console.error("Error fetching today's papers:", papersError);
      return new Response("Failed to fetch papers", { status: 500 });
    }

    const papers: Paper[] = papersData.papers;
    if (papers.length === 0) {
      console.log("No papers found for today");
      return new Response("No papers to send", { status: 200 });
    }

    // Format the message
    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `🤖 *Alan's Daily ML Papers* - ${formattedDate}\n\n`;
    
    papers.forEach((paper, index) => {
      message += `📄 *${index + 1}. ${paper.title}*\n`;
      message += `👥 ${paper.authors.join(", ")}\n`;
      message += `${paper.description}\n`;
      message += `🔗 ${paper.link}\n\n`;
    });

    message += `\nStay curious! Let me know if you'd like to discuss any of these papers or need more information. 🤔`;

    // Fetch all subscribed users who sent a message in the last 24 hours
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("subscribed", true)
      .gt(
        "last_message_timestamp",
        new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      );

    if (userError) {
      console.error("Error fetching users:", userError);
      return new Response("Failed to fetch users", { status: 500 });
    }

    const usersToNotify = [];

    for (const user of users) {
      const { preferred_time, timezone } = user;

      const now = DateTime.now().setZone(timezone); // Current time in the user's timezone
      const currentTimeInMinutes = now.hour * 60 + now.minute; // Convert current time to minutes

      // Parse the user's preferred time (HH:mm:ss) and convert it to minutes
      const [hours, minutes] = preferred_time.split(":").map(Number);
      const preferredTimeInMinutes = hours * 60 + minutes;

      // Calculate the difference
      const timeDiff = preferredTimeInMinutes - currentTimeInMinutes;

      if (timeDiff >= 0 && timeDiff <= 5) {
        usersToNotify.push(user);
      }
    }

    if (usersToNotify.length === 0) {
      console.log("No users to notify at this time.");
      return new Response("No users to notify", { status: 200 });
    }

    // Rate-limited sending
    await rateLimit(usersToNotify, 60, async (user) => {
      console.log(`Sending papers to ${user.id}:`);
      await sendWhatsAppMessage(user.phone_number, message);
    });

    console.log(`Papers sent to ${usersToNotify.length} users.`);
    return new Response("Papers sent successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function sendWhatsAppMessage(recipient: string, message: string) {
  try {
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

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
      }
    );

    if (!response.ok) {
      console.error("Error sending WhatsApp message:", await response.text());
    }
  } catch (err) {
    console.error("Error in sendWhatsAppMessage:", err);
  }
} 