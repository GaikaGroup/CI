import { get } from 'svelte/store';
import { subjectConfig, materialsLoaded } from '$lib/stores/subject-config';

export async function getMaterialContent(filename) {
  const config = get(subjectConfig);
  if (!config) throw new Error('No subject selected');
  const cache = get(materialsLoaded);
  if (cache[filename]) return cache[filename];
  const res = await fetch(`/tutor/${config.id}/materials/${filename}`);
  const text = await res.text();
  materialsLoaded.update((m) => ({ ...m, [filename]: text }));
  return text;
}
