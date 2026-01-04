<template>
  <div class="message-list-container" ref="containerRef">
    <div v-if="messageStore.isLoadingHistory" class="loading-indicator">
      正在加载历史消息...
    </div>
    <div v-else-if="messageStore.loadHistoryError" class="error-indicator">
      <span>{{ messageStore.loadHistoryError }}</span>
      <button @click="handleRetryLoadHistory" class="retry-load-button">
        重试
      </button>
    </div>
    <div v-else-if="!messageStore.hasMoreHistory" class="no-more-indicator">
      没有更多历史消息了
    </div>
    <!-- 粘性日期标题 -->
    <div v-if="stickyDate" class="sticky-date-header">
      <DateHeader :date="stickyDate" :is-sticky="true" />
    </div>
    <RecycleScroller ref="scrollerRef" class="scroller" :items="listItems" :item-size="ITEM_HEIGHT" key-field="id">
      <template #default="{ item }">
        <DateHeader v-if="item.type === 'date'" :date="item.data.date" />
        <MessageItem v-else-if="item.type === 'message'" :message="item.data" @retry="handleRetry" />
      </template>
    </RecycleScroller>
    <!-- 未读消息提示 -->
    <UnreadIndicator
      :unread-count="unreadCount"
      :show="showUnreadIndicator"
      @scroll-to-bottom="handleScrollToBottom"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from "vue";
import { RecycleScroller } from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import { useMessageStore } from "@/store/messageStore";
import { MESSAGE_ITEM_HEIGHT, DATE_HEADER_HEIGHT } from "@/config";
import MessageItem from "./MessageItem.vue";
import DateHeader from "./DateHeader.vue";
import UnreadIndicator from "./UnreadIndicator.vue";
import type { ListItem } from "@/types/message";

const messageStore = useMessageStore();
const scrollerRef = ref<any>(null);

// 使用统一的高度（取较大值）
const ITEM_HEIGHT = Math.max(MESSAGE_ITEM_HEIGHT, DATE_HEADER_HEIGHT);

const messages = computed(() => {
  // 如果有搜索或过滤条件，返回过滤后的消息，否则返回所有消息
  return messageStore.searchFilter.keyword || messageStore.searchFilter.sender
    ? messageStore.filteredMessages
    : messageStore.messages;
});

/**
 * 获取消息的日期字符串（YYYY-MM-DD）
 */
const getDateString = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 将消息列表转换为包含日期标题的列表项
 */
const listItems = computed<ListItem[]>(() => {
  const items: ListItem[] = [];
  let lastDate: string | null = null;

  for (const message of messages.value) {
    const messageDate = getDateString(message.timestamp);

    // 如果日期变化，插入日期标题
    if (messageDate !== lastDate) {
      items.push({
        type: 'date',
        data: {
          date: messageDate
        },
        id: `date-${messageDate}`
      });
      lastDate = messageDate;
    }

    // 添加消息项
    items.push({
      type: 'message',
      data: message,
      id: message.id
    });
  }

  return items;
});

/**
 * 当前滚动位置，用于响应式更新
 */
const currentScrollTop = ref(0);

/**
 * 当前应该显示的粘性日期标题
 */
const stickyDate = ref<string | null>(null);

/**
 * 更新粘性日期标题
 * 根据当前滚动位置，找到应该显示在顶部的日期标题
 */
