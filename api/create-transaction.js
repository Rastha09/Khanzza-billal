import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { amount, description, customer, notes } = req.body;

    // 🔑 Pastikan API key ada
    if (!process.env.MAYAR_API_KEY) {
      console.error("❌ MAYAR_API_KEY tidak ditemukan");
      return res.status(500).json({ error: "MAYAR_API_KEY tidak ditemukan" });
    }

    console.log("🔹 Request ke Mayar:", {
      amount,
      description,
      customer,
      notes
    });

    const response = await fetch("https://api.mayar.id/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAYAR_API_KEY}`,
      },
      body: JSON.stringify({
        amount,
        description,
        customer,
        notes,
      }),
    });

    const text = await response.text(); // Ambil raw response
    console.log("📩 Response dari Mayar:", text);

    try {
      const data = JSON.parse(text); // coba parse JSON
      return res.status(response.status).json(data);
    } catch (e) {
      console.error("❌ Response bukan JSON:", text);
      return res.status(500).json({
        error: "Invalid response dari Mayar",
        raw: text,
      });
    }

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
}