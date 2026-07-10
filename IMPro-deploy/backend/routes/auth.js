const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (await User.findOne({ email })) return res.status(409).json({ message: "Email already registered" });

    const user = new User({ name, email, password, role });
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    console.log("[register] success:", email);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("[register] error:", err.message);
    res.status(500).json({ message: "Registration failed: " + err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    console.log("[login] success:", email);
    res.json({ token, user });
  } catch (err) {
    console.error("[login] error:", err.message);
    res.status(500).json({ message: "Login failed: " + err.message });
  }
});

module.exports = router;
