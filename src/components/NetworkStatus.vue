<template>
    <div class="network-status" :class="{ offline: !networkStore.isOnline, reconnecting: networkStore.isReconnecting }">
        <div class="status-content">
            <span class="status-icon">{{ statusIcon }}</span>
            <span class="status-text">{{ statusText }}</span>
            <div class="status-actions" v-if="showActions">
                <button @click="handleSimulateOffline" class="action-button" :disabled="!networkStore.isOnline">
                    模拟断网
                </button>
                <button @click="handleSimulateOnline" class="action-button" :disabled="networkStore.isOnline">
                    模拟恢复
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNetworkStore } from "@/store/networkStore";
import { useMessageStore } from "@/store/messageStore";
import { setMockNetworkStatus } from "@/services/messageService";

interface Props {
    showActions?: boolean; // 是否显示操作按钮（用于测试）
}

const props = withDefaults(defineProps<Props>(), {
    showActions: false,
});

const networkStore = useNetworkStore();
const messageStore = useMessageStore();

const statusText = computed(() => {
    if (networkStore.isReconnecting) {
        return `正在重连... (${networkStore.reconnectAttempts}/5)`;
    }
    if (!networkStore.isOnline) {
        return `网络已断开 (${messageStore.getPendingMessages.length}条待发送)`;
    }
    return "网络已连接";
});

const statusIcon = computed(() => {
    if (networkStore.isReconnecting) {
        return "🔄";
    }
    if (!networkStore.isOnline) {
        return "⚠️";
    }
    return "✅";
});

const handleSimulateOffline = () => {
    networkStore.simulateOffline();
    setMockNetworkStatus(false);
};

const handleSimulateOnline = () => {
    // 先设置模拟网络状态为 true，再触发重连
    setMockNetworkStatus(true);
    networkStore.simulateOnline();
};
</script>

<style scoped>
.network-status {
    padding: 8px 16px;
    background-color: #f0f9ff;
    border-bottom: 1px solid #e0e0e0;
    transition: background-color 0.3s;
}

.network-status.offline {
    background-color: #fff7e6;
}

.network-status.reconnecting {
    background-color: #e6f7ff;
}

.status-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
}

.status-icon {
    font-size: 14px;
}

.status-text {
    flex: 1;
    color: #666;
}

.status-actions {
    display: flex;
    gap: 8px;
}

.action-button {
    padding: 4px 12px;
    font-size: 12px;
    color: #1890ff;
    background-color: #fff;
    border: 1px solid #1890ff;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.action-button:hover:not(:disabled) {
    background-color: #e6f7ff;
}

.action-button:disabled {
    color: #999;
    border-color: #d9d9d9;
    cursor: not-allowed;
    background-color: #f5f5f5;
}
</style>
