const express = require("express");
const Section = require("../models/Section");
const Task = require("../models/Task");
const router = express.Router();

const DEFAULT_SECTIONS = ["Todo", "In Progress", "Completed"];

// Get all sections
router.get("/", async (req, res) => {
    try {
        let sections = await Section.find().sort({ order: 1 });
        
        // If no sections exist, create default ones
        if (sections.length === 0) {
            const defaultSections = DEFAULT_SECTIONS.map((name, index) => ({
                name,
                order: index
            }));
            sections = await Section.insertMany(defaultSections);
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

        // Check if section with this name already exists
        const existingSection = await Section.findOne({ name: name.trim() });
        if (existingSection) {
            return res.status(400).json({ message: "Section with this name already exists" });
        }

        // Get the highest order
        const lastSection = await Section.findOne().sort({ order: -1 });
        const order = lastSection ? lastSection.order + 1 : 0;

        const newSection = new Section({
            name: name.trim(),
            order
        });

        await newSection.save();
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

        // Store the section name before deletion
        const oldName = section.name;

        // Delete the section
        await Section.deleteOne({ _id: req.params.id });

        // Update remaining sections order
        const remainingSections = await Section.find().sort({ order: 1 });
        for (let i = 0; i < remainingSections.length; i++) {
            await Section.findByIdAndUpdate(remainingSections[i]._id, { order: i });
        }

        // Move tasks to Todo section
        await Task.updateMany(
            { status: oldName },
            { $set: { status: "Todo" } }
        );

        const updatedSections = await Section.find().sort({ order: 1 });
        res.json(updatedSections);
    } catch (err) {
        console.error("Error deleting section:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