const updateStickyDate = () => {
  if (!scrollElement || listItems.value.length === 0) {
    stickyDate.value = null;
    return;
  }

  const scrollTop = scrollElement.scrollTop;

  // 如果滚动到顶部，不显示粘性标题
  if (scrollTop <= 0) {
    stickyDate.value = null;
    return;
  }

  // 计算当前可见区域的第一个项的索引
  const firstVisibleIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT));

  // 从第一个可见项往前查找，找到最近的日期标题
  let foundDate: string | null = null;
  let foundDateIndex = -1;

  for (let i = firstVisibleIndex; i >= 0; i--) {
    const item = listItems.value[i];
    if (item && item.type === 'date') {
      foundDate = item.data.date;
      foundDateIndex = i;
      break;
    }
  }

  // 如果找到了日期标题，检查它是否还在可见区域
  if (foundDate && foundDateIndex >= 0) {
    const dateHeaderTop = foundDateIndex * ITEM_HEIGHT;
    const dateHeaderBottom = dateHeaderTop + DATE_HEADER_HEIGHT;

    // 如果日期标题还在可见区域内，不显示粘性标题（因为原标题还在）
    if (scrollTop < dateHeaderBottom) {
      stickyDate.value = null;
      return;
    }
  }

  // 如果没有找到，尝试使用第一个日期标题
  if (!foundDate && listItems.value.length > 0) {
    const firstDateItem = listItems.value.find(item => item.type === 'date');
    if (firstDateItem) {
      foundDate = firstDateItem.data.date;
    }
  }

  stickyDate.value = foundDate;
};

// 加载状态标记
let isLoadingMore = false;
let scrollElement: HTMLElement | null = null;
let isInitialized = false; // 标记是否已初始化
let isScrollingToBottom = false; // 标记是否正在滚动到底部（初始化时）

const handleRetry = (id: string) => {
  messageStore.retryMessage(id);
};

/**
 * 恢复滚动位置（通用方法）
 * 在加载历史消息后，恢复滚动位置并更新虚拟滚动组件
 * @param firstMessageId 加载前第一条消息的ID
 */
const restoreScrollPosition = (firstMessageId: string) => {
  if (!scrollElement || !scrollerRef.value || !firstMessageId) {
    return;
  }

  // 等待DOM更新后，恢复滚动位置
  nextTick().then(() => {
    // 找到之前第一条消息在列表项中的位置
    const newFirstItemIndex = listItems.value.findIndex(
      (item) => item.type === 'message' && item.data.id === firstMessageId
    );

    if (newFirstItemIndex === -1) {
      return;
    }

    // 使用双重 requestAnimationFrame 确保虚拟滚动组件完成渲染
    requestAnimationFrame(() => {
      if (!scrollElement || !scrollerRef.value) {
        return;
      }

      // 计算新的滚动位置（滚动到之前第一条消息的位置）
      const newScrollTop = newFirstItemIndex * ITEM_HEIGHT;

      // 先调用虚拟滚动组件的更新方法，确保组件知道新的数据
      // 尝试调用 scrollToItem 方法（如果存在）
      if (typeof scrollerRef.value.scrollToItem === 'function') {
        scrollerRef.value.scrollToItem(newFirstItemIndex);
      }

      // 设置滚动位置
      scrollElement.scrollTop = newScrollTop;
      currentScrollTop.value = newScrollTop;

      // 触发滚动事件，让虚拟滚动组件更新可见项
      scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));

      // 再次等待一帧，确保更新完成
      requestAnimationFrame(() => {
        if (!scrollElement || !scrollerRef.value) {
          return;
        }

        // 如果组件有 updateVisibleItems 方法，调用它
        if (typeof scrollerRef.value.updateVisibleItems === 'function') {
          scrollerRef.value.updateVisibleItems();
        }

        // 验证并修正滚动位置
        const actualScrollTop = scrollElement.scrollTop;
        const expectedScrollTop = newFirstItemIndex * ITEM_HEIGHT;
        if (Math.abs(actualScrollTop - expectedScrollTop) > 5) {
          scrollElement.scrollTop = expectedScrollTop;
          currentScrollTop.value = expectedScrollTop;
          // 再次触发滚动事件
          scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
        }
      });
    });
  });
};

/**
 * 重试加载历史消息
 */
