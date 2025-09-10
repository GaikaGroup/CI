<script>
  export let subject = '';
  let materials = [];

  async function load() {
    if (!subject) return;
    const res = await fetch(`/api/admin/materials?subject=${encodeURIComponent(subject)}`);
    if (res.ok) {
      materials = await res.json();
    }
  }

  $: (subject, load());

  async function remove(name) {
    await fetch('/api/admin/materials', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, name })
    });
    load();
  }
</script>

<div class="space-y-2">
  <h2 class="font-bold">Materials</h2>
  <ul class="list-disc pl-4">
    {#each materials as m}
      <li>{m} <button class="ml-2 border px-1" on:click={() => remove(m)}>Delete</button></li>
    {/each}
  </ul>
</div>
