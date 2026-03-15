const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://vicky:vishal2262@flutter-e2e-chat.klxpgkv.mongodb.net/chatdb?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log("MongoDB Connected ✅");
})
.catch((err) => {
  console.log("MongoDB Error:", err);
});

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running ✅");
});