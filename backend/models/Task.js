const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  dueDate: { type: Date, default: Date.now },
  assignee: { type: String, default: "" },
  status: { type: String, default: "Todo" }
}, {
  timestamps: true
});

module.exports = mongoose.model("Task", TaskSchema);
