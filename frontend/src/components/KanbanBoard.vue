<template>
  <div class="kanban-container">
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
              @delete-task="deleteTask"
              @edit-task="openEditTaskModal"
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

    <!-- Task Modal -->
    <div v-if="showTaskModal" class="modal">
      <div class="modal-content">
        <h3>{{ editingTask ? 'Edit Task' : 'Add Task' }}</h3>
        <form @submit.prevent="saveTask">
          <input v-model="taskForm.name" placeholder="Task Name" required>
          <textarea v-model="taskForm.description" placeholder="Description" required></textarea>
          <input type="date" v-model="taskForm.dueDate" required>
          <input v-model="taskForm.assignee" placeholder="Assignee" required>
          <div class="modal-buttons">
            <button type="button" @click="closeTaskModal">Cancel</button>
            <button type="submit">{{ editingTask ? 'Update' : 'Add' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import TaskCard from "./TaskCard.vue";
import { getTasks, addTask, updateTask, deleteTask } from "../services/taskService";
import draggable from 'vuedraggable';

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
      editingTask: null,
      taskForm: {
        name: "",
        description: "",
        dueDate: "",
        assignee: "",
        status: ""
      }
    };
  },
  async created() {
    await this.fetchTasks();
  },
  methods: {
    async fetchTasks() {
      try {
        const { data } = await getTasks();
        console.log('Fetched tasks:', data);
        this.sections.forEach(section => {
          this.tasks[section] = data.filter(task => task.status === section);
        });
      } catch (error) {
        console.error("Error fetching tasks:", error);
      }
    },
    openAddTaskModal(status) {
      this.taskForm = {
        name: "",
        description: "",
        dueDate: "",
        assignee: "",
        status
      };
      this.editingTask = null;
      this.showTaskModal = true;
    },
    openEditTaskModal(task) {
      this.taskForm = { ...task };
      this.editingTask = task;
      this.showTaskModal = true;
    },
    closeTaskModal() {
      this.showTaskModal = false;
      this.editingTask = null;
      this.taskForm = { name: "", description: "", dueDate: "", assignee: "", status: "" };
    },
    async saveTask() {
      try {
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
    addSection() {
      const sectionName = prompt("Enter section name:");
      if (sectionName && !this.sections.includes(sectionName)) {
        this.sections.push(sectionName);
        this.tasks[sectionName] = [];
      }
    }
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
</style>