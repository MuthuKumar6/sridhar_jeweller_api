import pool from '../config/db';
import { genId } from './generateId';
import { Request } from 'express';


export interface AuditEntry {
  shopId: string;
  actorId?: string;        // shopId or future userId
  actorName?: string;
  actorEmail?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  req?: Request;
}

export const logAudit = async (entry: AuditEntry): Promise<void> => {
  try {
    const id = genId();
    const ip = entry.req?.ip || entry.req?.socket?.remoteAddress || null;

    await pool.execute(
      `INSERT INTO audit_logs 
       (id, shop_id, actor_id, actor_name, actor_email, action, 
        entity_type, entity_id, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.shopId,
        entry.actorId || entry.shopId,
        entry.actorName || null,
        entry.actorEmail || null,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        ip
      ]
    );
  } catch (error) {
    console.error('Audit log failed:', error);
    // Non-blocking
  }
};