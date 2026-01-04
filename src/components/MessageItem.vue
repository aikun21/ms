<template>
  <div class="message-item" :class="{ revoked: message.isRevoked, deleted: message.isDeleted }">
    <div class="message-content">
      <div class="message-header">
        <span v-if="message.sender" class="message-sender">{{ message.sender }}</span>
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
      </div>
      <div v-if="message.isRevoked" class="revoked-notice">
        <span class="revoked-text">此消息已撤回</span>
      </div>
      <div v-else-if="message.isDeleted" class="deleted-notice">
        <span class="deleted-text">此消息已删除</span>
      </div>
      <div v-else class="message-text" v-html="highlightedContent"></div>
      <div class="message-meta">
        <span v-if="statusText && !message.isRevoked && !message.isDeleted" class="message-status" :class="statusClass">
          {{ statusText }}
        </span>
        <button v-if="message.status === MessageStatus.FAILED || message.status === MessageStatus.PENDING"
          @click="handleRetry" class="retry-button">
          重试
        </button>
        <button v-if="canRevoke && !message.isRevoked && !message.isDeleted" @click="handleRevoke"
          class="revoke-button">
          撤回
        </button>
        <button v-if="canDelete && !message.isRevoked && !message.isDeleted" @click="handleDelete"
          class="delete-button">
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "@/types/message";
import { MessageStatus } from "@/types/message";
import { useMessageStore } from "@/store/messageStore";

interface Props {
  message: Message;
}

const props = defineProps<Props>();
const messageStore = useMessageStore();

const emit = defineEmits<{
  retry: [id: string];
}>();

const statusText = computed(() => {
  // 如果消息已撤回或已删除，不显示状态
  if (props.message.isRevoked || props.message.isDeleted) {
    return "";
  }

  switch (props.message.status) {
    case MessageStatus.SENDING:
      return "发送中...";
    case MessageStatus.SUCCESS:
      return "发送成功";
    case MessageStatus.FAILED:
      return "发送失败";
    case MessageStatus.PENDING:
      return "等待发送";
    default:
      return "";
  }
});

const statusClass = computed(() => {
  return {
    "status-sending": props.message.status === MessageStatus.SENDING,
    "status-success": props.message.status === MessageStatus.SUCCESS,
    "status-failed": props.message.status === MessageStatus.FAILED,
    "status-pending": props.message.status === MessageStatus.PENDING,
  };
});

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * 高亮显示匹配的关键字
 */
const highlightedContent = computed(() => {
  const keyword = messageStore.searchFilter.keyword;
  if (!keyword) {
    return escapeHtml(props.message.content);
  }

  const regex = new RegExp(`(${escapeRegex(keyword)})`, "gi");
  const escapedContent = escapeHtml(props.message.content);
  return escapedContent.replace(
    regex,
    '<mark class="highlight">$1</mark>'
  );
});

/**
 * 转义 HTML 特殊字符
 */
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 转义正则表达式特殊字符
 */
const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const handleRetry = () => {
  emit("retry", props.message.id);
};

/**
 * 检查是否可以撤回消息
 * 条件：消息发送成功、未撤回、未删除，且在时间限制内（2分钟）
 */
const canRevoke = computed(() => {
  return messageStore.canRevokeMessage(props.message.id);
});

/**
 * 检查是否可以删除消息
 * 条件：消息发送成功、未撤回、未删除
 */
const canDelete = computed(() => {
  const msg = props.message;
  return (
    msg.status === MessageStatus.SUCCESS &&
    !msg.isRevoked &&
    !msg.isDeleted
  );
});

/**
 * 处理撤回消息
 */
const handleRevoke = async () => {
  if (!canRevoke.value) {
    return;
  }

  const success = await messageStore.revokeMessageById(props.message.id);
  if (success) {
    console.log("消息已撤回:", props.message.id);
  } else {
    console.error("撤回消息失败:", props.message.id);
    // 可以在这里添加错误提示，比如使用 toast 组件
    alert("撤回消息失败，请稍后重试");
  }
};

/**
 * 处理删除消息
 */
const handleDelete = async () => {
  if (!canDelete.value) {
    return;
  }

  // 确认删除
  if (!confirm("确定要删除这条消息吗？")) {
    return;
  }

  const success = await messageStore.deleteMessageById(props.message.id);
  if (success) {
    console.log("消息已删除:", props.message.id);
  } else {
    console.error("删除消息失败:", props.message.id);
    // 可以在这里添加错误提示，比如使用 toast 组件
    alert("删除消息失败，请稍后重试");
  }
};
</script>

<style scoped>
.message-item {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fff;
  transition: background-color 0.2s;
  height: 80px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.message-item:hover {
  background-color: #f9f9f9;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.message-sender {
  font-weight: 600;
  color: #1890ff;
}

.message-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-text :deep(.highlight) {
  background-color: #fff566;
  color: #333;
  padding: 2px 0;
  font-weight: 500;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.message-time {
  color: #999;
}

.message-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-sending {
  color: #1890ff;
  background-color: #e6f7ff;
}

.status-success {
  color: #52c41a;
  background-color: #f6ffed;
}

.status-failed {
  color: #ff4d4f;
  background-color: #fff1f0;
}

.status-pending {
  color: #faad14;
  background-color: #fffbe6;
}

.retry-button {
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  background-color: #1890ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #40a9ff;
}

.retry-button:active {
  background-color: #096dd9;
}

.revoke-button {
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  background-color: #faad14;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s, visibility 0.2s;
  opacity: 0;
  visibility: hidden;
}

.message-item:hover .revoke-button {
  opacity: 1;
  visibility: visible;
}

.revoke-button:hover {
  background-color: #ffc53d;
}

.revoke-button:active {
  background-color: #d48806;
}

.delete-button {
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  background-color: #ff4d4f;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s, visibility 0.2s;
  opacity: 0;
  visibility: hidden;
}

.message-item:hover .delete-button {
  opacity: 1;
  visibility: visible;
}

.delete-button:hover {
  background-color: #ff7875;
}

.delete-button:active {
  background-color: #cf1322;
}

.revoked-notice,
.deleted-notice {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.revoked-text,
.deleted-text {
  color: #999;
}

.message-item.revoked,
.message-item.deleted {
  opacity: 0.6;
}
</style>
