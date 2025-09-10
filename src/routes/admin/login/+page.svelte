<script>
  import { goto } from '$app/navigation';
  let username = '';
  let password = '';
  let error = '';
  async function submit() {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      goto('/admin');
    } else {
      error = 'Invalid credentials';
    }
  }
</script>

<h1>Admin Login</h1>
<form on:submit|preventDefault={submit}>
  <input bind:value={username} placeholder="Username" />
  <input bind:value={password} type="password" placeholder="Password" />
  <button type="submit">Login</button>
  {#if error}<p>{error}</p>{/if}
</form>
