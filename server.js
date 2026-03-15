const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch((err) => console.log("MongoDB Error:", err));

// ── SCHEMAS ──
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  encryptedText: { type: String, required: true },
  iv: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// ── ROUTES ──

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// Save user after Firebase registration
app.post("/users", async (req, res) => {
  try {
    const { uid, email, displayName } = req.body;
    const existing = await User.findOne({ uid });
    if (existing) return res.json(existing);
    const user = new User({ uid, email, displayName });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send encrypted message
app.post("/messages", async (req, res) => {
  try {
    const { chatId, senderId, encryptedText, iv } = req.body;
    const message = new Message({ chatId, senderId, encryptedText, iv });
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for a chat
app.get("/messages/:chatId", async (req, res) => {
  try {
    const messages = await Message.find({
      chatId: req.params.chatId
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running ✅");
});