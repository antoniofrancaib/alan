# Alan - ML Research Papers Chatbot

Alan is a WhatsApp chatbot that delivers curated machine learning research papers to users daily. The chatbot scrapes the latest papers from Papers with Code, stores them in a Supabase database, and sends them to subscribed users at their preferred times.

## Features

- **Daily Paper Delivery**: Scrapes and delivers the top 3 ML papers each day
- **Personalized Delivery**: Users can set their preferred timezone and delivery time
- **Intelligent Conversations**: Uses OpenAI to provide knowledgeable responses about ML topics
- **Paper Recommendations**: Recommends papers based on user interests
- **Automatic Reminders**: Sends reminders to maintain the 24-hour WhatsApp messaging window

## Technical Architecture

### Database Structure
- `daily_papers`: Stores scraped ML papers
- `users`: User preferences and message history
- `paper_categories`: ML research categories
- `paper_mappings`: Relates papers to categories
- `user_papers`: Tracks user interactions with papers

### Edge Functions
- `fetch-daily-papers`: Scrapes papers from Papers with Code
- `send-daily-papers`: Sends papers to users at their preferred time
- `handle-webhook`: Processes incoming WhatsApp messages using OpenAI
- `send-reminders`: Reminds users to maintain message activity

### Tech Stack
- **Backend**: Supabase (PostgreSQL, Functions)
- **Language**: TypeScript (Deno runtime)
- **AI**: OpenAI GPT-3.5 for chatbot responses
- **Messaging**: WhatsApp Business API
- **Web Scraping**: DOM parsing for Papers with Code

## Getting Started

### Prerequisites
- Supabase account
- WhatsApp Business API credentials
- OpenAI API key

### Environment Variables
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WHATSAPP_WEBHOOK_VERIFY_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN
OPENAI_API_KEY
```

### Deployment
1. Set up Supabase tables using the migrations in `/supabase/migrations/`
2. Deploy Edge Functions with `supabase functions deploy`
3. Configure scheduled runs for the Edge Functions

## Usage

Users can interact with Alan through WhatsApp:
- Receive daily ML papers at their preferred time
- Ask questions about ML concepts and papers
- Set preferences for the types of papers they're interested in
- Provide feedback on papers they've read

## Future Enhancements
- Paper summarization using OpenAI or Gemini
- More granular categorization of papers
- User-specific reading history and recommendations
- Integration with citation managers 