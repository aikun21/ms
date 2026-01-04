/// <reference types="vite/client" />

declare module '*.vue' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const component: any
    export default component
}

declare module 'vue-virtual-scroller' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const RecycleScroller: any
}

// Vue 3 编译器宏的类型声明
declare global {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defineProps: <T = any>() => T
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defineEmits: <T = any>() => T
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defineExpose: (exposed?: Record<string, any>) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withDefaults: <T, U extends Record<string, any>>(props: T, defaults: U) => T & U
}
