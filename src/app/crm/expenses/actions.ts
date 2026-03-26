"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function addExpenseAction(formData: FormData) {
  const projectId = formData.get("projectId") as string;
  const reason = formData.get("reason") as string;
  const amount = Number(formData.get("amount"));
  const currency = formData.get("currency") as string;
  const expenseDate = formData.get("expenseDate") as string;

  // Lấy tỷ giá từ DB
  const { data: ratesSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "currency_rates")
    .single();

  const rates = ratesSetting?.value || { vnd: 25500, aud: 1.5 };
  const USD_VND = Number(rates.vnd) || 25000;
  const USD_AUD = Number(rates.aud) || 1.5;

  let exchange_rate = 1;
  let amount_usd = amount;

  if (currency === 'VND') {
    exchange_rate = USD_VND;
    amount_usd = amount / USD_VND;
  } else if (currency === 'AUD') {
    exchange_rate = USD_AUD;
    amount_usd = amount / USD_AUD;
  }

  const { error } = await supabase.from("expenses").insert([{
    project_id: projectId,
    reason,
    amount,
    currency,
    exchange_rate,
    amount_usd,
    expense_date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString()
  }]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/crm/expenses");
  revalidatePath("/crm"); // Revalidate the global dashboard
}

export async function deleteExpenseAction(expenseId: string) {
  const { error } = await supabase.from("expenses").update({ deleted_at: new Date().toISOString() }).eq("id", expenseId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/crm/expenses");
  revalidatePath("/crm");
}
