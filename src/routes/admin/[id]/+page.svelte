<script context="module">
  export async function load({ params, fetch }) {
    const subjectsRes = await fetch('/api/admin/subjects');
    const subjects = await subjectsRes.json();
    const subject = subjects.find((s) => s.id === params.id);
    const promptRes = await fetch(`/api/admin/subjects/${params.id}/prompt`);
    const prompt = await promptRes.text();
    return { subject, prompt };
  }
</script>

<script>
  export let data;
  let prompt = data.prompt;
  let files;
  async function savePrompt() {
    await fetch(`/api/admin/subjects/${data.subject.id}/prompt`, {
      method: 'PUT',
      body: prompt
    });
  }
  async function upload() {
    if (!files || !files.length) return;
    const form = new FormData();
    form.append('file', files[0]);
    await fetch(`/api/admin/subjects/${data.subject.id}/materials`, {
      method: 'POST',
      body: form
    });
    location.reload();
  }
  async function remove(name) {
    await fetch(`/api/admin/subjects/${data.subject.id}/materials/${name}`, {
      method: 'DELETE'
    });
    location.reload();
  }
</script>

<svelte:head><title>{data.subject.displayName}</title></svelte:head>
<h1>{data.subject.displayName}</h1>
<h2>Prompt</h2>
<textarea bind:value={prompt} rows="10" cols="80"></textarea>
<button on:click={savePrompt}>Save</button>

<h2>Materials</h2>
<ul>
  {#each data.subject.materials as m}
    <li>{m} <button on:click={() => remove(m)}>Delete</button></li>
  {/each}
</ul>
<input type="file" bind:files />
<button on:click={upload}>Upload</button>
