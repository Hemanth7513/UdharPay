import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 1. Fetch all unpaid transactions that don't have reminders paused
    // Note: In production, we'd only query transactions due near today to scale better
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id, amount, due_date, status, reminder_paused,
        buyers:buyer_id ( buyer_name, buyer_phone, merchant_id ),
        merchants:merchant_id ( business_name )
      `)
      .eq('status', 'unpaid')
      .eq('reminder_paused', false);

    if (fetchError) throw fetchError;
    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentLogs = [];

    // 2. Process each transaction
    for (const tx of transactions) {
      const dueDate = new Date(tx.due_date);
      dueDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
      
      let tone = '';
      if (daysDiff === -3) {
        tone = 'polite'; // 3 days before
      } else if (daysDiff === 0) {
        tone = 'neutral'; // on due date
      } else if (daysDiff === 7) {
        tone = 'firm'; // 7 days overdue
      } else {
        continue; // Skip if not matching our timeline
      }

      const buyer = tx.buyers;
      const merchant = tx.merchants;

      // In a real app, integrate with WhatsApp Business API (e.g. Twilio, Meta Graph API)
      console.log(`[MOCK WhatsApp] Sending ${tone} reminder to ${buyer.buyer_name} (${buyer.buyer_phone}) for ₹${tx.amount} owed to ${merchant.business_name}.`);

      // 3. Log to reminder_history (for US-14)
      sentLogs.push({
        transaction_id: tx.id,
        buyer_id: buyer.id,
        merchant_id: merchant.merchant_id,
        tone: tone,
        status: 'sent',
      });
    }

    if (sentLogs.length > 0) {
      // Assuming a reminder_history table exists; if not, you'd add it to migrations
      /*
      const { error: logError } = await supabase
        .from('reminder_history')
        .insert(sentLogs);
      if (logError) console.error("Error logging history", logError);
      */
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully processed reminders`, 
        processed: sentLogs.length 
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
