// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.0";
import { DOMParser } from "jsr:@b-fuze/deno-dom";

interface Paper {
  title: string;
  link: string;
  description: string;
  authors: string[];
  date: string;
}

Deno.serve(async (req) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    const tomorrow = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    tomorrow.setDate(today.getDate() + 1);

    const dates = [
      yesterday.toISOString().split("T")[0],
      today.toISOString().split("T")[0],
      tomorrow.toISOString().split("T")[0],
    ];

    // Supabase setup
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if we already have papers for these dates
    const { data: existingPapers, error } = await supabase
      .from("daily_papers")
      .select("date")
      .in("date", dates);

    if (error) {
      console.error("Error fetching papers from database:", error);
      return new Response("Failed to check papers", { status: 500 });
    }

    const existingDates = new Set(
      existingPapers?.map((paper) => paper.date)
    );
    const missingDates = dates.filter((date) => !existingDates.has(date));

    for (const date of missingDates) {
      try {
        console.log(`Fetching papers for ${date}`);
        const papersData = await fetchPapersByDate(date);

        const { error: upsertError } = await supabase.from("daily_papers").upsert({
          date,
          papers: papersData,
        });

        if (upsertError) {
          console.error(`Failed to store papers for ${date}:`, upsertError);
        } else {
          console.log(`Papers for ${date} added successfully`);
        }
      } catch (fetchError) {
        console.error(
          `Error fetching or storing papers for ${date}:`,
          fetchError
        );
      }
    }

    return new Response("Papers check completed", { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

async function fetchPapersByDate(date: string): Promise<Paper[]> {
  const url = "https://paperswithcode.com/latest";
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlanMLBot/1.0)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");

    // Find the papers container
    const papersContainer = document.querySelector(".infinite-container");
    if (!papersContainer) {
      throw new Error("Papers container not found on the page.");
    }

    // Get all paper elements
    const paperElements = papersContainer.querySelectorAll(".paper-card");
    const papers: Paper[] = [];

    // Process only the first 3 papers
    for (let i = 0; i < Math.min(3, paperElements.length); i++) {
      const paperElement = paperElements[i];
      
      // Extract paper information
      const titleElement = paperElement.querySelector(".paper-title");
      const linkElement = paperElement.querySelector("a");
      const descriptionElement = paperElement.querySelector(".paper-abstract");
      const authorsElement = paperElement.querySelector(".paper-authors");

      if (titleElement && linkElement && descriptionElement) {
        papers.push({
          title: titleElement.textContent?.trim() || "",
          link: `https://paperswithcode.com${linkElement.getAttribute("href")}`,
          description: descriptionElement.textContent?.trim() || "",
          authors: authorsElement?.textContent?.trim().split(",").map(author => author.trim()) || [],
          date: date
        });
      }
    }

    return papers;
  } catch (error) {
    console.error(`Error fetching papers for ${date}:`, error.message);
    throw error;
  }
} 