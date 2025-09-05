// api/create-transaction.js
export default async function handler(req, res) {
  try {
    // ✅ Hanya izinkan POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ✅ Pastikan body ter-parse JSON
    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (err) {
      console.error("❌ Gagal parse body:", err);
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { amount, description, name, email, mobile, paymentType, notes } = body;

    // ✅ Validasi input
    if (!amount || !description || !name || !email || !mobile || !paymentType) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["amount", "description", "name", "email", "mobile", "paymentType"],
      });
    }

    // 🔑 Pastikan API key ada
    if (!process.env.MAYAR_API_KEY) {
      console.error("❌ MAYAR_API_KEY tidak ditemukan");
      return res.status(500).json({ error: "MAYAR_API_KEY tidak ditemukan" });
    }

    console.log("🔹 Request ke Mayar:", { amount, description, name, email, mobile, paymentType, notes });

    // ✅ Endpoint Mayar (Production)
    const response = await fetch("https://api.mayar.id/hl/v1/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAYAR_API_KEY}`,
      },
      body: JSON.stringify({
        amount,
        description,
        name,
        email,
        mobile,
        paymentType, // contoh: "qris" atau "bca_va"
        notes,
      }),
    });

    const text = await response.text(); // Raw response
    console.log("📩 Response dari Mayar:", text);

    try {
      const data = JSON.parse(text);
      return res.status(response.status).json(data);
    } catch (e) {
      console.error("❌ Response bukan JSON:", text);
      return res.status(500).json({ error: "Invalid response dari Mayar", raw: text });
    }
  } catch (err) {
    console.error("❌ Error:", err);
    return res.status(500).json({ error: err.message });
  }
}