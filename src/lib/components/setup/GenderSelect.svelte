<script>
  import { setGender } from '$lib/stores/session';
  function choose(g) {
    setGender(g);
  }
</script>

<div class="p-4 border rounded bg-white">
  <p class="mb-2">Select your gender</p>
  <div class="space-x-2">
    <button class="px-3 py-1 bg-amber-500 text-white rounded" on:click={() => choose('male')}
      >Male</button
    >
    <button class="px-3 py-1 bg-amber-500 text-white rounded" on:click={() => choose('female')}
      >Female</button
    >
  </div>
</div>
