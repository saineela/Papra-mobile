import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import { router } from './router'
import './assets/css/main.css'
import '@fontsource-variable/inter'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ui)

// On-device crash overlay: render any uncaught error on screen so failures are diagnosable
// without adb logcat (the WebView console is not accessible remotely).
function showCrashOverlay(error: unknown, info?: string) {
  const box = window.document.createElement('div')
  box.style.cssText = [
    'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483647',
    'background:#7f1d1d', 'color:#fff', 'padding:12px',
    'font:11px/1.45 ui-monospace,monospace', 'max-height:55dvh',
    'overflow:auto', 'white-space:pre-wrap', 'word-break:break-word',
  ].join(';')
  const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error)
  box.textContent = `⚠ ${info ?? 'uncaught error'}\n${detail}`
  window.document.body.appendChild(box)
}

app.config.errorHandler = (error, _instance, info) => {
  console.error('[papra] render error:', error, info)
  showCrashOverlay(error, info)
}
window.addEventListener('error', (event) => {
  showCrashOverlay(event.error ?? event.message, 'window.onerror')
})
window.addEventListener('unhandledrejection', (event) => {
  showCrashOverlay(event.reason, 'unhandled rejection')
})

app.mount('#app')
