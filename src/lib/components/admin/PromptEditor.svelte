<script>
  export let subject = '';
  let prompt = '';

  async function load() {
    if (!subject) return;
    const res = await fetch(`/api/admin/prompt?subject=${encodeURIComponent(subject)}`);
    if (res.ok) {
      const data = await res.json();
      prompt = data.prompt || '';
    }
  }

  $: (subject, load());

  async function save() {
    await fetch('/api/admin/prompt', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, prompt })
    });
  }
</script>

<div class="space-y-2">
  <h2 class="font-bold">Prompt Editor</h2>
  <textarea class="w-full border p-2" rows="5" bind:value={prompt}></textarea>
  <button class="border px-2" on:click={save}>Save</button>
</div>