const handleRetryLoadHistory = async () => {
  if (!scrollElement) return;

  // 清除错误信息
  messageStore.clearLoadHistoryError();

  // 记录第一条消息的ID，用于恢复滚动位置
  const firstMessage = messages.value[0];
  const firstMessageId = firstMessage?.id;

  // 重新加载历史消息
  const success = await messageStore.loadMoreHistory();

  if (success && firstMessageId) {
    // 使用通用方法恢复滚动位置
    restoreScrollPosition(firstMessageId);
  }
};

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  if (!scrollElement || !scrollerRef.value) return;

  // 使用 requestAnimationFrame 确保 DOM 完全渲染
  requestAnimationFrame(() => {
    if (!scrollElement || !scrollerRef.value) return;

    // 强制更新虚拟滚动组件
    if (typeof scrollerRef.value.updateVisibleItems === 'function') {
      scrollerRef.value.updateVisibleItems();
    }

    // 滚动到底部
    scrollElement.scrollTop = scrollElement.scrollHeight;

    // 如果组件有 scrollToItem 方法，滚动到最后一项
    const lastIndex = listItems.value.length - 1;
    if (lastIndex >= 0 && typeof scrollerRef.value.scrollToItem === 'function') {
      scrollerRef.value.scrollToItem(lastIndex);
    }

    // 触发滚动事件，让虚拟滚动组件更新可见项
    scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));

    // 再次等待一帧，确保更新完成
    requestAnimationFrame(() => {
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
        currentScrollTop.value = scrollElement.scrollTop;
        // 滚动到底部后，更新已读状态
        checkIsAtBottom();
      }
    });
  });
};

/**
 * 处理未读提示的跳转到底部
 */
const handleScrollToBottom = () => {
  scrollToBottom();
};

/**
 * 检查是否在底部
 */
const checkIsAtBottom = () => {
  if (!scrollElement) {
    isAtBottom.value = true;
    return;
  }

  const scrollTop = scrollElement.scrollTop;
  const scrollHeight = scrollElement.scrollHeight;
  const clientHeight = scrollElement.clientHeight;

  // 距离底部小于50px认为在底部
  const threshold = 50;
  const isBottom = scrollHeight - scrollTop - clientHeight < threshold;

  isAtBottom.value = isBottom;

  // 如果在底部，更新最后已读消息ID并清除未读计数
  if (isBottom && messages.value.length > 0) {
    const lastMessage = messages.value[messages.value.length - 1];
    if (lastMessage) {
      lastReadMessageId = lastMessage.id;
      unreadCount.value = 0;
    }
  }
};

/**
 * 更新未读消息数量
 */
const updateUnreadCount = () => {
  if (!messages.value.length || isAtBottom.value) {
    unreadCount.value = 0;
    return;
  }

  // 如果还没有记录已读消息ID，说明是初始化，不算未读
  if (!lastReadMessageId) {
    const lastMessage = messages.value[messages.value.length - 1];
    if (lastMessage) {
      lastReadMessageId = lastMessage.id;
    }
    unreadCount.value = 0;
    return;
  }

  // 计算从最后已读消息之后的新消息数量
  const lastReadIndex = messages.value.findIndex(
    (msg) => msg.id === lastReadMessageId
  );

  if (lastReadIndex === -1) {
    // 如果找不到已读消息，说明消息列表发生了变化，重置
    const lastMessage = messages.value[messages.value.length - 1];
    if (lastMessage) {
      lastReadMessageId = lastMessage.id;
    }
    unreadCount.value = 0;
    return;
  }

  // 计算未读消息数量
  unreadCount.value = Math.max(0, messages.value.length - lastReadIndex - 1);
};

/**
 * 处理滚动事件
 * 当滚动到顶部附近时，加载更多历史消息
 */
const handleScroll = async () => {
  if (!scrollElement) return;

  // 更新当前滚动位置（用于粘性标题）
  currentScrollTop.value = scrollElement.scrollTop;

  // 检查是否在底部
  checkIsAtBottom();

  // 更新粘性日期标题
  updateStickyDate();

  // 如果正在加载或没有更多消息，直接返回
  // 或者正在初始化滚动到底部，也不触发加载
  // 或者正在搜索/过滤，也不触发加载
  if (
    isLoadingMore ||
    !messageStore.hasMoreHistory ||
    messageStore.isLoadingHistory ||
    isScrollingToBottom ||
    messageStore.searchFilter.keyword ||
    messageStore.searchFilter.sender
  ) {
    return;
  }

  const scrollTop = scrollElement.scrollTop;

  // 当滚动到顶部附近（距离顶部小于100px）时，触发加载
  if (scrollTop < 100) {
    isLoadingMore = true;

    // 记录当前第一条消息的ID，用于恢复滚动位置
    const firstMessage = messages.value[0];
    const firstMessageId = firstMessage?.id;

    // 加载更多历史消息
    const success = await messageStore.loadMoreHistory();

    if (success && firstMessageId) {
      // 使用通用方法恢复滚动位置
      restoreScrollPosition(firstMessageId);
    }

    isLoadingMore = false;
  }
};

