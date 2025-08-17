# **App Name**: LS Production Tracker

## Core Features:

- Dashboard: Dashboard providing a summarized view of production, delivery, and key metrics.
- Production Page: Production page with 'Add Entry' form and a list of production entries, formatted in up to 3 vertical tables (user-configurable). Each table shows date, taka number, machine number, and meter.
- Delivery Page: Delivery page for recording deliveries, highlighting delivered takas, and preventing double entries.
- Report Page: Report page with filtering options for date, table, production, and delivery to generate reports.
- Settings Page: Settings page to configure the number of production tables (1-3) and taka number ranges for each table, plus settings for Supabase URL/Key and an API option.
- Image Data Extraction: AI-powered data extraction tool: the 'Add Entry' form provides options to either scan data via the device's camera or upload an image to extract data from the image, prefilling the production entry form.
- Date Interpretation Tool: Intelligent date assignment: The system recognizes the handwritten date format (dd/mm/yy) in the image and the LLM reasons about how to propagate the date values to the subsequent entries. The system presents the extracted data and the assigned date(s) and awaits user confirmation prior to entry.

## Style Guidelines:

- Primary color: Moderate blue (#5D9CEC), evoking trustworthiness and precision suitable for data tracking.
- Background color: Very light blue (#F0F8FF), to provide a calm, neutral backdrop.
- Accent color: Light violet (#BFA0E4), to create a distinctive but harmonious signal for user interaction elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern, neutral look.
- Use minimalist line icons to represent different production stages and settings.
- Mobile-first layout with a clean, tab-based navigation for easy access to different pages.
- Subtle transitions and animations to indicate data loading and successful actions.