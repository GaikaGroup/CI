<script>
  import { createEventDispatcher } from 'svelte';
  import CommandBadge from './CommandBadge.svelte';

  export let session;
  export let highlightedCommands = [];

  const dispatch = createEventDispatcher();

  $: primaryCommand = session.primaryCommand;
  $: secondaryCommands = session.commandTypes?.filter((cmd) => cmd !== primaryCommand) || [];
  $: formattedDate = new Date(session.updatedAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  $: formattedTime = new Date(session.updatedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  function handleClick() {
    dispatch('click', session);
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  function isHighlighted(commandType) {
    return highlightedCommands.includes(commandType);
  }
</script>

<article
  class="session-card"
  role="article"
  tabindex="0"
  aria-label="Session: {session.title}"
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  <!-- Mode Badge (top-right) -->
  <div class="mode-badge" class:fun={session.mode === 'fun'} class:learn={session.mode === 'learn'}>
    {session.mode}
  </div>

  <!-- Command Badges (top-left) -->
  {#if primaryCommand || secondaryCommands.length > 0}
    <div class="command-badges">
      {#if primaryCommand}
        <CommandBadge
          commandType={primaryCommand}
          size="primary"
          highlighted={isHighlighted(primaryCommand)}
        />
      {/if}
      {#each secondaryCommands.slice(0, 2) as commandType}
        <CommandBadge {commandType} size="secondary" highlighted={isHighlighted(commandType)} />
      {/each}
      {#if secondaryCommands.length > 2}
        <div class="more-badge">+{secondaryCommands.length - 2}</div>
      {/if}
    </div>
  {/if}

  <!-- Session Content -->
  <div class="session-content">
    <h3 class="session-title">{session.title}</h3>

    {#if session.preview}
      <p class="session-preview">{session.preview}</p>
    {/if}

    <div class="session-meta">
      <span class="session-date">
        {formattedDate}
        {formattedTime}
      </span>
      <span class="session-messages">{session.messageCount || 0} messages</span>
    </div>
  </div>
</article>

<style>
  .session-card {
    position: relative;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 160px;
    outline: none;
  }

  .session-card:hover {
    border-color: #ff9800;
    box-shadow: 0 4px 12px rgba(255, 152, 0, 0.15);
    transform: translateY(-2px) scale(1.02);
  }

  .session-card:focus-visible {
    border-color: #ff9800;
    box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.2);
  }

  .session-card:active {
    transform: translateY(0) scale(1);
  }

  /* Mode Badge */
  .mode-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mode-badge.fun {
    background: #e3f2fd;
    color: #1976d2;
  }

  .mode-badge.learn {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  /* Command Badges */
  .command-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-right: 60px; /* Space for mode badge */
  }

  .more-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 8px;
    border-radius: 12px;
    background: #f5f5f5;
    color: #666;
    font-size: 10px;
    font-weight: 600;
  }

  /* Session Content */
  .session-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .session-title {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.4;
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .session-preview {
    font-size: 14px;
    color: #666;
    line-height: 1.5;
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    flex: 1;
  }

  .session-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #999;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #f5f5f5;
  }

  .session-date {
    font-weight: 500;
  }

  .session-messages {
    font-weight: 500;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .session-card {
      padding: 16px;
      min-height: 140px;
    }

    .command-badges {
      margin-right: 50px;
    }

    .session-title {
      font-size: 15px;
    }

    .session-preview {
      font-size: 13px;
      -webkit-line-clamp: 2;
    }
  }
</style>
