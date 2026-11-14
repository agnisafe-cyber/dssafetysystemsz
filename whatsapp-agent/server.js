import express from "express";
import fs from "node:fs";
import path from "node:path";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const GRAPH_VERSION = process.env.GRAPH_API_VERSION || "v23.0";
const BUSINESS_PHONE = "+91 98187 01683";
const BUSINESS_ADDRESS = "Ground floor, Kalka Ji, 1420/13, Block 4, Govindpuri Extension, Chittaranjan Park, New Delhi, Delhi 110019";
const STORE_DIR = process.env.DATA_DIR || process.cwd();
const STORE_FILE = path.join(STORE_DIR, "bookings.json");

function loadBookings() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, "utf8")); }
  catch { return {}; }
}
let sessions = loadBookings();

function saveSessions() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(sessions, null, 2));
}

async function sendText(to, body) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("WhatsApp credentials are not configured.");
    return;
  }
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body }
    })
  });
  if (!response.ok) console.error("WhatsApp send failed:", response.status, await response.text());
}

const MENU = `Welcome to DS Safety Systems! 🔥
How can we help you today?

1️⃣ Products & fire extinguisher prices
2️⃣ Book a service / inspection
3️⃣ AMC (Annual Maintenance)
4️⃣ Address & working hours
5️⃣ Talk to our team

Reply with a number or type your question.`;

function answerFAQ(message) {
  const q = message.toLowerCase();
  if (/\b(hi|hello|hey|namaste|start|menu)\b/.test(q)) return MENU;
  if (/\b(address|location|where|directions|map)\b/.test(q))
    return `Our address:\n${BUSINESS_ADDRESS}\n\nCall us: ${BUSINESS_PHONE}`;
  if (/\b(hour|timing|open|close|working)\b/.test(q))
    return "Our listed working hours show that we are open until 9:00 PM. Please call before visiting to confirm today's hours.";
  if (/\b(phone|call|contact|number)\b/.test(q))
    return `You can call DS Safety Systems at ${BUSINESS_PHONE}.`;
  if (/\b(price|cost|rate|buy|purchase|extinguisher|abc|capacity|kg|product)\b/.test(q))
    return "We supply ABC Dry Powder Fire Extinguishers in 2 KG, 4 KG, 6 KG and 9 KG capacities. Suitable for Class A, B and C fires, including electrical-risk environments. Please share the capacity and quantity you need, and our team will confirm availability and pricing.";
  if (/\b(amc|maintenance|inspection|service|refill|refilling|installation|repair)\b/.test(q))
    return "We can help with fire-safety installation, inspection, maintenance and AMC enquiries. To request a service booking, reply BOOK and I’ll collect the details.";
  if (/\b(book|booking|appointment|schedule|visit)\b/.test(q))
    return "Sure — I can take a booking request. Reply BOOK to begin. We’ll confirm the appointment with you; submitting a request does not guarantee a slot.";
  if (/\b(human|person|staff|team|agent|representative)\b/.test(q))
    return `Our team can help directly. Please call ${BUSINESS_PHONE} or send your question here and we’ll pass it on.`;
  return "Thanks for contacting DS Safety Systems. I can help with ABC fire extinguishers (2/4/6/9 KG), products, servicing, AMC, bookings, address and contact details. Type MENU to see options, or BOOK to request a service visit.";
}

const BOOKING_STEPS = ["service", "date", "time", "name", "address"];
const PROMPTS = {
  service: "What do you need? (e.g. extinguisher purchase, installation, inspection, refill or AMC)",
  date: "Which date would you prefer? (e.g. 20 November 2026)",
  time: "What time would suit you?",
  name: "Please share your name.",
  address: "Please share the site / visit address."
};

async function handleMessage(from, text) {
  const clean = (text || "").trim();
  const upper = clean.toUpperCase();
  if (upper === "CANCEL") {
    delete sessions[from];
    saveSessions();
    return "Your booking request draft has been cancelled. Type MENU if you need anything else.";
  }
  if (upper === "BOOK" || upper === "2") {
    sessions[from] = { step: "service", createdAt: new Date().toISOString() };
    saveSessions();
    return "Let’s create a service booking request. " + PROMPTS.service;
  }
  const session = sessions[from];
  if (session?.step && BOOKING_STEPS.includes(session.step)) {
    session[session.step] = clean;
    const index = BOOKING_STEPS.indexOf(session.step);
    if (index < BOOKING_STEPS.length - 1) {
      session.step = BOOKING_STEPS[index + 1];
      saveSessions();
      return PROMPTS[session.step];
    }
    const booking = { ...session, customerWhatsApp: from, status: "REQUEST_RECEIVED", receivedAt: new Date().toISOString() };
    delete booking.step;
    sessions[`booking_${Date.now()}_${from}`] = booking;
    delete sessions[from];
    saveSessions();
    return `Thank you, ${booking.name}. Your booking request has been received.\n\nService: ${booking.service}\nPreferred date: ${booking.date}\nPreferred time: ${booking.time}\nSite: ${booking.address}\n\nOur team will contact you on this WhatsApp number to confirm availability. This is a request, not a confirmed appointment.\n\nDS Safety Systems | ${BUSINESS_PHONE}`;
  }
  if (upper === "1") return answerFAQ("fire extinguisher product");
  if (upper === "3") return answerFAQ("AMC maintenance");
  if (upper === "4") return answerFAQ("address and working hours");
  if (upper === "5") return answerFAQ("talk to team");
  return answerFAQ(clean);
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "DS Safety Systems WhatsApp Agent" }));

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const message of messages) {
          if (message.type !== "text" || !message.from) continue;
          const reply = await handleMessage(message.from, message.text?.body || "");
          await sendText(message.from, reply);
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
});

app.listen(PORT, () => console.log(`DS Safety Systems WhatsApp Agent listening on ${PORT}`));
