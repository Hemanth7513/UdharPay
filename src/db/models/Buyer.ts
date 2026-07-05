import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, writer } from '@nozbe/watermelondb/decorators';

export type TransactionStatus =
  | 'unpaid'
  | 'paid'
  | 'partial'
  | 'disputed'
  | 'written_off'
  | 'paused';

export class Buyer extends Model {
  static table = 'buyers';

  @text('supabase_id') supabaseId!: string;
  @text('merchant_id') merchantId!: string;
  @text('buyer_name') buyerName!: string;
  @text('buyer_phone') buyerPhone!: string;
  @field('total_outstanding') totalOutstanding!: number;
  @date('last_transaction_at') lastTransactionAt!: Date | null;
  @date('synced_at') syncedAt!: Date | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @writer async updateOutstanding(amount: number) {
    await this.update(buyer => {
      buyer.totalOutstanding = amount;
    });
  }
}
