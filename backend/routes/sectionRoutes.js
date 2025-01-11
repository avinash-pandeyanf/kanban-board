const express = require("express");
const Section = require("../models/Section");
const Task = require("../models/Task");
const router = express.Router();

// Get sections
router.get("/", async (req, res) => {
    try {
        let section = await Section.findOne();
        if (!section) {
            section = await Section.create({});
        }
        res.json(section.sections.sort((a, b) => a.order - b.order));
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

        let section = await Section.findOne();
        if (!section) {
            section = new Section();
        }

        const newSection = {
            name,
            isDefault: false,
            order: section.sections.length
        };

        section.sections.push(newSection);
        await section.save();
        
        res.status(201).json(section.sections.sort((a, b) => a.order - b.order));
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

        const section = await Section.findOne();
        if (!section) {
            return res.status(404).json({ message: "No sections found" });
        }

        const sectionIndex = section.sections.findIndex(s => s._id.toString() === req.params.id);
        if (sectionIndex === -1) {
            return res.status(404).json({ message: "Section not found" });
        }

        // Update section name
        section.sections[sectionIndex].name = name;
        await section.save();

        // Update tasks with old section name
        await Task.updateMany(
            { status: section.sections[sectionIndex].name },
            { $set: { status: name } }
        );

        res.json(section.sections.sort((a, b) => a.order - b.order));
    } catch (err) {
        console.error("Error updating section:", err);
        res.status(400).json({ message: err.message });
    }
});

// Delete section
router.delete("/:id", async (req, res) => {
    try {
        const section = await Section.findOne();
        if (!section) {
            return res.status(404).json({ message: "No sections found" });
        }

        const sectionIndex = section.sections.findIndex(s => s._id.toString() === req.params.id);
        if (sectionIndex === -1) {
            return res.status(404).json({ message: "Section not found" });
        }

        const sectionToDelete = section.sections[sectionIndex];

        // Delete the section
        section.sections.splice(sectionIndex, 1);
        
        // Reorder remaining sections
        section.sections.forEach((s, index) => {
            s.order = index;
        });

        await section.save();

        // Move tasks to Todo section or delete them
        await Task.updateMany(
            { status: sectionToDelete.name },
            { $set: { status: "Todo" } }
        );

        res.json(section.sections.sort((a, b) => a.order - b.order));
    } catch (err) {
        console.error("Error deleting section:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
