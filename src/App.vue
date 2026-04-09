<template>
  <n-config-provider :theme="theme" :locale="idID" :date-locale="dateIdID">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <div class="app-container">
            <Navbar />
            <main class="app-main">
              <router-view />
            </main>
          </div>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { darkTheme, idID, dateIdID } from 'naive-ui'
import { useSettingsStore } from './stores/settings'
import Navbar from './components/shared/Navbar.vue'

const settingsStore = useSettingsStore()
const theme = computed(() => settingsStore.darkMode ? darkTheme : null)

// Load settings on app start
settingsStore.loadSettings()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

#app {
  height: 100%;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-main {
  flex: 1;
  overflow: auto;
  background: #f5f5f5;
}

/* Big number styling for kasir */
.price-big {
  font-size: 48px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.price-huge {
  font-size: 72px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.kembalian-display {
  font-size: 80px;
  font-weight: 900;
  color: #18a058;
  font-variant-numeric: tabular-nums;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
