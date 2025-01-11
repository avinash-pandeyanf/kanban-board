const express = require("express");
const Task = require("../models/Task");
const router = express.Router();

// Get all tasks with optional search
router.get("/", async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { assignees: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        const tasks = await Task.find(query).sort({ updatedAt: -1 });
        res.json(tasks);
    } catch (err) {
        console.error("Error fetching tasks:", err);
        res.status(500).json({ message: err.message });
    }
});

// Add a new task
router.post("/", async (req, res) => {
    try {
        console.log("Received task data:", req.body);
        
        const task = new Task({
            name: req.body.name,
            description: req.body.description,
            dueDate: new Date(req.body.dueDate),
            assignees: Array.isArray(req.body.assignees) ? req.body.assignees : [],
            status: req.body.status || "Todo"
        });

        const newTask = await task.save();
        console.log("Created new task:", newTask);
        res.status(201).json(newTask);
    } catch (err) {
        console.error("Error creating task:", err);
        res.status(400).json({ 
            message: err.message,
            errors: err.errors 
        });
    }
});

// Update a task
router.put("/:id", async (req, res) => {
    try {
        // Ensure assignees is an array
        if (req.body.assignees && !Array.isArray(req.body.assignees)) {
            return res.status(400).json({ 
                message: "Assignees must be an array" 
            });
        }

        const task = await Task.findByIdAndUpdate(
            req.params.id,
            { 
                ...req.body,
                updatedAt: new Date()
            },
            { 
                new: true,
                runValidators: true 
            }
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json(task);
    } catch (err) {
        console.error("Error updating task:", err);
        res.status(400).json({ 
            message: err.message,
            errors: err.errors 
        });
    }
});

// Delete a task
router.delete("/:id", async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json({ message: "Task deleted successfully", taskId: req.params.id });
    } catch (err) {
        console.error("Error deleting task:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
