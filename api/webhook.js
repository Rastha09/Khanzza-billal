import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://makka-bakerry-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = admin.database();

export default async function handler(req, res) {
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
    const { transaction_id, status } = req.body;

    const ordersRef = db.ref("orders");
    const snap = await ordersRef
      .orderByChild("mayarTransactionId")
      .equalTo(transaction_id)
      .once("value");

    if (snap.exists()) {
      snap.forEach((child) => {
        child.ref.update({
          status: status.toLowerCase(),
          paidAt: Date.now(),
        });
      });
    } else {
      console.warn("Order not found:", transaction_id);
    }

    return res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Error processing webhook");
  }
}