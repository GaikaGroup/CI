<script>
  import { language, setSessionLanguage } from '$lib/stores/session';
  const options = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'ru', label: 'Russian' }
  ];
  function change(e) {
    setSessionLanguage(e.target.value);
  }
</script>

<select class="p-2 border rounded" on:change={change} bind:value={$language}>
  {#each options as opt}
    <option value={opt.value}>{opt.label}</option>
  {/each}
</select>
