const express = require("express");
const Task = require("../models/Task");
const router = express.Router();

// Get all tasks
router.get("/", async (req, res) => {
    try {
        const tasks = await Task.find();
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
            assignee: req.body.assignee,
            status: req.body.status || "Todo"
        });

        const newTask = await task.save();
        console.log("Created new task:", newTask);
        res.status(201).json(newTask);
    } catch (err) {
        console.error("Error creating task:", err);
        res.status(400).json({ message: err.message });
    }
});

// Update a task
router.put("/:id", async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(task);
    } catch (err) {
        console.error("Error updating task:", err);
        res.status(400).json({ message: err.message });
    }
});

// Delete a task
router.delete("/:id", async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: "Task deleted" });
    } catch (err) {
        console.error("Error deleting task:", err);
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
