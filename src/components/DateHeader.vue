<template>
  <div class="date-header" :class="{ sticky: isSticky }">
    <div class="date-line"></div>
    <span class="date-text">{{ dateText }}</span>
    <div class="date-line"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  date: string; // 日期字符串，格式：YYYY-MM-DD
  isSticky?: boolean; // 是否处于粘性状态
}

const props = withDefaults(defineProps<Props>(), {
  isSticky: false,
});

/**
 * 格式化日期显示文本
 */
const dateText = computed(() => {
  const date = new Date(props.date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 重置时间部分，只比较日期
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "今天";
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "昨天";
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const weekday = weekdays[date.getDay()];
    return `${date.getFullYear()}年${month}月${day}日 星期${weekday}`;
  }
});
</script>

<style scoped>
.date-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #fafafa;
  position: sticky;
  top: 0;
  z-index: 10;
  height: 44px;
  box-sizing: border-box;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.date-header.sticky {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.date-line {
  flex: 1;
  height: 1px;
  background-color: #e0e0e0;
}

.date-text {
  padding: 0 12px;
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
</style>

