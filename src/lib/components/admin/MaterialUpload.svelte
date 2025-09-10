<script>
  export let subject = '';
  let file;

  async function upload() {
    if (!file || !subject) return;
    const form = new FormData();
    form.append('subject', subject);
    form.append('file', file);
    const res = await fetch('/api/admin/materials', {
      method: 'POST',
      body: form
    });
    if (res.ok) {
      file = null;
      dispatch('uploaded');
    }
  }

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<div class="space-y-2">
  <h2 class="font-bold">Upload Material</h2>
  <input type="file" on:change={(e) => (file = e.target.files[0])} />
  <button class="border px-2" on:click={upload}>Upload</button>
</div>
