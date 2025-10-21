import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import Handlebars from "handlebars";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import archiver from "archiver";
import Razorpay from "razorpay";
import Mailjet from "node-mailjet";

import {
  contactAdminTemplate,
  contactAutoReplyTemplate,
  subscribeAdminTemplate,
  subscribeAutoReplyTemplate,
} from "./emailTemplates.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const __dirname = path.resolve();

// -------------------------------------------------------------------------------- Firebase --------------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// -------------------------------------------------------------------------------- Razorpay --------------------------------------------------------------------------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// -------------------------------------------------------------------------------- Email transporter --------------------------------------------------------------------------------
let mailjetClient = null;

if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
  mailjetClient = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
  );
  console.log("✅ Mailjet client configured");
} else {
  console.warn("⚠️ Mailjet credentials missing!");
}


// -------------------------------------------------------------------------------- Email helpers --------------------------------------------------------------------------------

function maybeCompile(templateObj, context = {}) {
  if (process.env.USE_HANDLEBARS === "true") {
    return {
      html: Handlebars.compile(templateObj.html)(context),
      text: Handlebars.compile(templateObj.text || "")(context),
    };
  }
  return templateObj;
}

async function sendMailWithTemplate({ to, subject, template }) {
  if (!mailjetClient) return { ok: false, error: "Mailjet not configured" };

  try {
    const request = await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.SENDER_EMAIL || "miraarastudios@gmail.com",
              Name: process.env.SENDER_NAME || "Miraara",
            },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: template.html,
            TextPart: template.text || "",
          },
        ],
      });

    console.log("✅ Email sent via Mailjet:", request.body.Messages[0].Status);
    return { ok: true };
  } catch (err) {
    console.error("❌ Mailjet send error:", err);
    return { ok: false, error: err.message };
  }
}

// -------------------------------------------------------------------------------- CONTACT ------------------------------------------------------------------------------------------
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};
  if (!name || !email || !subject || !message)
    return res.status(400).send("Missing required fields");
  try {
    await addDoc(collection(db, "contacts"), {
      name, email, phone: phone || "", subject, message, timestamp: serverTimestamp(),
    });
    const adminTpl = maybeCompile(contactAdminTemplate({ name, email, phone, subject, message }));
    const userTpl = maybeCompile(contactAutoReplyTemplate({ name }));
    await sendMailWithTemplate({
      to: process.env.ADMIN_EMAIL || "rajgangwarkamal@gmail.com",
      subject: `💫 New Contact: ${subject}`,
      template: adminTpl
    });
    await sendMailWithTemplate({
      to: email,
      subject: "🌸 Thanks for contacting Miraara",
      template: userTpl
    });
    res.status(200).send("Message sent successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing contact");
  }
});

// -------------------------------------------------------------------------------- SUBSCRIBE --------------------------------------------------------------------------------
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body || {};
  if (!email) 
    return res.status(400).send("Email required");
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingQuery = query(collection(db, "subscribers"), where("email", "==", normalizedEmail));
    const existing = await getDocs(existingQuery);
    if (!existing.empty) 
      return res.status(400).send("Already subscribed");
    await addDoc(collection(db, "subscribers"), { 
      email: normalizedEmail, 
      timestamp: serverTimestamp() 
    });
    res.status(200).send("Subscribed successfully");
    const adminTpl = maybeCompile(subscribeAdminTemplate({ email: normalizedEmail }));
    const userTpl = maybeCompile(subscribeAutoReplyTemplate({ email: normalizedEmail }));
    sendMailWithTemplate({
      to: process.env.ADMIN_EMAIL || "rajgangwarkamal@gmail.com",
      subject: `📬 New Subscriber: ${normalizedEmail}`,
      template: adminTpl
    }).catch((err) => console.error("Admin email error:", err));
    sendMailWithTemplate({
      to: normalizedEmail,
      subject: "✨ Welcome to Miraara",
      template: userTpl
    }).catch((err) => console.error("User email error:", err));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send("Error subscribing");
  }
});

// =====================================================================================================================================================================
// ====================================================================== RAZORPAY CHECKOUT ============================================================================
// =====================================================================================================================================================================

// In-memory store for session cart items (keyed by order_id)
const sessionDataStore = {};

// ---------- CREATE RAZORPAY ORDER ----------
app.post("/api/create-order", async (req, res) => {
  try {
    const { cartItems } = req.body;
    if (!cartItems || cartItems.length === 0) return res.status(400).send("Cart empty");

    const amount = Math.round(cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0) * 100); // ₹ → paise

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    // Store cart items for ZIP download later
    sessionDataStore[order.id] = { cartItems };

    res.json({ orderId: order.id, amount, currency: order.currency });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).send("Failed to create order");
  }
});

// ---------- VERIFY PAYMENT (Optional) ----------
app.post("/api/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  // You can verify the signature here if needed
  res.json({ ok: true });
});

// ---------- DOWNLOAD ZIP AFTER PAYMENT ----------
app.get("/api/download-zip", async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).send("Order ID required");

    const sessionData = sessionDataStore[order_id];
    if (!sessionData || !sessionData.cartItems || sessionData.cartItems.length === 0)
      return res.status(404).send("No images found");

    const imageUrls = sessionData.cartItems.map((item) => item.image);
    const timestamp = Date.now();
    const zipFileName = `miraara_${timestamp}.zip`;
    const zipFilePath = path.join(__dirname, "tmp", zipFileName);

    fs.mkdirSync(path.join(__dirname, "tmp"), { recursive: true });

    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);

    for (let i = 0; i < imageUrls.length; i++) {
      const response = await fetch(imageUrls[i]);
      const buffer = await response.buffer();
      const fileName = `Artwork_${i + 1}.jpg`;
      archive.append(buffer, { name: fileName });
    }

    await archive.finalize();

    output.on("close", () => {
      res.download(zipFilePath, zipFileName, (err) => {
        if (err) console.error("Download error:", err);
        fs.unlink(zipFilePath, () => {}); // delete temp file after sending
      });
    });
  } catch (err) {
    console.error("ZIP download error:", err);
    res.status(500).send("Error generating download");
  }
});

// =======================================================
app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);
app.get("/", (req, res) => {
  res.send("Miraara Backend is live 🚀");
});