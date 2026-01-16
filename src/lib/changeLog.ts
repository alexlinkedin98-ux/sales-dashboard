import { prisma } from './db';

export type EntityType =
  | 'WeeklyEntry'
  | 'TriageEntry'
  | 'UpsellEntry'
  | 'MarketingEntry'
  | 'MarketingTriageEntry'
  | 'SalesRep'
  | 'MarketingChannel';

export type ActionType = 'create' | 'update' | 'delete';

interface LogChangeParams {
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  description: string;
  relatedName?: string;
  canUndo?: boolean;
}

export async function logChange({
  entityType,
  entityId,
  action,
  previousData,
  newData,
  description,
  relatedName,
  canUndo = true,
}: LogChangeParams) {
  try {
    await prisma.changeLog.create({
      data: {
        entityType,
        entityId,
        action,
        previousData: previousData ? JSON.stringify(previousData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        description,
        relatedName,
        canUndo,
      },
    });
  } catch (error) {
    console.error('Failed to log change:', error);
  }
}

export async function undoChange(changeLogId: string): Promise<{ success: boolean; message: string }> {
  try {
    const changeLog = await prisma.changeLog.findUnique({
      where: { id: changeLogId },
    });

    if (!changeLog) {
      return { success: false, message: 'Change not found' };
    }

    if (changeLog.undone) {
      return { success: false, message: 'Change already undone' };
    }

    if (!changeLog.canUndo) {
      return { success: false, message: 'This change cannot be undone' };
    }

    const { entityType, entityId, action, previousData } = changeLog;

    switch (action) {
      case 'delete': {
        // Restore the deleted record
        if (!previousData) {
          return { success: false, message: 'No previous data to restore' };
        }
        const data = JSON.parse(previousData);
        // Remove id, createdAt, updatedAt as they'll be regenerated or cause conflicts
        const { id, createdAt, updatedAt, salesRep, channel, ...restoreData } = data;

        switch (entityType) {
          case 'WeeklyEntry':
            await prisma.weeklyEntry.create({ data: { id: entityId, ...restoreData } });
            break;
          case 'TriageEntry':
            await prisma.triageEntry.create({ data: { id: entityId, ...restoreData } });
            break;
          case 'UpsellEntry':
            await prisma.upsellEntry.create({ data: { id: entityId, ...restoreData } });
            break;
          case 'MarketingEntry':
            await prisma.marketingEntry.create({ data: { id: entityId, ...restoreData } });
            break;
          case 'MarketingTriageEntry':
            await prisma.marketingTriageEntry.create({ data: { id: entityId, ...restoreData } });
            break;
          case 'SalesRep':
            await prisma.salesRep.create({ data: { id: entityId, ...restoreData } });
            break;
          case 'MarketingChannel':
            await prisma.marketingChannel.create({ data: { id: entityId, ...restoreData } });
            break;
        }
        break;
      }

      case 'update': {
        // Restore to previous state
        if (!previousData) {
          return { success: false, message: 'No previous data to restore' };
        }
        const data = JSON.parse(previousData);
        const { id, createdAt, updatedAt, salesRep, channel, ...updateData } = data;

        switch (entityType) {
          case 'WeeklyEntry':
            await prisma.weeklyEntry.update({ where: { id: entityId }, data: updateData });
            break;
          case 'TriageEntry':
            await prisma.triageEntry.update({ where: { id: entityId }, data: updateData });
            break;
          case 'UpsellEntry':
            await prisma.upsellEntry.update({ where: { id: entityId }, data: updateData });
            break;
          case 'MarketingEntry':
            await prisma.marketingEntry.update({ where: { id: entityId }, data: updateData });
            break;
          case 'MarketingTriageEntry':
            await prisma.marketingTriageEntry.update({ where: { id: entityId }, data: updateData });
            break;
          case 'SalesRep':
            await prisma.salesRep.update({ where: { id: entityId }, data: updateData });
            break;
          case 'MarketingChannel':
            await prisma.marketingChannel.update({ where: { id: entityId }, data: updateData });
            break;
        }
        break;
      }

      case 'create': {
        // Delete the created record
        switch (entityType) {
          case 'WeeklyEntry':
            await prisma.weeklyEntry.delete({ where: { id: entityId } });
            break;
          case 'TriageEntry':
            await prisma.triageEntry.delete({ where: { id: entityId } });
            break;
          case 'UpsellEntry':
            await prisma.upsellEntry.delete({ where: { id: entityId } });
            break;
          case 'MarketingEntry':
            await prisma.marketingEntry.delete({ where: { id: entityId } });
            break;
          case 'MarketingTriageEntry':
            await prisma.marketingTriageEntry.delete({ where: { id: entityId } });
            break;
          case 'SalesRep':
            await prisma.salesRep.delete({ where: { id: entityId } });
            break;
          case 'MarketingChannel':
            await prisma.marketingChannel.delete({ where: { id: entityId } });
            break;
        }
        break;
      }
    }

    // Mark the change as undone
    await prisma.changeLog.update({
      where: { id: changeLogId },
      data: { undone: true },
    });

    return { success: true, message: 'Change undone successfully' };
  } catch (error) {
    console.error('Failed to undo change:', error);
    return { success: false, message: 'Failed to undo change' };
  }
}
