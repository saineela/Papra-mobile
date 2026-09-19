import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/connect',
      name: 'connect',
      component: () => import('@/pages/ConnectPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/pages/DashboardPage.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/pages/SearchPage.vue'),
    },
    {
      path: '/documents/:id',
      name: 'document',
      component: () => import('@/pages/DocumentDetailPage.vue'),
    },
    {
      path: '/documents/:id/markup',
      name: 'markup-sign',
      component: () => import('@/pages/MarkupSignPage.vue'),
      meta: { public: false },
    },
    {
      path: '/ready',
      name: 'ready',
      component: () => import('@/pages/ReadyPage.vue'),
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('@/pages/UploadPage.vue'),
    },
    {
      path: '/scan',
      name: 'scan',
      component: () => import('@/pages/ScanPage.vue'),
    },
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/pages/TagsPage.vue'),
    },
    {
      path: '/trash',
      name: 'trash',
      component: () => import('@/pages/TrashPage.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})
