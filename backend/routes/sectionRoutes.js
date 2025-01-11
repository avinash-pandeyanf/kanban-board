const express = require("express");
const Section = require("../models/Section");
const router = express.Router();

// Get sections
router.get("/", async (req, res) => {
    try {
        let section = await Section.findOne();
        if (!section) {
            section = await Section.create({
                sections: ["Todo", "In Progress", "Done"]
            });
        }
        res.json(section.sections);
    } catch (err) {
        console.error("Error fetching sections:", err);
        res.status(500).json({ message: err.message });
    }
});

// Update sections
router.post("/", async (req, res) => {
    try {
        const { sections } = req.body;
        if (!Array.isArray(sections)) {
            return res.status(400).json({ message: "Sections must be an array" });
        }

        let section = await Section.findOne();
        if (!section) {
            section = new Section();
        }
        
        section.sections = sections;
        await section.save();
        
        res.json(section.sections);
    } catch (err) {
        console.error("Error updating sections:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
