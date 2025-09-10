<script>
  import { onMount } from 'svelte';
  let subjects = [];
  onMount(async () => {
    const res = await fetch('/api/admin/subjects');
    if (res.ok) subjects = await res.json();
  });
</script>

<h1>Subjects</h1>
<ul>
  {#each subjects as s}
    <li><a href={`/admin/${s.id}`}>{s.displayName}</a></li>
  {/each}
</ul>
