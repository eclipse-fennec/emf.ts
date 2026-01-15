import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'EMFTS',
  description: 'TypeScript interfaces for Eclipse EMF Core',
  themeConfig: {
    nav: [
      { text: 'Examples', link: '/examples/' }
    ],
    sidebar: {
      '/examples/': [
        {
          text: 'Notification System',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Notifications', link: '/examples/notifications' },
            { text: 'Adapters', link: '/examples/adapters' },
            { text: 'EContentAdapter', link: '/examples/content-adapter' }
          ]
        }
      ]
    }
  }
})
