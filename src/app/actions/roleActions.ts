"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setRole(role: string) {
  const cookieStore = await cookies();
  cookieStore.set("crm_role", role, { path: "/" });
  revalidatePath("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("crm_role");
  cookieStore.delete("crm_user_id");
  revalidatePath("/");
}
