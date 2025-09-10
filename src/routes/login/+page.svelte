<script>
  import { goto } from '$app/navigation';
  import { login as loginService } from '$modules/auth/services';

  let email = '';
  let password = '';
  let error = '';

  async function submit() {
    const res = await loginService(email, password);
    if (res) {
      error = '';
      goto('/');
    } else {
      error = 'Invalid credentials';
    }
  }
</script>

<h1>Sign In</h1>
<form on:submit|preventDefault={submit}>
  <input type="email" placeholder="Email" bind:value={email} />
  <input type="password" placeholder="Password" bind:value={password} />
  <button type="submit">Sign In</button>
  {#if error}<p>{error}</p>{/if}
</form>
