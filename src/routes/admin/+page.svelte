<script lang="ts">
  import { onMount } from 'svelte';
  import PromptEditor from '$lib/components/admin/PromptEditor.svelte';
  import MaterialUpload from '$lib/components/admin/MaterialUpload.svelte';
  import MaterialList from '$lib/components/admin/MaterialList.svelte';

  type Subject = { id: string; displayName: string };

  let username = '';
  let password = '';
  let error = '';
  let loggedIn = false;

  let subjects: Subject[] = [];
  let subject: string = '';

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
    subjects = [];
    subject = '';
  }

  async function loadSubjects() {
    const res = await fetch('/api/admin/subjects');
    if (res.ok) {
      const data: Subject[] = await res.json();
      subjects = data;
      subject = subjects[0]?.id ?? '';
      loggedIn = true; // if this worked, we have a valid session
      error = '';
    } else if (res.status === 401) {
      // not logged in
      loggedIn = false;
    } else {
      error = 'Failed to load subjects';
    }
  }

  onMount(() => {
    // Try to detect existing session and preload subjects
    loadSubjects();
  });
</script>

{#if loggedIn}
  <div class="p-4 space-y-4">
    <div class="flex items-center gap-3">
      <label class="mr-2" for="subject">Subject:</label>
      <select id="subject" bind:value={subject} class="border p-1">
        {#each subjects as s}
          <option value={s.id}>{s.displayName}</option>
        {/each}
      </select>
      <button class="ml-4 border px-2 py-1" on:click={logout}>Logout</button>
    </div>

    {#if subject}
      <PromptEditor {subject} />
      <MaterialUpload {subject} on:uploaded={loadSubjects} />
      <MaterialList {subject} />
    {:else}
      <p class="text-sm text-gray-600">No subjects available yet.</p>
    {/if}
  </div>
{:else}
  <form class="p-4 space-y-2 max-w-sm" on:submit|preventDefault={login}>
    <div>
      <input class="border p-1 w-full" placeholder="Username" bind:value={username} autocomplete="username" />
    </div>
    <div>
      <input type="password" class="border p-1 w-full" placeholder="Password" bind:value={password} autocomplete="current-password" />
    </div>
    {#if error}<p class="text-red-500 text-sm">{error}</p>{/if}
    <button class="border px-3 py-1" type="submit">Login</button>
  </form>
{/if}
