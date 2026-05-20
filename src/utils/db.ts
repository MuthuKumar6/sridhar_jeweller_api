// src/utils/db.ts
import pool from '../config/db';

export const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
};

export const execute = async (sql: string, params: any[] = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};