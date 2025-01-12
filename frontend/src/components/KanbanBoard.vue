<template>
  <div class="kanban-container">
    <div class="board-header">
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          @input="debounceSearch"
          placeholder="Search tasks..."
          class="search-input"
        >
        <i class="fas fa-search search-icon"></i>
      </div>
      <div class="filter-container">
        <select v-model="statusFilter" @change="filterTasks" class="status-filter">
          <option value="">All Statuses</option>
          <option v-for="section in sections" :key="section._id" :value="section.name">
            {{ section.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="kanban-board">
      <div v-for="section in sections" :key="section._id" class="kanban-section">
        <div class="section-header">
          <div class="section-title">
            <h2 @click="startEditingSection(section)">{{ section.name }}</h2>
            <div class="section-actions">
              <button class="edit-section-btn" @click="startEditingSection(section)" title="Edit section">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-section-btn" @click="confirmDeleteSection(section)" title="Delete section">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <button class="add-task-btn" @click="openAddTaskModal(section.name)" title="Add task">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <draggable 
          v-model="tasks[section.name]" 
          :group="{ name: 'tasks' }"
          item-key="_id"
          @end="updateTaskStatus"
          class="task-list"
        >
          <template #item="{ element }">
            <TaskCard
              :task="element"
              @delete-task="showDeleteConfirmation"
              @edit-task="showEditConfirmation"
            />
          </template>
        </draggable>
        <div v-if="!tasks[section.name] || tasks[section.name].length === 0" class="empty-section">
          <p class="empty-text">No tasks</p>
          <button class="add-task-btn-large" @click="openAddTaskModal(section.name)">
            + Add Task
          </button>
        </div>
      </div>
      <div class="add-section">
        <button class="add-section-btn" @click="addSection">+ Add Section</button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>

    <!-- Error Toast -->
    <div v-if="errorMessage" class="error-toast" @click="errorMessage = ''">
      {{ errorMessage }}
      <button class="close-error">&times;</button>
    </div>

    <!-- Task Modal -->
    <div v-if="showTaskModal" class="modal">
      <div class="modal-content">
        <h3>{{ editingTask ? 'Edit Task' : 'Add Task' }}</h3>
        <form @submit.prevent="saveTask">
          <input v-model="taskForm.name" placeholder="Task Name" required>
          <textarea v-model="taskForm.description" placeholder="Description" required></textarea>
          <input type="date" v-model="taskForm.dueDate" required>
          <div class="assignees-input">
            <div class="assignee-tags">
              <span v-for="(assignee, index) in taskForm.assignees || []" :key="index" class="assignee-tag">
                {{ assignee }}
                <button type="button" @click="removeAssignee(index)" class="remove-assignee">&times;</button>
              </span>
            </div>
            <input 
              v-model="newAssignee" 
              @keyup.enter="addAssignee"
              placeholder="Add assignee and press Enter"
              type="text"
            >
          </div>
          <div class="modal-buttons">
            <button type="button" @click="closeTaskModal">Cancel</button>
            <button type="submit">{{ editingTask ? 'Update' : 'Add' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Section Edit Modal -->
    <div v-if="editingSection" class="modal">
      <div class="modal-content">
        <h3>Edit Section</h3>
        <form @submit.prevent="saveSection">
          <input 
            v-model="sectionForm.name" 
            placeholder="Section Name" 
            required
            ref="sectionNameInput"
          >
          <div class="modal-buttons">
            <button type="button" @click="cancelEditSection">Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal confirmation-modal">
      <div class="modal-content">
        <h3>{{ confirmAction === 'delete' ? 'Delete Task' : 'Edit Task' }}</h3>
        <p>{{ confirmMessage }}</p>
        <div class="modal-buttons">
          <button type="button" @click="cancelConfirmation">Cancel</button>
          <button 
            type="button" 
            :class="{ 'delete-btn': confirmAction === 'delete' }"
            @click="handleConfirm"
          >
            {{ confirmAction === 'delete' ? 'Delete' : 'Edit' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable';
import TaskCard from './TaskCard.vue';
import axios from 'axios';
import '../assets/styles/kanban.css';

export default {
  name: 'KanbanBoard',
  components: {
    draggable,
    TaskCard
  },
  data() {
    return {
      sections: [],
      tasks: {},
      showTaskModal: false,
      showConfirmModal: false,
      editingTask: null,
      editingSection: null,
      sectionForm: {
        name: ""
      },
      confirmAction: '',
      confirmMessage: '',
      taskToConfirm: null,
      newAssignee: '',
      searchQuery: '',
      statusFilter: '',
      loading: false,
      errorMessage: '',
      searchTimeout: null,
      taskForm: {
        name: "",
        description: "",
        dueDate: "",
        assignees: [],
        status: ""
      }
    };
  },
  watch: {
    sections: {
      handler(newSections) {
        localStorage.setItem('kanbanSections', JSON.stringify(newSections));
        // Update tasks object when sections change
        const newTasks = {};
        newSections.forEach(section => {
          newTasks[section.name] = this.tasks[section.name] || [];
        });
        this.tasks = newTasks;
      },
      deep: true
    }
  },
  async created() {
    try {
      await this.fetchSections();
      await this.fetchTasks();
    } catch (error) {
      console.error("Error initializing board:", error);
      this.showError("Failed to load the board. Please refresh the page.");
    }
  },
  methods: {
    debounceSearch() {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        this.fetchTasks();
      }, 300);
    },
    async fetchSections() {
      try {
        const { data } = await axios.get(`${process.env.VUE_APP_API_URL}/api/sections`);
        this.sections = data;
        // Initialize tasks object for each section
        this.sections.forEach(section => {
          if (!this.tasks[section.name]) {
            this.$set(this.tasks, section.name, []);
          }
        });
      } catch (error) {
        console.error("Error fetching sections:", error);
        throw error;
      }
    },
    async fetchTasks() {
      try {
        this.loading = true;
        let url = new URL(`${process.env.VUE_APP_API_URL}/api/tasks`);
        
        if (this.searchQuery) {
          url.searchParams.append('search', this.searchQuery);
        }
        if (this.statusFilter) {
          url.searchParams.append('status', this.statusFilter);
        }

        const { data } = await axios.get(url.href);
        
        // Reset all sections
        this.sections.forEach(section => {
          this.tasks[section.name] = [];
        });

        // Distribute tasks to sections
        data.forEach(task => {
          if (this.tasks[task.status]) {
            this.tasks[task.status].push(task);
          }
        });
      } catch (error) {
        console.error("Error fetching tasks:", error);
        this.showError("Failed to fetch tasks. Please try again.");
      } finally {
        this.loading = false;
      }
    },
    showError(message, type = 'error') {
      this.errorMessage = message;
      const toast = document.querySelector('.error-toast');
      if (toast) {
        toast.style.backgroundColor = type === 'success' ? '#4CAF50' : '#ff4444';
      }
      setTimeout(() => {
        this.errorMessage = '';
      }, 5000);
    },
    filterTasks() {
      this.fetchTasks();
    },
    openAddTaskModal(status) {
      this.taskForm = {
        name: "",
        description: "",
        dueDate: "",
        assignees: [],
        status
      };
      this.editingTask = null;
      this.showTaskModal = true;
    },
    openEditTaskModal(task) {
      this.taskForm = { 
        ...task,
        assignees: Array.isArray(task.assignees) ? [...task.assignees] : []
      };
      this.editingTask = task;
      this.showTaskModal = true;
    },
    closeTaskModal() {
      this.showTaskModal = false;
      this.editingTask = null;
      this.taskForm = {
        name: "",
        description: "",
        dueDate: "",
        assignees: [],
        status: ""
      };
      this.newAssignee = '';
    },
    async saveTask() {
      try {
        this.loading = true;
        if (this.editingTask) {
          const { data } = await axios.put(`${process.env.VUE_APP_API_URL}/api/tasks/${this.editingTask._id}`, this.taskForm);
          const status = this.editingTask.status;
          this.tasks[status] = this.tasks[status].map(t => 
            t._id === this.editingTask._id ? data : t
          );
        } else {
          const { data } = await axios.post(`${process.env.VUE_APP_API_URL}/api/tasks`, this.taskForm);
          this.tasks[this.taskForm.status].push(data);
        }
        this.closeTaskModal();
      } catch (error) {
        console.error("Error saving task:", error);
        this.showError(error.response?.data?.message || "Failed to save task. Please try again.");
      } finally {
        this.loading = false;
      }
    },
    async updateTaskStatus({ moved }) {
      if (!moved) return;

      const task = moved.element;
      const newStatus = moved.to.id || this.sections.find(s => 
        this.tasks[s.name].includes(task)
      )?.name;

      if (newStatus && task.status !== newStatus) {
        try {
          await axios.put(`${process.env.VUE_APP_API_URL}/api/tasks/${task._id}`, {
            ...task,
            status: newStatus
          });
          task.status = newStatus;
        } catch (error) {
          console.error("Error updating task status:", error);
          this.showError("Failed to update task status");
          await this.fetchTasks(); // Refresh tasks to revert the change
        }
      }
    },
    async deleteTask(taskId) {
      try {
        await axios.delete(`${process.env.VUE_APP_API_URL}/api/tasks/${taskId}`);
        // Remove task from the UI
        for (const sectionName in this.tasks) {
          this.tasks[sectionName] = this.tasks[sectionName].filter(task => task._id !== taskId);
        }
        this.showError("Task deleted successfully", "success");
      } catch (error) {
        console.error("Error deleting task:", error);
        this.showError("Failed to delete task");
      }
    },
    async addSection() {
      const name = prompt("Enter section name:");
      if (name?.trim()) {
        try {
          this.loading = true;
          const { data } = await axios.post(`${process.env.VUE_APP_API_URL}/api/sections`, { name: name.trim() });
          this.sections = data;
          this.$set(this.tasks, name.trim(), []);
          this.showError(`Section "${name}" added successfully!`, 'success');
        } catch (error) {
          console.error("Error adding section:", error);
          this.showError(error.response?.data?.message || "Failed to add section");
        } finally {
          this.loading = false;
        }
      }
    },
    startEditingSection(section) {
      this.editingSection = section;
      this.sectionForm.name = section.name;
      this.$nextTick(() => {
        this.$refs.sectionNameInput?.focus();
      });
    },
    async saveSection() {
      try {
        this.loading = true;
        const { data } = await axios.put(
          `${process.env.VUE_APP_API_URL}/api/sections/${this.editingSection._id}`,
          { name: this.sectionForm.name.trim() }
        );
        this.sections = data;
        
        // Update tasks object with new section name
        const oldName = this.editingSection.name;
        const newName = this.sectionForm.name.trim();
        this.$set(this.tasks, newName, this.tasks[oldName] || []);
        if (oldName !== newName) {
          this.$delete(this.tasks, oldName);
        }
        
        this.cancelEditSection();
        this.showError(`Section renamed to "${newName}"`, 'success');
      } catch (error) {
        console.error("Error saving section:", error);
        this.showError(error.response?.data?.message || "Failed to save section");
      } finally {
        this.loading = false;
      }
    },
    cancelEditSection() {
      this.editingSection = null;
      this.sectionForm.name = "";
    },
    async confirmDeleteSection(section) {
      if (confirm(`Are you sure you want to delete "${section.name}" section? Tasks will be moved to Todo.`)) {
        try {
          this.loading = true;
          const { data } = await axios.delete(`${process.env.VUE_APP_API_URL}/api/sections/${section._id}`);
          this.sections = data;
          this.$delete(this.tasks, section.name);
          await this.fetchTasks(); // Refresh tasks as they might have moved
          this.showError(`Section "${section.name}" deleted`, 'success');
        } catch (error) {
          console.error("Error deleting section:", error);
          this.showError(error.response?.data?.message || "Failed to delete section");
        } finally {
          this.loading = false;
        }
      }
    },
    addAssignee() {
      if (this.newAssignee.trim()) {
        if (!this.taskForm.assignees.includes(this.newAssignee.trim())) {
          this.taskForm.assignees.push(this.newAssignee.trim());
        }
        this.newAssignee = '';
      }
    },
    removeAssignee(index) {
      this.taskForm.assignees.splice(index, 1);
    },
    showDeleteConfirmation(task) {
      this.taskToConfirm = task;
      this.confirmAction = 'delete';
      this.confirmMessage = `Are you sure you want to delete task "${task.name}"?`;
      this.showConfirmModal = true;
    },
    showEditConfirmation(task) {
      this.confirmAction = 'edit';
      this.confirmMessage = `Do you want to edit task "${task.name}"?`;
      this.taskToConfirm = task;
      this.showConfirmModal = true;
    },
    cancelConfirmation() {
      this.showConfirmModal = false;
      this.taskToConfirm = null;
      this.confirmAction = '';
      this.confirmMessage = '';
    },
    async handleConfirm() {
      if (this.confirmAction === 'delete') {
        await this.deleteTask(this.taskToConfirm._id);
      } else if (this.confirmAction === 'edit') {
        this.openEditTaskModal(this.taskToConfirm);
      }
      this.showConfirmModal = false;
      this.taskToConfirm = null;
      this.confirmAction = '';
      this.confirmMessage = '';
    },
  }
};
</script>

<style scoped>
/* Component-specific styles can go here if needed */
</style>