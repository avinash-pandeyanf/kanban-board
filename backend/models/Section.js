const mongoose = require("mongoose");

const DEFAULT_SECTIONS = ["Todo", "In Progress", "Completed"];

const SectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        default: 0
    }
});

const Section = mongoose.model("Section", SectionSchema);

// Initialize default sections if they don't exist
async function initializeDefaultSections() {
    try {
        const count = await Section.countDocuments();
        if (count === 0) {
            await Section.insertMany(
                DEFAULT_SECTIONS.map((name, index) => ({
                    name,
                    order: index
                }))
            );
        }
    } catch (error) {
        console.error("Error initializing default sections:", error);
    }
}

initializeDefaultSections();

module.exports = Section;
