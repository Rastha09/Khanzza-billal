// /api/create-transaction.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("📩 Request body:", req.body);
    const apiKey = process.env.MAYAR_API_KEY;

    if (!apiKey) {
      console.error("❌ MAYAR_API_KEY tidak ditemukan");
      return res.status(500).json({ error: "API Key Mayar tidak ada" });
    }

    // ✅ langsung pakai fetch bawaan Node.js (tanpa node-fetch)
    const response = await fetch("https://api.mayar.id/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: req.body.amount,
        description: req.body.description,
        customer: req.body.customer,
        notes: req.body.notes,
        callback_url: "https://khanzza-billal.vercel.app/api/webhook",
      }),
    });

    const data = await response.json();
    console.log("📦 Response dari Mayar:", data);

    if (!data.payment_url) {
      return res.status(400).json({ error: "Gagal membuat transaksi", detail: data });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal Server Error", detail: err.message });
  }
}