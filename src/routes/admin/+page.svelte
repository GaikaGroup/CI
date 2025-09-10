<script>
  import PromptEditor from '$lib/components/admin/PromptEditor.svelte';
  import MaterialUpload from '$lib/components/admin/MaterialUpload.svelte';
  import MaterialList from '$lib/components/admin/MaterialList.svelte';

  let username = '';
  let password = '';
  let error = '';
  let loggedIn = false;
  let subjects = [];
  let subject = '';

  async function login() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      loggedIn = true;
      error = '';
      await loadSubjects();
    } else {
      error = 'Invalid credentials';
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    loggedIn = false;
    username = '';
    password = '';
  }

  async function loadSubjects() {
    const res = await fetch('/api/admin/subjects');
    if (res.ok) {
      subjects = await res.json();
      subject = subjects[0] || '';
    }
  }
</script>

{#if loggedIn}
  <div class="p-4 space-y-4">
    <div>
      <label class="mr-2" for="subject">Subject:</label>
      <select id="subject" bind:value={subject} class="border p-1">
        {#each subjects as s}
          <option value={s}>{s}</option>
        {/each}
      </select>
      <button class="ml-4 border px-2" on:click={logout}>Logout</button>
    </div>
    <PromptEditor {subject} />
    <MaterialUpload {subject} on:uploaded={loadSubjects} />
    <MaterialList {subject} />
  </div>
{:else}
  <form class="p-4 space-y-2" on:submit|preventDefault={login}>
    <div>
      <input class="border p-1" placeholder="Username" bind:value={username} />
    </div>
    <div>
      <input type="password" class="border p-1" placeholder="Password" bind:value={password} />
    </div>
    {#if error}<p class="text-red-500">{error}</p>{/if}
    <button class="border px-2 py-1" type="submit">Login</button>
  </form>
{/if}