onMounted(() => {
  // 初始化历史消息
  messageStore.initMessages();

  // 等待DOM渲染完成后，获取滚动容器元素
  nextTick(() => {
    if (scrollerRef.value) {
      // 尝试获取滚动容器元素
      scrollElement =
        scrollerRef.value.$el?.querySelector(".vue-recycle-scroller") ||
        scrollerRef.value.$el ||
        null;

      if (scrollElement) {
        scrollElement.addEventListener("scroll", handleScroll);
        // 初始化粘性日期标题
        updateStickyDate();
        // 初始化时检查是否在底部
        checkIsAtBottom();
      }
    }
  });
});

// 记录最后一条消息的ID，用于判断是否是新消息
let lastMessageId: string | null = null;

// 记录最后一条已读消息的ID（用户滚动到底部时更新）
let lastReadMessageId: string | null = null;

// 是否在底部（距离底部小于50px认为在底部）
const isAtBottom = ref(true);

// 未读消息数量
const unreadCount = ref(0);

// 是否显示未读提示
const showUnreadIndicator = computed(() => {
  return !isAtBottom.value && unreadCount.value > 0;
});

// 监听消息列表变化，初始化完成后滚动到底部，发送新消息时也滚动到底部
watch(
  () => {
    // 同时监听消息数量和最后一条消息的ID，确保能检测到新消息
    const msgs = messages.value;
    return {
      length: msgs.length,
      lastId: msgs.length > 0 ? msgs[msgs.length - 1]?.id : null
    };
  },
  (newVal, oldVal) => {
    const newLength = newVal.length;
    const oldLength = oldVal?.length || 0;
    const newLastId = newVal.lastId;
    const oldLastId = oldVal?.lastId || null;

    // 初始化时滚动到底部
    if (newLength > 0 && !isInitialized && oldLength === 0) {
      isInitialized = true;
      isScrollingToBottom = true;
      lastMessageId = newLastId;
      // 初始化时，设置最后已读消息ID
      if (newLastId) {
        lastReadMessageId = newLastId;
      }
      // 等待多个 tick 确保虚拟滚动组件完全渲染
      nextTick(() => {
        nextTick(() => {
          scrollToBottom();
          // 滚动完成后，延迟一下再允许加载历史消息
          setTimeout(() => {
            isScrollingToBottom = false;
          }, 500);
        });
      });
      return;
    }

    // 如果消息数量增加
    if (newLength > oldLength) {
      // 判断是新消息添加到末尾（发送消息）还是历史消息添加到开头
      // 如果最后一条消息的ID变化了，说明是发送了新消息
      if (newLastId && newLastId !== oldLastId) {
        // 发送新消息
        isScrollingToBottom = true;
        lastMessageId = newLastId;

        // 更新未读消息数量（如果用户不在底部）
        updateUnreadCount();

        // 如果用户在底部，自动滚动到底部
        if (isAtBottom.value) {
          // 立即强制更新虚拟滚动组件
          nextTick(() => {
            if (scrollerRef.value) {
              // 强制更新虚拟滚动组件
              if (typeof scrollerRef.value.updateVisibleItems === 'function') {
                scrollerRef.value.updateVisibleItems();
              }
              // 触发一次更新
              if (scrollerRef.value.$forceUpdate) {
                scrollerRef.value.$forceUpdate();
              }
            }

            // 等待DOM更新后滚动到底部
            nextTick(() => {
              scrollToBottom();
              setTimeout(() => {
                isScrollingToBottom = false;
              }, 300);
            });
          });
        } else {
          // 用户不在底部，不自动滚动，只更新未读计数
          isScrollingToBottom = false;
        }
      } else {
        // 历史消息添加到开头，不滚动到底部
        // 更新最后一条消息ID（如果列表不为空）
        if (newLength > 0) {
          lastMessageId = newLastId;
        }
      }
    } else {
      // 消息数量没有增加，更新记录
      if (newLength > 0) {
        lastMessageId = newLastId;
      }
    }
  },
  { immediate: true }
);

