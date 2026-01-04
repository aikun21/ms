<template>
  <div class="message-search-container">
    <div class="search-wrapper">
      <input
        v-model="searchKeyword"
        @input="handleSearch"
        type="text"
        placeholder="搜索消息内容..."
        class="search-input"
      />
      <select
        v-model="selectedSender"
        @change="handleFilter"
        class="sender-filter"
      >
        <option value="">全部发送人</option>
        <option v-for="sender in senderList" :key="sender" :value="sender">
          {{ sender }}
        </option>
      </select>
      <button
        v-if="searchKeyword || selectedSender"
        @click="handleClear"
        class="clear-button"
      >
        清除
      </button>
    </div>
    <div v-if="searchKeyword || selectedSender" class="search-result-info">
      找到 {{ filteredCount }} 条匹配的消息
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useMessageStore } from "@/store/messageStore";

const messageStore = useMessageStore();
const searchKeyword = ref("");
const selectedSender = ref("");

// 获取所有发送人列表
const senderList = computed(() => {
  const senders = new Set<string>();
  messageStore.messages.forEach((msg) => {
    if (msg.sender) {
      senders.add(msg.sender);
    }
  });
  return Array.from(senders).sort();
});

// 过滤后的消息数量
const filteredCount = computed(() => {
  return messageStore.filteredMessages.length;
});

// 搜索处理
const handleSearch = () => {
  messageStore.setSearchFilter({
    keyword: searchKeyword.value.trim(),
    sender: selectedSender.value,
  });
};

// 过滤处理
const handleFilter = () => {
  messageStore.setSearchFilter({
    keyword: searchKeyword.value.trim(),
    sender: selectedSender.value,
  });
};

// 清除搜索和过滤
const handleClear = () => {
  searchKeyword.value = "";
  selectedSender.value = "";
  messageStore.setSearchFilter({
    keyword: "",
    sender: "",
  });
};

// 同步搜索条件（当外部清空搜索时，同步本地状态）
watch(
  () => messageStore.searchFilter,
  (newFilter) => {
    if (!newFilter.keyword && searchKeyword.value) {
      searchKeyword.value = "";
    }
    if (!newFilter.sender && selectedSender.value) {
      selectedSender.value = "";
    }
  },
  { deep: true }
);
</script>

<style scoped>
.message-search-container {
  padding: 12px 16px;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.search-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #1890ff;
}

.sender-filter {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  outline: none;
  background-color: #fff;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 150px;
}

.sender-filter:focus {
  border-color: #1890ff;
}

.clear-button {
  padding: 8px 16px;
  font-size: 14px;
  color: #666;
  background-color: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-button:hover {
  color: #1890ff;
  border-color: #1890ff;
}

.search-result-info {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}
</style>

