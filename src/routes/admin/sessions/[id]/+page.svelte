<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { user, checkAuth } from '$lib/modules/auth/stores.js';
	import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';
	import { ThumbsDown, ArrowLeft } from 'lucide-svelte';

	export let data;

	let sessionId = data.sessionId || $page.params.id;
	let session = null;
	let messages = [];
	let loading = true;
	let error = null;

	$: hasAdminAccess = $user && isAdmin($user);

	onMount(async () => {
		await checkAuth();
		if (!$user || !isAdmin($user)) {
			goto('/login');
			return;
		}
		await loadSession();
		await loadMessages();
	});

	async function loadSession() {
		try {
			const response = await fetch(`/api/sessions/${sessionId}`);
			if (!response.ok) {
				throw new Error('Failed to load session');
			}
			const data = await response.json();
			session = data;
		} catch (err) {
			error = err.message;
			console.error('Error loading session:', err);
		}
	}

	async function loadMessages() {
		try {
			loading = true;
			const response = await fetch(`/api/sessions/${sessionId}/messages?limit=200`);
			if (!response.ok) {
				throw new Error('Failed to load messages');
			}
			const data = await response.json();
			messages = data.messages || [];
		} catch (err) {
			error = err.message;
			console.error('Error loading messages:', err);
		} finally {
			loading = false;
		}
	}

	function hasFeedback(message) {
		return message.metadata?.feedback != null;
	}

	function getModelInfo(message) {
		return message.metadata?.llm || null;
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleString();
	}

	function goBack() {
		goto('/admin/sessions');
	}
</script>

<svelte:head>
	<title>Admin - Session Detail</title>
</svelte:head>

{#if hasAdminAccess}
	<div class="min-h-screen bg-gray-50 py-6">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Navigation -->
			<div class="mb-6">
				<button
					on:click={goBack}
					class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
				>
					<ArrowLeft class="w-4 h-4 mr-2" />
					Back to Sessions
				</button>
			</div>

			<!-- Session Info -->
			{#if session}
				<div class="bg-white shadow rounded-lg p-6 mb-6">
					<h1 class="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-500">Mode:</span>
							<span class="ml-2 font-medium">{session.mode}</span>
						</div>
						<div>
							<span class="text-gray-500">Language:</span>
							<span class="ml-2 font-medium">{session.language}</span>
						</div>
						<div>
							<span class="text-gray-500">Created:</span>
							<span class="ml-2">{formatDate(session.createdAt)}</span>
						</div>
						<div>
							<span class="text-gray-500">Messages:</span>
							<span class="ml-2">{session.messageCount}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Messages -->
			<div class="bg-white shadow rounded-lg p-6">
				<h2 class="text-xl font-bold text-gray-900 mb-4">Messages</h2>

				{#if loading}
					<div class="text-center py-8">
						<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
						<p class="mt-2 text-gray-600">Loading messages...</p>
					</div>
				{:else if error}
					<div class="bg-red-50 border border-red-200 rounded-md p-4">
						<p class="text-red-800">{error}</p>
					</div>
				{:else if messages.length === 0}
					<p class="text-gray-500 text-center py-8">No messages in this session</p>
				{:else}
					<div class="space-y-4">
						{#each messages as message}
							<div
								class="border rounded-lg p-4 {hasFeedback(message)
									? 'border-red-300 bg-red-50'
									: 'border-gray-200'}"
							>
								<!-- Message Header -->
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center space-x-2">
										<span
											class="px-2 py-1 text-xs font-medium rounded {message.type === 'user'
												? 'bg-blue-100 text-blue-800'
												: 'bg-green-100 text-green-800'}"
										>
											{message.type}
										</span>
										<span class="text-xs text-gray-500">{formatDate(message.createdAt)}</span>
									</div>

									{#if hasFeedback(message)}
										<div class="flex items-center text-red-600">
											<ThumbsDown class="w-4 h-4 mr-1" />
											<span class="text-xs font-medium">User Feedback</span>
										</div>
									{/if}
								</div>

								<!-- Message Content -->
								<div class="text-gray-900 mb-3 whitespace-pre-wrap">{message.content}</div>

								<!-- Feedback Section -->
								{#if hasFeedback(message)}
									<div class="mt-4 pt-4 border-t border-red-200">
										<h4 class="text-sm font-semibold text-red-900 mb-2">User Feedback:</h4>
										<p class="text-sm text-red-800 bg-white rounded p-3 mb-3">
											{message.metadata.feedback.text}
										</p>
										<p class="text-xs text-red-600">
											Submitted: {formatDate(message.metadata.feedback.timestamp)}
										</p>
									</div>
								{/if}

								<!-- Model Info (for assistant messages) -->
								{#if message.type === 'assistant' && getModelInfo(message)}
									{@const modelInfo = getModelInfo(message)}
									<div class="mt-4 pt-4 border-t border-gray-200">
										<h4 class="text-sm font-semibold text-gray-700 mb-2">Model Information:</h4>
										<div class="grid grid-cols-2 gap-2 text-xs">
											<div>
												<span class="text-gray-500">Provider:</span>
												<span class="ml-2 font-medium">{modelInfo.provider}</span>
											</div>
											<div>
												<span class="text-gray-500">Model:</span>
												<span class="ml-2 font-medium">{modelInfo.model}</span>
											</div>
											{#if modelInfo.version}
												<div>
													<span class="text-gray-500">Version:</span>
													<span class="ml-2">{modelInfo.version}</span>
												</div>
											{/if}
											<div>
												<span class="text-gray-500">Generated:</span>
												<span class="ml-2">{formatDate(modelInfo.timestamp)}</span>
											</div>
											{#if modelInfo.config?.temperature}
												<div>
													<span class="text-gray-500">Temperature:</span>
													<span class="ml-2">{modelInfo.config.temperature}</span>
												</div>
											{/if}
											{#if modelInfo.config?.maxTokens}
												<div>
													<span class="text-gray-500">Max Tokens:</span>
													<span class="ml-2">{modelInfo.config.maxTokens}</span>
												</div>
											{/if}
											{#if modelInfo.fallback}
												<div class="col-span-2">
													<span class="text-red-500">Fallback:</span>
													<span class="ml-2 text-red-600"
														>Attempted {modelInfo.fallback.attempted} - {modelInfo.fallback.reason}</span
													>
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="max-w-md w-full bg-white shadow rounded-lg p-6">
			<div class="text-center">
				<h2 class="text-lg font-medium text-gray-900">Access Denied</h2>
				<p class="mt-2 text-sm text-gray-600">You need admin privileges to access this page.</p>
			</div>
		</div>
	</div>
{/if}
