import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({ user, action, entityType, entityId, details = {} }) => {
  try {
    await AuditLog.create({
      userId: user?._id || user?.id || null,
      userEmail: user?.email || 'system',
      userRole: user?.role || 'SYSTEM',
      action,
      entityType,
      entityId: String(entityId),
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
};
