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
          <option v-for="section in sections" :key="section" :value="section">
            {{ section }}
          </option>
        </select>
      </div>
    </div>

    <div class="kanban-board">
      <div v-for="section in sections" :key="section" class="kanban-section">
        <div class="section-header">
          <h2>{{ section }}</h2>
          <button class="add-task-btn" @click="openAddTaskModal(section)">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <draggable 
          v-model="tasks[section]" 
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
        <div v-if="!tasks[section] || tasks[section].length === 0" class="empty-section">
          <button class="add-task-btn-large" @click="openAddTaskModal(section)">
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
      sections: ["Todo", "In Progress", "Done"],
      tasks: { 
        "Todo": [], 
        "In Progress": [], 
        "Done": [] 
      },
      showTaskModal: false,
      showConfirmModal: false,
      editingTask: null,
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
          newTasks[section] = this.tasks[section] || [];
        });
        this.tasks = newTasks;
      },
      deep: true
    }
  },
  async created() {
    try {
      // Fetch sections first
      const { data: sections } = await axios.get(`${process.env.VUE_APP_API_URL}/api/sections`);
      if (Array.isArray(sections) && sections.length > 0) {
        // Ensure default sections are first
        const defaultSections = ["Todo", "In Progress", "Done"];
        const customSections = sections.filter(section => !defaultSections.includes(section));
        this.sections = [...defaultSections, ...customSections];
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
    }

    // Then fetch tasks
    await this.fetchTasks();
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
          this.tasks[section] = [];
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
      const sectionName = prompt("Enter section name:");
      if (sectionName && !this.sections.includes(sectionName)) {
        // Add new section after the default sections
        const defaultSections = ["Todo", "In Progress", "Done"];
        const insertIndex = defaultSections.length;
        this.sections.splice(insertIndex, 0, sectionName);
        this.$set(this.tasks, sectionName, []);
        
        try {
          await this.saveSectionsToBackend();
          this.showError(`Section "${sectionName}" added successfully!`, 'success');
        } catch (error) {
          this.sections = this.sections.filter(s => s !== sectionName);
          delete this.tasks[sectionName];
          this.showError("Failed to add section. Please try again.");
        }
      }
    },
    async saveSectionsToBackend() {
      try {
        await axios.post(`${process.env.VUE_APP_API_URL}/api/sections`, {
          sections: this.sections
        });
      } catch (error) {
        console.error("Error saving sections:", error);
        throw error; // Propagate error to handle it in the calling function
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
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.add-task-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
}

.add-task-btn:hover {
  background-color: #f5f5f5;
}

.task-list {
  flex-grow: 1;
  min-height: 100px;
  padding: 8px 0;
}

.empty-section {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.add-task-btn-large {
  background: none;
  border: 2px dashed #ddd;
  color: #666;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
}

.add-task-btn-large:hover {
  background-color: #f9f9f9;
  border-color: #ccc;
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