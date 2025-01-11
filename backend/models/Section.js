const mongoose = require("mongoose");

const DEFAULT_SECTIONS = ["Todo", "In Progress", "Done"];

const SectionSchema = new mongoose.Schema({
    sections: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        isDefault: {
            type: Boolean,
            default: false
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    defaultSectionNames: {
        type: [String],
        default: DEFAULT_SECTIONS
    }
}, {
    timestamps: true
});

// Initialize with default sections if empty
SectionSchema.pre('save', function(next) {
    if (this.sections.length === 0) {
        this.sections = DEFAULT_SECTIONS.map((name, index) => ({
            name,
            isDefault: true,
            order: index
        }));
    }
    next();
});

module.exports = mongoose.model("Section", SectionSchema);
