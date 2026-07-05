import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { dbSchema } from './schema';
import { Buyer } from './models/Buyer';
import { Transaction } from './models/Transaction';

const adapter = new SQLiteAdapter({
  schema: dbSchema,
  dbName: 'udharpay',
  // migrations: [], // add migration specs as schema evolves
  jsi: true, // JSI for better performance
  onSetUpError: error => {
    console.error('[WatermelonDB] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Buyer, Transaction],
});

export const buyersCollection = database.get<Buyer>('buyers');
export const transactionsCollection = database.get<Transaction>('transactions');
