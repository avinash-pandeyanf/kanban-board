const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        required: true,
        default: "Todo",
        enum: ["Todo", "In Progress", "Completed"]
    },
    dueDate: {
        type: Date
    },
    assignees: [{
        type: String,
        trim: true
    }],
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Task", TaskSchema);
