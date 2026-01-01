// Types matching your spreadsheet structure

export interface WeeklyData {
  id: string; // entry ID for edit/delete
  week: string; // e.g., "January 1 2026"
  weekDate: Date;
  introCallsScheduled: number;
  introCallsTaken: number;
  showUpRate: number; // calculated: taken/scheduled
  acceptanceQualityRate: number;
  accountsAudited: number;
  proposalsPitched: number;
  dealsClosed: number;
  proposalRate: number; // calculated
  closeRate: number; // calculated: closed/proposals
  thisMonthMRR: number;
  mrrPerCallTaken: number;
  mrrPerAudit: number;
  mrrPerSales: number;
}

export interface MonthlySummary {
  month: string; // e.g., "January 2026"
  totalCallsScheduled: number;
  totalCallsTaken: number;
  showUpRate: number;
  acceptanceQualityRate: number;
  totalAccountsAudited: number;
  totalProposals: number;
  totalClosed: number;
  proposalRate: number;
  closeRate: number;
  totalMRR: number;
  mrrPerCallTaken: number;
  mrrPerAudit: number;
  mrrPerSales: number;
}

export interface QuarterlySummary {
  quarter: string; // e.g., "Q1 2026"
  months: MonthlySummary[];
  totalCallsScheduled: number;
  totalCallsTaken: number;
  showUpRate: number;
  acceptanceQualityRate: number;
  totalAccountsAudited: number;
  totalProposals: number;
  totalClosed: number;
  proposalRate: number;
  closeRate: number;
  totalMRR: number;
  mrrPerCallTaken: number;
  mrrPerAudit: number;
  mrrPerSales: number;
}

export interface SalesRepData {
  name: string;
  weeklyData: WeeklyData[];
  monthlySummaries: MonthlySummary[];
  quarterlySummaries: QuarterlySummary[];
}

export interface DashboardData {
  reps: SalesRepData[];
  lastUpdated: string;
}
