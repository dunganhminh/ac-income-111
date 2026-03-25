import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Bắt đầu Seed Dữ liệu mẫu...");
  
  // 1. Tạo 3 Dự án
  const projectsData = [
    { name: "Hani Dropshipping", website_url: "https://hani-drop.com" },
    { name: "VN Global Store", website_url: "https://vnglobal.store" },
    { name: "Gấu Bông Premium", website_url: "https://gaubong.vip" },
  ];

  const { data: projects, error: pErr } = await supabase.from("projects").insert(projectsData).select();
  if (pErr || !projects) {
    console.error("Lỗi khi tạo Projects:", pErr);
    return;
  }
  console.log(`Đã tạo ${projects.length} Dự án (Websites)`);

  for (const project of projects) {
    // 2. Tạo 2-3 Khách hàng cho mỗi dự án
    const customersData = [
      { project_id: project.id, email: `vip_user_${project.id.slice(0, 4)}@example.com`, full_name: "Tony Tran", phone: "0901234567", lifetime_orders: 2, lifetime_spent: 320 },
      { project_id: project.id, email: `standard_${project.id.slice(0, 4)}@mail.com`, full_name: "Anna Nguyen", phone: "0919876543", lifetime_orders: 1, lifetime_spent: 50 },
      { project_id: project.id, email: `whale_${project.id.slice(0, 4)}@whale.net`, full_name: "Elon Musk", phone: "0988888888", lifetime_orders: 3, lifetime_spent: 800 }
    ];
    
    // Upsert Customers based on email & project_id
    const { data: customers, error: cErr } = await supabase.from("customers").insert(customersData).select();
    
    if (cErr || !customers) {
      console.error("Lỗi tạo Customers:", cErr);
      continue;
    }

    // 3. Tạo Đơn hàng (Orders) cho các khách hàng này
    const ordersData = [
      {
        project_id: project.id, 
        customer_id: customers[0].id, 
        order_number: `WC-${Math.floor(Math.random()*10000)}`,
        status: "completed", 
        total_price: 220,
        shipping_fee: 10,
        paypal_fee: 5,
        total_income: 22,
        products_summary: [{ name: "Pack 10", quantity: 1 }]
      },
      {
        project_id: project.id, 
        customer_id: customers[0].id, 
        order_number: `WC-${Math.floor(Math.random()*10000)}`,
        status: "completed", 
        total_price: 100,
        shipping_fee: 5,
        paypal_fee: 2,
        total_income: 10,
        products_summary: [{ name: "Pack 5", quantity: 2 }]
      },
      {
        project_id: project.id, 
        customer_id: customers[1].id, 
        order_number: `WC-${Math.floor(Math.random()*10000)}`,
        status: "processing", 
        total_price: 50,
        shipping_fee: 5,
        paypal_fee: 1.5,
        total_income: 5,
        products_summary: [{ name: "Pack 2", quantity: 1 }]
      },
      {
        project_id: project.id, 
        customer_id: customers[2].id, 
        order_number: `WC-${Math.floor(Math.random()*10000)}`,
        status: "completed", 
        total_price: 800,
        shipping_fee: 20,
        paypal_fee: 15,
        total_income: 80,
        products_summary: [{ name: "Pack 10", quantity: 5 }]
      }
    ];

    const { error: oErr } = await supabase.from("orders").insert(ordersData);
    if (oErr) {
      console.error(`Lỗi tạo Orders cho Project ${project.name}:`, oErr);
    } else {
      console.log(`Đã tạo 4 Orders & 3 Customers cho Project: ${project.name}`);
    }
  }
  
  console.log("✅ Seed DATA THÀNH CÔNG!");
}

seed();
