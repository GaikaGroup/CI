import { writable, get } from 'svelte/store';

export const subjectConfig = writable(null);
export const materialsLoaded = writable({});

export async function loadSubjectConfig(subjectId) {
  const res = await fetch('/tutor/subjects.json');
  const subjects = await res.json();
  const info = subjects.find((s) => s.id === subjectId);
  if (!info) throw new Error('Subject not found');
  const [prompt, metadata] = await Promise.all([
    fetch(info.promptPath).then((r) => r.text()),
    info.metadataPath ? fetch(info.metadataPath).then((r) => r.json()) : Promise.resolve({})
  ]);
  subjectConfig.set({ id: subjectId, prompt, ...metadata });
  materialsLoaded.set({});
}

export async function loadMaterial(filename) {
  const config = get(subjectConfig);
  if (!config) throw new Error('Subject not loaded');
  const cache = get(materialsLoaded);
  if (cache[filename]) return cache[filename];
  const res = await fetch(`/tutor/${config.id}/materials/${filename}`);
  const text = await res.text();
  materialsLoaded.update((m) => ({ ...m, [filename]: text }));
  return text;
}
