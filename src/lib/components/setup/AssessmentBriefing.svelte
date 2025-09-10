<script>
  export let onContinue = () => {};
</script>

<div class="p-4 border rounded bg-white">
  <p class="mb-4">Before starting the assessment, please read the instructions carefully.</p>
  <button class="px-4 py-2 bg-green-600 text-white rounded" on:click={onContinue}>Continue</button>
</div>
