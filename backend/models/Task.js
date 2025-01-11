const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    default: "",
    trim: true 
  },
  dueDate: { 
    type: Date, 
    default: Date.now 
  },
  assignees: [{ 
    type: String,
    trim: true
  }],
  status: { 
    type: String, 
    default: "Todo",
    enum: ["Todo", "In Progress", "Done"]
  }
}, {
  timestamps: true
});

// Add index for better search performance
TaskSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model("Task", TaskSchema);
