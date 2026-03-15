const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB Connected ✅"))
.catch((err) => console.log("MongoDB Error:", err));

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: { type: String, required: true },
  publicKey: { type: String, default: '' }, // ← RSA Public Key
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  encryptedText: { type: String, required: true },
  iv: { type: String, required: true },
  encryptedAESKey: { type: String, required: true },      // receiver's key
  encryptedAESKeySender: { type: String, required: true }, // sender's key
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// Routes
app.get("/", (req, res) => res.send("Backend is running ✅"));

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

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const {
      chatId,
      senderId,
      encryptedText,
      iv,
      encryptedAESKey,
      encryptedAESKeySender,
    } = req.body;
    const message = new Message({
      chatId,
      senderId,
      encryptedText,
      iv,
      encryptedAESKey,
      encryptedAESKeySender,
    });
    await message.save();
    io.to(chatId).emit("newMessage", message);
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.delete("/messages/:messageId", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.messageId);
    io.to(req.params.chatId).emit("messageDeleted", {
      messageId: req.params.messageId
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
app.put("/messages/read/:chatId/:userId", async (req, res) => {
  try {
    await Message.updateMany(
      { chatId: req.params.chatId, senderId: { $ne: req.params.userId }, isRead: false },
      { isRead: true }
    );
    io.to(req.params.chatId).emit("messagesRead", { chatId: req.params.chatId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/users/publickey/:uid", async (req, res) => {
  try {
    const { publicKey } = req.body;
    await User.findOneAndUpdate(
      { uid: req.params.uid },
      { publicKey }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user public key
app.get("/users/publickey/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    res.json({ publicKey: user?.publicKey || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/chats/last/:uid", async (req, res) => {
  try {
    const users = await User.find({ uid: { $ne: req.params.uid } });
    const result = await Promise.all(users.map(async (user) => {
      const sorted = [req.params.uid, user.uid].sort();
      const chatId = `${sorted[0]}_${sorted[1]}`;
      const lastMsg = await Message.findOne({ chatId })
        .sort({ timestamp: -1 });
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isOnline: user.isOnline,
        lastMessage: lastMsg ? lastMsg.encryptedText : null,
        lastMessageTime: lastMsg ? lastMsg.timestamp : null,
        isRead: lastMsg ? lastMsg.isRead : true,
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update online status
app.put("/users/status/:uid", async (req, res) => {
  try {
    const { isOnline } = req.body;
    await User.findOneAndUpdate(
      { uid: req.params.uid },
      { isOnline, lastSeen: Date.now() }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("leaveChat", (chatId) => {
    socket.leave(chatId);
  });

  // Typing indicator
  socket.on("typing", ({ chatId, userId, isTyping }) => {
    socket.to(chatId).emit("typingStatus", { userId, isTyping });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log("Server running ✅");
});