import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clients = await prisma.clientPortfolio.findMany({
      where: {
        isActive: true,
        churned: false,
      },
      include: {
        feeHistory: {
          orderBy: { monthStartDate: 'desc' },
          take: 1,
        },
        upsellCheckIns: {
          orderBy: { checkInDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { clientName: 'asc' },
    });

    const now = new Date();

    const formattedClients = clients.map(client => {
      const lastCheckIn = client.upsellCheckIns[0] || null;
      const daysSinceCheckIn = lastCheckIn
        ? Math.floor((now.getTime() - new Date(lastCheckIn.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const isOverdue = lastCheckIn ? daysSinceCheckIn! > 30 : true;
      const currentFee = client.feeHistory[0]?.monthlyFee || 0;

      return {
        id: client.id,
        clientName: client.clientName,
        clientType: client.clientType,
        currentFee,
        upsellLandingPage: client.upsellLandingPage,
        upsellFacebookMgmt: client.upsellFacebookMgmt,
        lastCheckIn: lastCheckIn
          ? {
              date: lastCheckIn.checkInDate.toISOString(),
              analystName: lastCheckIn.analystName,
              status: lastCheckIn.status,
              notes: lastCheckIn.notes,
            }
          : null,
        daysSinceCheckIn,
        isOverdue,
      };
    });

    const withPotential = formattedClients.filter(c => c.upsellLandingPage || c.upsellFacebookMgmt);

    return NextResponse.json({
      clients: formattedClients,
      summary: {
        totalActive: formattedClients.length,
        totalWithPotential: withPotential.length,
        overdueCount: formattedClients.filter(c => (c.upsellLandingPage || c.upsellFacebookMgmt) && c.isOverdue).length,
        readyCount: formattedClients.filter(c => c.lastCheckIn?.status === 'ready').length,
      },
      lastUpdated: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching upsell pipeline data:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline data' }, { status: 500 });
  }
}
