const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(
  "mongodb+srv://vicky:vishal1234@flutter-e2e-chat.klxpgkv.mongodb.net/chatdb?retryWrites=true&w=majority"
)
.then(() => {
  console.log("MongoDB Connected ✅");
})
.catch((err) => {
  console.log("MongoDB Error:", err);
});

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

app.listen(5000, () => {
  console.log("Server running on port 5000 ✅");
});