import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// 🔑 API Key & Konfigurasi dari .env
const MAYAR_API_KEY = process.env.MAYAR_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

// 🔥 Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(), // atau pakai serviceAccountKey.json
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

// Create Transaction
app.post("/create-transaction", async (req, res) => {
  try {
    const { amount, description, customer, notes } = req.body;

    const response = await fetch("https://api.mayar.id/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MAYAR_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        description,
        customer,
        notes,
        callback_url: WEBHOOK_URL
      })
    });

    const data = await response.json();
    if (!data.payment_url) {
      return res.status(400).json({ error: "Failed to create transaction", details: data });
    }

    res.json(data);

  } catch (err) {
    console.error("Create transaction error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Webhook dari Mayar
app.post("/webhook", async (req, res) => {
  try {
    const { transaction_id, status } = req.body;
    console.log("Webhook received:", req.body);

    // Update status order di Firebase Realtime Database
    const ordersRef = db.ref("orders");
    ordersRef.orderByChild("mayarTransactionId").equalTo(transaction_id)
      .once("value", snapshot => {
        if (snapshot.exists()) {
          snapshot.forEach(child => {
            child.ref.update({
              status: status.toLowerCase(),
              paidAt: Date.now()
            });
          });
        } else {
          console.warn("Order not found for transaction:", transaction_id);
        }
      });

    res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Error processing webhook");
  }
});

app.listen(PORT, () => {
  console.log(`Khanzza billal backend running at http://localhost:${PORT}`);
});