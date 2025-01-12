<template>
  <div class="task-card" :style="{ borderLeft: `4px solid ${getStatusColor(task.status)}` }">
    <div class="task-header">
      <h3>{{ task.name }}</h3>
      <div class="task-menu">
        <button class="menu-btn" @click="showMenu = !showMenu">
          <i class="fas fa-ellipsis-h"></i>
        </button>
        <div v-if="showMenu" class="menu-dropdown">
          <button @click="onEdit">Edit</button>
          <button @click="onDelete">Delete</button>
        </div>
      </div>
    </div>
    <p class="task-description">{{ task.description }}</p>
    <div class="task-footer">
      <div class="assignees">
        <div v-for="assignee in task.assignees" :key="assignee" 
             class="assignee" :style="{ backgroundColor: getAssigneeColor(assignee) }">
          {{ assignee.charAt(0).toUpperCase() }}
        </div>
      </div>
      <div class="due-date" v-if="task.dueDate">
        <i class="far fa-calendar"></i>
        {{ new Date(task.dueDate).toLocaleDateString() }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TaskCard',
  props: {
    task: {
      type: Object,
      required: true
    }
  },
  emits: ['delete-task', 'edit-task'],
  data() {
    return {
      showMenu: false
    };
  },
  methods: {
    getStatusColor(status) {
      const colors = {
        'Todo': '#ff4757',
        'In Progress': '#2ed573',
        'Completed': '#1e90ff'
      };
      return colors[status] || '#dfe4ea';
    },
    getAssigneeColor(assignee) {
      const colors = ['#4834d4', '#6ab04c', '#eb4d4b', '#22a6b3', '#f0932b'];
      let hash = 0;
      for (let i = 0; i < assignee.length; i++) {
        hash = assignee.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    },
    onDelete() {
      this.showMenu = false;
      this.$emit('delete-task', this.task);
    },
    onEdit() {
      this.showMenu = false;
      this.$emit('edit-task', this.task);
    }
  }
};
</script>

<style scoped>
.task-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.task-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.task-description {
  color: #666;
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.4;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.assignees {
  display: flex;
  gap: 4px;
}

.assignee {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.due-date {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-menu {
  position: relative;
}

.menu-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
}

.menu-btn:hover {
  background: #f5f5f5;
}

.menu-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
  min-width: 120px;
}

.menu-dropdown button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  color: #333;
  font-size: 14px;
}

.menu-dropdown button:hover {
  background: #f5f5f5;
}
</style>
