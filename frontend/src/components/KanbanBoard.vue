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
              <button class="edit-section-btn" @click="startEditingSection(section)">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-section-btn" @click="confirmDeleteSection(section)">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <button class="add-task-btn" @click="openAddTaskModal(section.name)">
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
            @click="confirmAction === 'delete' ? confirmDelete() : confirmEdit()"
          >
            {{ confirmAction === 'delete' ? 'Delete' : 'Edit' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TaskCard from "./TaskCard.vue";
import { getTasks, addTask, updateTask, deleteTask } from "../services/taskService";
import draggable from 'vuedraggable';
import axios from 'axios';

export default {
  name: 'KanbanBoard',
  components: { 
    TaskCard,
    draggable
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
        // Initialize tasks object
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

        const { data } = await getTasks(url.search);
        
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
          const { data } = await updateTask(this.editingTask._id, this.taskForm);
          const status = this.editingTask.status;
          this.tasks[status] = this.tasks[status].map(t => 
            t._id === this.editingTask._id ? data : t
          );
        } else {
          const { data } = await addTask(this.taskForm);
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
    async updateTaskStatus({ item, to, from }) {
      const fromSection = from.parentElement.querySelector('h2').textContent;
      const toSection = to.parentElement.querySelector('h2').textContent;
      const taskId = item.getAttribute('data-id');
      const task = this.tasks[fromSection].find(t => t._id === taskId);
      
      if (task) {
        try {
          const updatedTask = { ...task, status: toSection };
          await updateTask(taskId, updatedTask);
          await this.fetchTasks(); // Refresh all tasks to ensure consistency
        } catch (error) {
          console.error("Error updating task status:", error);
          await this.fetchTasks(); // Refresh on error to revert changes
        }
      }
    },
    async deleteTask(id) {
      try {
        await deleteTask(id);
        Object.keys(this.tasks).forEach(status => {
          this.tasks[status] = this.tasks[status].filter(task => task._id !== id);
        });
      } catch (error) {
        console.error("Error deleting task:", error);
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
      this.confirmAction = 'delete';
      this.confirmMessage = `Are you sure you want to delete "${task.name}"?`;
      this.taskToConfirm = task;
      this.showConfirmModal = true;
    },
    showEditConfirmation(task) {
      this.confirmAction = 'edit';
      this.confirmMessage = `Do you want to edit "${task.name}"?`;
      this.taskToConfirm = task;
      this.showConfirmModal = true;
    },
    cancelConfirmation() {
      this.showConfirmModal = false;
      this.taskToConfirm = null;
      this.confirmAction = '';
      this.confirmMessage = '';
    },
    async confirmDelete() {
      if (this.taskToConfirm) {
        await this.deleteTask(this.taskToConfirm._id);
        this.cancelConfirmation();
      }
    },
    confirmEdit() {
      if (this.taskToConfirm) {
        this.openEditTaskModal(this.taskToConfirm);
        this.cancelConfirmation();
      }
    },
  }
};
</script>

<style scoped>
.kanban-container {
  padding: 20px;
  height: 100vh;
  background-color: #f5f6f8;
}

.kanban-board {
  display: flex;
  gap: 20px;
  overflow-x: auto;
  padding: 20px;
  height: calc(100vh - 40px);
}

.kanban-section {
  min-width: 300px;
  background: white;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  border-radius: 6px 6px 0 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.section-actions {
  display: flex;
  gap: 4px;
}

.edit-section-btn,
.delete-section-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
}

.edit-section-btn:hover {
  color: #4a9eff;
}

.delete-section-btn:hover {
  color: #ff4444;
}

.empty-section {
  padding: 16px;
  text-align: center;
}

.add-task-btn-large {
  width: 100%;
  padding: 8px;
  background: none;
  border: 2px dashed #ddd;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.add-task-btn-large:hover {
  border-color: #4a9eff;
  color: #4a9eff;
}

.add-section {
  display: flex;
  align-items: flex-start;
  padding: 16px;
}

.add-section-btn {
  background: #f5f6f8;
  border: 2px dashed #ddd;
  color: #666;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.add-section-btn:hover {
  background-color: #eef0f2;
  border-color: #ccc;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
}

.modal-content h3 {
  margin: 0 0 20px;
  color: #333;
}

.modal-content form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-content input,
.modal-content textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.modal-content textarea {
  min-height: 100px;
  resize: vertical;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.modal-buttons button {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.modal-buttons button[type="button"] {
  background: #f5f5f5;
  border: 1px solid #ddd;
  color: #666;
}

.modal-buttons button[type="submit"] {
  background: #007bff;
  border: 1px solid #0056b3;
  color: white;
}

.modal-buttons button:hover {
  opacity: 0.9;
}

.assignees-input {
  margin-bottom: 1rem;
}

.assignee-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.assignee-tag {
  background: #e1e1e1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.remove-assignee {
  background: none;
  border: none;
  padding: 0 0.25rem;
  cursor: pointer;
  color: #666;
}

.remove-assignee:hover {
  color: #ff4444;
}

.confirmation-modal .modal-content {
  max-width: 400px;
}

.delete-btn {
  background-color: #ff4444;
  color: white;
}

.delete-btn:hover {
  background-color: #ff0000;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 20px;
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4a9eff;
  box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
}

.search-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}

.filter-container {
  margin-left: 16px;
}

.status-filter {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4a9eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #ff4444;
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  cursor: pointer;
  animation: slideIn 0.3s ease;
}

.close-error {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  padding: 0 4px;
  cursor: pointer;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>