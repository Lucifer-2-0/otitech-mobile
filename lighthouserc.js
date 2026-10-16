module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npx http-server . -p 4173 -c-1',
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/pages/services.html',
        'http://localhost:4173/pages/properties.html',
        'http://localhost:4173/pages/projects.html',
        'http://localhost:4173/pages/about.html',
        'http://localhost:4173/pages/contact.html',
      ],
      settings: {
        headless: true,
        preset: 'desktop',
        staticDistDir: './',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      command: 'npx lhci-server',
      port: 9001,
    },
  },
};