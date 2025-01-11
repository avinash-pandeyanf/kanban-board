<template>
  <div class="task-card">
    <div class="task-header">
      <h3>{{ task.name }}</h3>
      <div class="task-menu">
        <button class="menu-btn" @click="showMenu = !showMenu">
          <i class="fas fa-ellipsis-h"></i>
        </button>
        <div v-if="showMenu" class="menu-dropdown">
          <button @click="editTask">Edit</button>
          <button @click="deleteTask">Delete</button>
        </div>
      </div>
    </div>
    <p class="task-description">{{ task.description }}</p>
    <div class="task-footer">
      <div class="task-due-date">
        <i class="far fa-calendar"></i>
        {{ formatDate(task.dueDate) }}
      </div>
      <div class="task-assignee">
        <div class="avatar">
          {{ getInitials(task.assignee) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    task: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      showMenu: false
    };
  },
  methods: {
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    },
    getInitials(name) {
      if (!name) return '';
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    },
    deleteTask() {
      this.showMenu = false;
      this.$emit('delete-task', this.task._id);
    },
    editTask() {
      this.showMenu = false;
      this.$emit('edit-task', this.task);
    }
  }
};
</script>

<style scoped>
.task-card {
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: grab;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.task-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.task-menu {
  position: relative;
}

.menu-btn {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #666;
}

.menu-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
}

.menu-dropdown button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.menu-dropdown button:hover {
  background: #f5f5f5;
}

.task-description {
  font-size: 12px;
  color: #666;
  margin: 0 0 12px 0;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
}

.task-due-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.avatar {
  width: 24px;
  height: 24px;
  background: #e0e0e0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 500;
  color: #666;
}
</style>
