import { Model } from '@nozbe/watermelondb';
import {
  field,
  date,
  readonly,
  text,
  relation,
  writer,
  nochange,
} from '@nozbe/watermelondb/decorators';
import type { Buyer } from './Buyer';

export type TransactionStatus =
  | 'unpaid'
  | 'paid'
  | 'partial'
  | 'disputed'
  | 'written_off'
  | 'paused';

export class Transaction extends Model {
  static table = 'transactions';
  static associations = {
    buyers: { type: 'belongs_to' as const, key: 'buyer_id' },
  };

  @text('supabase_id') supabaseId!: string;
  @text('buyer_id') buyerId!: string;
  @text('merchant_id') merchantId!: string;
  @field('amount') amount!: number;
  @date('due_date') dueDate!: Date;
  @text('status') status!: TransactionStatus;
  @text('notes') notes!: string | null;
  @field('reminder_paused') reminderPaused!: boolean;
  @date('synced_at') syncedAt!: Date | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('buyers', 'buyer_id') buyer!: Buyer;

  get isOverdue(): boolean {
    return this.status === 'unpaid' && this.dueDate < new Date();
  }

  get daysUntilDue(): number {
    const now = new Date();
    const diff = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get agingBucket(): '0-30' | '31-60' | '61-90' | '90+' {
    const days = Math.abs(this.daysUntilDue);
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
  }

  @writer async markAs(newStatus: TransactionStatus) {
    await this.update(tx => {
      tx.status = newStatus;
    });
  }

  @writer async toggleReminderPause() {
    await this.update(tx => {
      tx.reminderPaused = !tx.reminderPaused;
    });
  }
}
