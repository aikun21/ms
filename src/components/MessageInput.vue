<template>
  <div class="message-input-container">
    <div class="input-wrapper">
      <input
        v-model="inputValue"
        @keyup.enter.exact="handleSend"
        @keyup.ctrl.enter="handleSend"
        type="text"
        placeholder="输入消息内容，按Enter发送..."
        class="message-input"
        :disabled="isSending"
      />
      <button
        @click="handleSend"
        :disabled="!canSend || isSending"
        class="send-button"
      >
        {{ isSending ? "发送中..." : "发送" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useMessageStore } from "@/store/messageStore";

const DRAFT_STORAGE_KEY = "message-draft";

const messageStore = useMessageStore();
const inputValue = ref("");
const isSending = ref(false);

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const canSend = computed(() => {
  return inputValue.value.trim().length > 0 && !isSending.value;
});

/**
 * 保存草稿到本地存储
 */
const saveDraft = () => {
  try {
    if (inputValue.value.trim()) {
      localStorage.setItem(DRAFT_STORAGE_KEY, inputValue.value);
    } else {
      // 如果输入框为空，清除草稿
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  } catch (error) {
    console.error("保存草稿失败:", error);
  }
};

/**
 * 从本地存储恢复草稿
 */
const restoreDraft = () => {
  try {
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft) {
      inputValue.value = draft;
    }
  } catch (error) {
    console.error("恢复草稿失败:", error);
  }
};

/**
 * 清除草稿
 */
const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.error("清除草稿失败:", error);
  }
};

// 监听输入值变化，防抖保存草稿
watch(
  inputValue,
  () => {
    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    // 设置新的防抖定时器，500ms后保存
    debounceTimer = setTimeout(() => {
      saveDraft();
    }, 500);
  }
);

// 组件挂载时恢复草稿
onMounted(() => {
  restoreDraft();
});

// 组件卸载前保存草稿（确保最后的内容被保存）
onBeforeUnmount(() => {
  // 清除防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  // 立即保存草稿
  saveDraft();
});

const handleSend = async () => {
  if (!canSend.value) return;

  const content = inputValue.value.trim();
  inputValue.value = "";
  isSending.value = true;

  // 发送成功后清除草稿
  clearDraft();

  try {
    await messageStore.sendNewMessage(content);
  } finally {
    isSending.value = false;
  }
};
</script>

<style scoped>
.message-input-container {
  padding: 16px;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  max-width: 1200px;
  margin: 0 auto;
}

.message-input {
  flex: 1;
  padding: 10px 16px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  border-color: #1890ff;
}

.message-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.send-button {
  padding: 10px 24px;
  font-size: 14px;
  color: #fff;
  background-color: #1890ff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.send-button:hover:not(:disabled) {
  background-color: #40a9ff;
}

.send-button:active:not(:disabled) {
  background-color: #096dd9;
}

.send-button:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}
</style>

