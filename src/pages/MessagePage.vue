<template>
  <div class="message-page">
    <div class="message-header">
      <h1>消息应用</h1>
      <div class="message-count">
        消息总数: {{ messageStore.messageCount }}
        <span v-if="messageStore.searchFilter.keyword || messageStore.searchFilter.sender" class="filtered-count">
          (筛选: {{ messageStore.filteredMessages.length }})
        </span>
      </div>
    </div>
    <NetworkStatus :show-actions="true" />
    <MessageSearch />
    <div class="message-body">
      <MessageList />
    </div>
    <MessageInput />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useMessageStore } from "@/store/messageStore";
import MessageList from "@/components/MessageList.vue";
import MessageInput from "@/components/MessageInput.vue";
import MessageSearch from "@/components/MessageSearch.vue";
import NetworkStatus from "@/components/NetworkStatus.vue";

const messageStore = useMessageStore();

// 监听网络重连事件，自动重发待发送的消息
const handleNetworkReconnected = () => {
  console.log('网络重连事件触发，开始重发待发送消息');
  messageStore.resendPendingMessages();
};

onMounted(() => {
  window.addEventListener('network-reconnected', handleNetworkReconnected);
});

onUnmounted(() => {
  window.removeEventListener('network-reconnected', handleNetworkReconnected);
});
</script>

<style scoped>
.message-page {
  width: 100%;
  max-width: 1200px;
  height: 100vh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.message-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fafafa;
}

.message-header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.message-count {
  font-size: 14px;
  color: #666;
}

.filtered-count {
  color: #1890ff;
  margin-left: 8px;
}

.message-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
