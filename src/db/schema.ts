import { tableSchema, appSchema } from '@nozbe/watermelondb';

export const dbSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'buyers',
      columns: [
        { name: 'supabase_id', type: 'string', isOptional: true },
        { name: 'merchant_id', type: 'string' },
        { name: 'buyer_name', type: 'string' },
        { name: 'buyer_phone', type: 'string' },
        { name: 'total_outstanding', type: 'number' },
        { name: 'last_transaction_at', type: 'number', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'supabase_id', type: 'string', isOptional: true },
        { name: 'buyer_id', type: 'string' },
        { name: 'merchant_id', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'due_date', type: 'number' },
        // status: 'unpaid' | 'paid' | 'partial' | 'disputed' | 'written_off' | 'paused'
        { name: 'status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'reminder_paused', type: 'boolean' },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
