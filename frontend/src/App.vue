<template>
  <div id="app">
    <KanbanBoard />
  </div>
</template>

<script>
import KanbanBoard from "./components/KanbanBoard.vue";
import '@fortawesome/fontawesome-free/css/all.css';

export default {
  components: {
    KanbanBoard,
  },
};
</script>

<style>
/* Reset and global styles */
* {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  background: #f5f6f8;
  color: #333;
  line-height: 1.5;
}

#app {
  height: 100vh;
}

/* Global button styles */
button {
  font-family: inherit;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}

button:hover {
  background: #f0f0f0;
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>