const express = require("express");
const router  = express.Router();
const User    = require("../models/User");

// GET profile
router.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT profile — also marks profileComplete = true on first save
router.put("/profile", async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name || !role) return res.status(400).json({ message: "Name and role are required" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, role, profileComplete: true },  // mark complete on first save
      { new: true }
    );
    res.json({ message: "Profile saved", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT password
router.put("/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user.id);
    if (!(await user.comparePassword(currentPassword)))
      return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE account
router.delete("/", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
