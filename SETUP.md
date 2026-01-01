# Sales Rep Dashboard - Setup Guide

This dashboard pulls data from your Google Sheets spreadsheet and displays it in a web interface with charts and comparisons.

## Prerequisites

- Node.js 18+ installed
- A Google Cloud account (free)
- Your Google Sheets spreadsheet

## Step 1: Set Up Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" > "Enable APIs and Services"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Give it a name (e.g., "sales-dashboard")
   - Click "Create and Continue"
   - Skip the optional steps and click "Done"

5. Create a Key for the Service Account:
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the file (keep it safe!)

6. Share Your Spreadsheet:
   - Open your Google Sheets spreadsheet
   - Click "Share"
   - Add the service account email (looks like: `name@project-id.iam.gserviceaccount.com`)
   - Give it "Viewer" access
   - Click "Share"

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your credentials:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=your-sheet-id-here
   ```

   - **GOOGLE_SERVICE_ACCOUNT_EMAIL**: From the JSON key file (`client_email` field)
   - **GOOGLE_PRIVATE_KEY**: From the JSON key file (`private_key` field) - keep the quotes and \n characters
   - **GOOGLE_SHEET_ID**: From your spreadsheet URL:
     `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

## Step 3: Configure Sheet Ranges (if needed)

The dashboard expects your spreadsheet to have this structure:

### For each month tab (e.g., "January", "February", etc.):

**Alex's data (rows 4-10):**
| Week | Intro Calls Scheduled | Intro Calls Taken | Show up rate | Acceptance Rate | Accounts Audited | Proposals Pitched | Deals Closed | Proposal Rate | Close Rate | This Month MRR | MRR per call | MRR per audit | MRR Per Sales |

**Dom's data (rows 38-44):**
Same structure as Alex

If your spreadsheet has a different structure, edit `src/lib/sheets.ts` and adjust the ranges:
- `B4:O10` for Alex's weekly data
- `B38:O44` for Dom's weekly data

## Step 4: Run the Dashboard

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Step 5: Deploy to Production

### Option A: Deploy to Vercel (Recommended - Free)

1. Push your code to GitHub (without .env.local!)

2. Go to [vercel.com](https://vercel.com) and sign in with GitHub

3. Click "New Project" and import your repository

4. Add Environment Variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`

5. Click "Deploy"

6. Your dashboard will be available at `your-project.vercel.app`

7. (Optional) Connect your custom domain in Vercel settings

### Option B: Deploy to Netlify

Similar process - push to GitHub, connect to Netlify, add environment variables.

## Troubleshooting

### "Error Loading Data"
- Check that the service account email has access to your spreadsheet
- Verify the GOOGLE_SHEET_ID is correct
- Make sure the Google Sheets API is enabled in your project

### "No data available"
- Check that the sheet ranges in `src/lib/sheets.ts` match your spreadsheet structure
- Verify your spreadsheet has month tabs named "January", "February", etc.

### Charts not showing
- Make sure you have data for multiple weeks to show trends
- The comparison view needs at least one month of data

## Adding More Sales Reps

Edit `src/lib/sheets.ts` to add more reps. Look for the sections that fetch Alex and Dom's data, and add similar sections for new reps.

## Customization

- **Colors**: Edit the Tailwind classes in components
- **Metrics**: Add/remove columns in `src/lib/types.ts` and update the parsing in `src/lib/sheets.ts`
- **Charts**: Modify `src/components/Charts.tsx` to add new chart types
