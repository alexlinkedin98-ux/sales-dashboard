import { google } from 'googleapis';
import { WeeklyData, MonthlySummary, QuarterlySummary, SalesRepData, DashboardData } from './types';

// Initialize Google Sheets API
function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Parse a date string like "January 1 2026" to Date object
function parseWeekDate(dateStr: string): Date {
  const cleaned = dateStr.trim();
  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? new Date() : date;
}

// Parse number, handling empty cells and percentages
function parseNumber(value: string | undefined | null): number {
  if (!value || value === '' || value === '-' || value === '#DIV/0!') return 0;
  const cleaned = String(value).replace(/[%$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse percentage (stored as decimal in some cases)
function parsePercent(value: string | undefined | null): number {
  if (!value || value === '' || value === '-' || value === '#DIV/0!') return 0;
  const cleaned = String(value).replace(/[%]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  // If value was like "75.00%" it's already a percentage, otherwise multiply
  return String(value).includes('%') ? num : num * 100;
}

// Fetch and parse weekly data for a sales rep from a specific sheet/range
async function fetchRepWeeklyData(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string,
  dataRange: string
): Promise<WeeklyData[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!${dataRange}`,
    });

    const rows = response.data.values || [];
    const weeklyData: WeeklyData[] = [];

    for (const row of rows) {
      // Skip header rows or empty rows
      if (!row[0] || row[0].toLowerCase().includes('week') || row[0].toLowerCase().includes('month')) {
        continue;
      }

      // Check if this looks like a date (week row)
      const weekStr = String(row[0]).trim();
      if (!weekStr.match(/\d{4}/) && !weekStr.match(/january|february|march|april|may|june|july|august|september|october|november|december/i)) {
        continue;
      }

      weeklyData.push({
        week: weekStr,
        weekDate: parseWeekDate(weekStr),
        introCallsScheduled: parseNumber(row[1]),
        introCallsTaken: parseNumber(row[2]),
        showUpRate: parsePercent(row[3]),
        acceptanceQualityRate: parsePercent(row[4]),
        accountsAudited: parseNumber(row[5]),
        proposalsPitched: parseNumber(row[6]),
        dealsClosed: parseNumber(row[7]),
        proposalRate: parsePercent(row[8]),
        closeRate: parsePercent(row[9]),
        thisMonthMRR: parseNumber(row[10]),
        mrrPerCallTaken: parseNumber(row[11]),
        mrrPerAudit: parseNumber(row[12]),
        mrrPerSales: parseNumber(row[13]),
      });
    }

    return weeklyData;
  } catch (error) {
    console.error(`Error fetching data for ${sheetName}:`, error);
    return [];
  }
}

// Calculate monthly summary from weekly data
function calculateMonthlySummary(weeklyData: WeeklyData[], month: string): MonthlySummary {
  const totalCallsScheduled = weeklyData.reduce((sum, w) => sum + w.introCallsScheduled, 0);
  const totalCallsTaken = weeklyData.reduce((sum, w) => sum + w.introCallsTaken, 0);
  const totalAccountsAudited = weeklyData.reduce((sum, w) => sum + w.accountsAudited, 0);
  const totalProposals = weeklyData.reduce((sum, w) => sum + w.proposalsPitched, 0);
  const totalClosed = weeklyData.reduce((sum, w) => sum + w.dealsClosed, 0);
  const totalMRR = weeklyData.reduce((sum, w) => sum + w.thisMonthMRR, 0);

  // Use the last week's MRR for the month (as it's cumulative)
  const lastWeek = weeklyData[weeklyData.length - 1];
  const monthMRR = lastWeek?.thisMonthMRR || totalMRR;

  return {
    month,
    totalCallsScheduled,
    totalCallsTaken,
    showUpRate: totalCallsScheduled > 0 ? (totalCallsTaken / totalCallsScheduled) * 100 : 0,
    acceptanceQualityRate: weeklyData.length > 0
      ? weeklyData.reduce((sum, w) => sum + w.acceptanceQualityRate, 0) / weeklyData.length
      : 0,
    totalAccountsAudited,
    totalProposals,
    totalClosed,
    proposalRate: totalAccountsAudited > 0 ? (totalProposals / totalAccountsAudited) * 100 : 0,
    closeRate: totalProposals > 0 ? (totalClosed / totalProposals) * 100 : 0,
    totalMRR: monthMRR,
    mrrPerCallTaken: totalCallsTaken > 0 ? monthMRR / totalCallsTaken : 0,
    mrrPerAudit: totalAccountsAudited > 0 ? monthMRR / totalAccountsAudited : 0,
    mrrPerSales: totalClosed > 0 ? monthMRR / totalClosed : 0,
  };
}

// Calculate quarterly summary from monthly summaries
function calculateQuarterlySummary(monthlySummaries: MonthlySummary[], quarter: string): QuarterlySummary {
  const totalCallsScheduled = monthlySummaries.reduce((sum, m) => sum + m.totalCallsScheduled, 0);
  const totalCallsTaken = monthlySummaries.reduce((sum, m) => sum + m.totalCallsTaken, 0);
  const totalAccountsAudited = monthlySummaries.reduce((sum, m) => sum + m.totalAccountsAudited, 0);
  const totalProposals = monthlySummaries.reduce((sum, m) => sum + m.totalProposals, 0);
  const totalClosed = monthlySummaries.reduce((sum, m) => sum + m.totalClosed, 0);
  const totalMRR = monthlySummaries.reduce((sum, m) => sum + m.totalMRR, 0);

  return {
    quarter,
    months: monthlySummaries,
    totalCallsScheduled,
    totalCallsTaken,
    showUpRate: totalCallsScheduled > 0 ? (totalCallsTaken / totalCallsScheduled) * 100 : 0,
    acceptanceQualityRate: monthlySummaries.length > 0
      ? monthlySummaries.reduce((sum, m) => sum + m.acceptanceQualityRate, 0) / monthlySummaries.length
      : 0,
    totalAccountsAudited,
    totalProposals,
    totalClosed,
    proposalRate: totalAccountsAudited > 0 ? (totalProposals / totalAccountsAudited) * 100 : 0,
    closeRate: totalProposals > 0 ? (totalClosed / totalProposals) * 100 : 0,
    totalMRR,
    mrrPerCallTaken: totalCallsTaken > 0 ? totalMRR / totalCallsTaken : 0,
    mrrPerAudit: totalAccountsAudited > 0 ? totalMRR / totalAccountsAudited : 0,
    mrrPerSales: totalClosed > 0 ? totalMRR / totalClosed : 0,
  };
}

// Group weekly data by month
function groupByMonth(weeklyData: WeeklyData[]): Map<string, WeeklyData[]> {
  const grouped = new Map<string, WeeklyData[]>();

  for (const week of weeklyData) {
    const monthKey = `${week.weekDate.toLocaleString('default', { month: 'long' })} ${week.weekDate.getFullYear()}`;
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(week);
  }

  return grouped;
}

// Group monthly summaries by quarter
function groupByQuarter(monthlySummaries: MonthlySummary[]): Map<string, MonthlySummary[]> {
  const grouped = new Map<string, MonthlySummary[]>();

  for (const summary of monthlySummaries) {
    const parts = summary.month.split(' ');
    const month = parts[0];
    const year = parts[1];

    let quarter: string;
    if (['January', 'February', 'March'].includes(month)) {
      quarter = `Q1 ${year}`;
    } else if (['April', 'May', 'June'].includes(month)) {
      quarter = `Q2 ${year}`;
    } else if (['July', 'August', 'September'].includes(month)) {
      quarter = `Q3 ${year}`;
    } else {
      quarter = `Q4 ${year}`;
    }

    if (!grouped.has(quarter)) {
      grouped.set(quarter, []);
    }
    grouped.get(quarter)!.push(summary);
  }

  return grouped;
}

// Main function to fetch all dashboard data
export async function fetchDashboardData(): Promise<DashboardData> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

  // Define the sheet configurations for each rep
  // Based on your spreadsheet, each month tab has both Alex and Dom's data
  // Alex is in the top section (rows ~4-9), Dom is in the bottom section (rows ~40-45)

  const monthSheets = [
    { name: 'January', range: 'B4:O30' }, // Adjust these ranges based on actual sheet structure
  ];

  // For now, let's fetch from the Q1 tab which likely has consolidated data
  // We'll need to adjust this based on actual sheet structure

  const reps: SalesRepData[] = [];

  // Fetch Alex's data
  const alexWeeklyData = await fetchRepWeeklyData(sheets, spreadsheetId, 'January', 'B4:O10');
  const alexMonthlyByMonth = groupByMonth(alexWeeklyData);
  const alexMonthlySummaries: MonthlySummary[] = [];

  for (const [month, weeks] of alexMonthlyByMonth) {
    alexMonthlySummaries.push(calculateMonthlySummary(weeks, month));
  }

  const alexQuarterlyByQuarter = groupByQuarter(alexMonthlySummaries);
  const alexQuarterlySummaries: QuarterlySummary[] = [];

  for (const [quarter, months] of alexQuarterlyByQuarter) {
    alexQuarterlySummaries.push(calculateQuarterlySummary(months, quarter));
  }

  reps.push({
    name: 'Alex',
    weeklyData: alexWeeklyData,
    monthlySummaries: alexMonthlySummaries,
    quarterlySummaries: alexQuarterlySummaries,
  });

  // Fetch Dom's data (from lower section of the same sheet)
  const domWeeklyData = await fetchRepWeeklyData(sheets, spreadsheetId, 'January', 'B38:O44');
  const domMonthlyByMonth = groupByMonth(domWeeklyData);
  const domMonthlySummaries: MonthlySummary[] = [];

  for (const [month, weeks] of domMonthlyByMonth) {
    domMonthlySummaries.push(calculateMonthlySummary(weeks, month));
  }

  const domQuarterlyByQuarter = groupByQuarter(domMonthlySummaries);
  const domQuarterlySummaries: QuarterlySummary[] = [];

  for (const [quarter, months] of domQuarterlyByQuarter) {
    domQuarterlySummaries.push(calculateQuarterlySummary(months, quarter));
  }

  reps.push({
    name: 'Dom',
    weeklyData: domWeeklyData,
    monthlySummaries: domMonthlySummaries,
    quarterlySummaries: domQuarterlySummaries,
  });

  return {
    reps,
    lastUpdated: new Date().toISOString(),
  };
}

// Alternative: Fetch data from multiple month sheets
export async function fetchAllMonthsData(): Promise<DashboardData> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

  // Get list of all sheets in the spreadsheet
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title || '') || [];

  // Filter to month sheets (January, February, etc.)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthSheets = sheetNames.filter(name => monthNames.some(m => name.includes(m)));

  const alexAllWeekly: WeeklyData[] = [];
  const domAllWeekly: WeeklyData[] = [];

  for (const sheetName of monthSheets) {
    // Fetch Alex's data (top section)
    const alexData = await fetchRepWeeklyData(sheets, spreadsheetId, sheetName, 'B4:O10');
    alexAllWeekly.push(...alexData);

    // Fetch Dom's data (bottom section)
    const domData = await fetchRepWeeklyData(sheets, spreadsheetId, sheetName, 'B38:O44');
    domAllWeekly.push(...domData);
  }

  // Build rep data structures
  const reps: SalesRepData[] = [];

  // Process Alex
  const alexMonthlyByMonth = groupByMonth(alexAllWeekly);
  const alexMonthlySummaries: MonthlySummary[] = [];
  for (const [month, weeks] of alexMonthlyByMonth) {
    alexMonthlySummaries.push(calculateMonthlySummary(weeks, month));
  }
  const alexQuarterlyByQuarter = groupByQuarter(alexMonthlySummaries);
  const alexQuarterlySummaries: QuarterlySummary[] = [];
  for (const [quarter, months] of alexQuarterlyByQuarter) {
    alexQuarterlySummaries.push(calculateQuarterlySummary(months, quarter));
  }
  reps.push({
    name: 'Alex',
    weeklyData: alexAllWeekly,
    monthlySummaries: alexMonthlySummaries,
    quarterlySummaries: alexQuarterlySummaries,
  });

  // Process Dom
  const domMonthlyByMonth = groupByMonth(domAllWeekly);
  const domMonthlySummaries: MonthlySummary[] = [];
  for (const [month, weeks] of domMonthlyByMonth) {
    domMonthlySummaries.push(calculateMonthlySummary(weeks, month));
  }
  const domQuarterlyByQuarter = groupByQuarter(domMonthlySummaries);
  const domQuarterlySummaries: QuarterlySummary[] = [];
  for (const [quarter, months] of domQuarterlyByQuarter) {
    domQuarterlySummaries.push(calculateQuarterlySummary(months, quarter));
  }
  reps.push({
    name: 'Dom',
    weeklyData: domAllWeekly,
    monthlySummaries: domMonthlySummaries,
    quarterlySummaries: domQuarterlySummaries,
  });

  return {
    reps,
    lastUpdated: new Date().toISOString(),
  };
}
