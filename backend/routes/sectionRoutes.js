const express = require("express");
const Section = require("../models/Section");
const Task = require("../models/Task");
const router = express.Router();

// Get all sections
router.get("/", async (req, res) => {
    try {
        const sections = await Section.find().sort({ order: 1 });
        if (sections.length === 0) {
            // Initialize default sections if none exist
            const defaultSections = ["Todo", "In Progress", "Completed"].map(
                (name, index) => ({ name, order: index })
            );
            const createdSections = await Section.insertMany(defaultSections);
            return res.json(createdSections);
        }
        res.json(sections);
    } catch (err) {
        console.error("Error fetching sections:", err);
        res.status(500).json({ message: err.message });
    }
});

// Add new section
router.post("/", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Section name is required" });
        }

        // Check if there are existing sections
        const existingSections = await Section.find();
        const newOrder = existingSections.length > 0 ? existingSections.length : 0;

        const newSection = new Section({
            name,
            order: newOrder
        });

        await newSection.save();

        // Return all sections after adding the new one
        const sections = await Section.find().sort({ order: 1 });
        res.status(201).json(sections);
    } catch (err) {
        console.error("Error adding section:", err);
        res.status(400).json({ message: err.message });
    }
});

// Update section
router.put("/:id", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Section name is required" });
        }

        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: "Section not found" });
        }

        const oldName = section.name;
        section.name = name;
        await section.save();

        // Update tasks with old section name
        await Task.updateMany(
            { status: oldName },
            { $set: { status: name } }
        );

        const sections = await Section.find().sort({ order: 1 });
        res.json(sections);
    } catch (err) {
        console.error("Error updating section:", err);
        res.status(400).json({ message: err.message });
    }
});

// Delete section
router.delete("/:id", async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({ message: "Section not found" });
        }

        const oldName = section.name;
        await section.deleteOne();

        // Update remaining sections order
        const remainingSections = await Section.find().sort({ order: 1 });
        for (let i = 0; i < remainingSections.length; i++) {
            remainingSections[i].order = i;
            await remainingSections[i].save();
        }

        // Move tasks to Todo section
        await Task.updateMany(
            { status: oldName },
            { $set: { status: "Todo" } }
        );

        res.json(remainingSections);
    } catch (err) {
        console.error("Error deleting section:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
