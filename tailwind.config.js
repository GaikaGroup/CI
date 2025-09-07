export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#e67e22',
        pagebg: '#f5f5f5'
      },
      borderRadius: {
        token: '12px'
      },
      boxShadow: {
        subtle: '0 2px 12px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: []
};
