import fetch from "node-fetch";

export default async function handler(req, res) {
  // ✅ Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, description, customer, notes } = req.body;

    const response = await fetch("https://api.mayar.id/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MAYAR_API_KEY}`, // 🔑 API KEY dari Vercel env
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        description,
        customer,
        notes,
        callback_url: `${process.env.BASE_URL}/api/webhook`, // ✅ Webhook URL
      }),
    });

    const data = await response.json();

    if (!data.payment_url) {
      console.error("Mayar error:", data);
      return res.status(400).json({ error: "Failed to create transaction" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}