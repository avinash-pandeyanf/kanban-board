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
      <div class="task-assignees">
        <div v-for="(assignee, index) in task.assignees" 
             :key="index" 
             class="avatar"
             :title="assignee"
             :style="{ backgroundColor: getAvatarColor(assignee) }">
          {{ getInitials(assignee) }}
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
    getAvatarColor(name) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
      ];
      const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      return colors[Math.abs(hash) % colors.length];
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: grab;
  transition: all 0.2s ease;
  border: 1px solid #eee;
}

.task-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-1px);
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
  color: #666;
  font-size: 13px;
  margin: 8px 0;
  line-height: 1.4;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  font-size: 12px;
  color: #666;
}

.task-due-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-assignees {
  display: flex;
  gap: 4px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 500;
  color: white;
  cursor: default;
  transition: transform 0.2s;
}

.avatar:hover {
  transform: scale(1.1);
}
</style>
