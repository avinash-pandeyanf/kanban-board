const mongoose = require("mongoose");

const DEFAULT_SECTIONS = ["Todo", "In Progress", "Done"];

const SectionSchema = new mongoose.Schema({
    sections: {
        type: [String],
        default: DEFAULT_SECTIONS,
        validate: {
            validator: function(sections) {
                // Ensure default sections are always present
                return DEFAULT_SECTIONS.every(defaultSection => 
                    sections.includes(defaultSection)
                );
            },
            message: 'Cannot remove default sections (Todo, In Progress, Done)'
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Section", SectionSchema);
