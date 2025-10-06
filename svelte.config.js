import adapter from '@sveltejs/adapter-node';

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