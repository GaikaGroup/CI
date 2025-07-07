import adapter from '@sveltejs/adapter-auto';

const config = {
  kit: {
    adapter: adapter(),
    alias: {
      '$modules': 'src/lib/modules',
      '$shared': 'src/lib/shared'
    }
  }
};

export default config;