// 监听列表项变化，更新粘性日期标题
watch(
  () => listItems.value.length,
  () => {
    nextTick(() => {
      updateStickyDate();
    });
  }
);

// 监听消息列表变化，更新未读消息数量
watch(
  () => messages.value,
  () => {
    updateUnreadCount();
  },
  { deep: true }
);

// 监听是否在底部的状态，更新未读消息数量
watch(
  isAtBottom,
  () => {
    updateUnreadCount();
  }
);

/**
 * 强制更新虚拟滚动组件
 */
const forceUpdateScroller = () => {
  if (!scrollerRef.value || !scrollElement) return;

  nextTick(() => {
    if (!scrollerRef.value || !scrollElement) return;

    // 强制更新虚拟滚动组件
    if (typeof scrollerRef.value.updateVisibleItems === 'function') {
      scrollerRef.value.updateVisibleItems();
    }
    // 触发一次更新
    if (scrollerRef.value.$forceUpdate) {
      scrollerRef.value.$forceUpdate();
    }

    // 触发滚动事件，让虚拟滚动组件更新可见项
    scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));

    // 再次等待一帧，确保更新完成
    requestAnimationFrame(() => {
      if (scrollerRef.value && typeof scrollerRef.value.updateVisibleItems === 'function') {
        scrollerRef.value.updateVisibleItems();
      }
    });
  });
};

// 监听搜索条件变化，强制更新虚拟滚动组件
watch(
  () => ({
    keyword: messageStore.searchFilter.keyword,
    sender: messageStore.searchFilter.sender
  }),
  (newFilter, oldFilter) => {
    const hasSearch = !!(newFilter.keyword || newFilter.sender);
    const hadSearch = !!(oldFilter?.keyword || oldFilter?.sender);

    // 如果搜索状态发生变化（从有搜索到无搜索，或从无搜索到有搜索）
    if (hasSearch !== hadSearch || hasSearch) {
      // 强制更新虚拟滚动组件
      forceUpdateScroller();

      // 如果有搜索条件，滚动到顶部显示第一个匹配项
      if (hasSearch && messages.value.length > 0) {
        nextTick(() => {
          if (scrollElement && scrollerRef.value) {
            // 滚动到第一个匹配项
            if (typeof scrollerRef.value.scrollToItem === 'function') {
              scrollerRef.value.scrollToItem(0);
            }
            scrollElement.scrollTop = 0;
            scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
            updateStickyDate();
          }
        });
      } else if (!hasSearch && hadSearch) {
        // 清除搜索后，滚动到底部
        // 设置标志，防止滚动事件触发加载历史消息
        isScrollingToBottom = true;
        nextTick(() => {
          scrollToBottom();
          // 强制更新虚拟滚动组件
          forceUpdateScroller();
          updateStickyDate();
          // 延迟清除标志，确保滚动完成
          setTimeout(() => {
            isScrollingToBottom = false;
          }, 500);
        });
      }
    }
  },
  { deep: true }
);

onUnmounted(() => {
  // 清理滚动事件监听
  if (scrollElement) {
    scrollElement.removeEventListener("scroll", handleScroll);
  }
});
</script>

<style scoped>
.message-list-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.sticky-date-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  pointer-events: none;
}

.scroller {
  height: 100%;
}

.loading-indicator,
.no-more-indicator,
.error-indicator {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
}

.no-more-indicator {
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.error-indicator {
  background-color: rgba(255, 77, 79, 0.9);
  pointer-events: auto;
}

.retry-load-button {
  padding: 4px 12px;
  font-size: 12px;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-load-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.retry-load-button:active {
  background-color: rgba(255, 255, 255, 0.15);
}
</style>
