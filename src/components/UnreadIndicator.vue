<template>
  <div v-if="show" class="unread-indicator" @click="handleClick">
    <span class="unread-text">{{ unreadCount }} 条新消息</span>
    <span class="unread-icon">↓</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  unreadCount: number;
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  scrollToBottom: [];
}>();

const handleClick = () => {
  emit("scrollToBottom");
};
</script>

<style scoped>
.unread-indicator {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background-color: #1890ff;
  color: #fff;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 30;
  transition: all 0.3s ease;
  animation: slideUp 0.3s ease;
}

.unread-indicator:hover {
  background-color: #40a9ff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%) translateY(-2px);
}

.unread-indicator:active {
  background-color: #096dd9;
  transform: translateX(-50%) translateY(0);
}

.unread-text {
  font-weight: 500;
}

.unread-icon {
  font-size: 14px;
  animation: bounce 1s infinite;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}
</style>

