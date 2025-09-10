<script>
  import { setConsent } from '$lib/stores/session';
  export let onAgree = () => {};
  function agree() {
    setConsent(true);
    onAgree();
  }
</script>

<div class="p-4 border rounded bg-white">
  <p class="mb-4">Please provide your consent to continue.</p>
  <button class="px-4 py-2 bg-blue-500 text-white rounded" on:click={agree}>I Agree</button>
</div>
