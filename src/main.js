import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import naive from 'naive-ui'
import App from './App.vue'

// Views
import Kasir from './views/Kasir.vue'
import Produk from './views/Produk.vue'
import Laporan from './views/Laporan.vue'
import Pengaturan from './views/Pengaturan.vue'
import AdminUsers from './views/AdminUsers.vue'

const routes = [
  { path: '/', name: 'kasir', component: Kasir },
  { path: '/produk', name: 'produk', component: Produk },
  { path: '/laporan', name: 'laporan', component: Laporan },
  { path: '/pengaturan', name: 'pengaturan', component: Pengaturan },
  { path: '/users', name: 'users', component: AdminUsers }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(naive)
app.mount('#app')
