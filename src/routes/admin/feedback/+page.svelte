<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user, checkAuth } from '$lib/modules/auth/stores.js';
	import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';
	import { ThumbsDown, Filter, ArrowLeft } from 'lucide-svelte';

	let feedback = [];
	let loading = true;
	let error = null;
	let pagination = {
		page: 1,
		totalPages: 1,
		totalCount: 0,
		limit: 50
	};

	// Filters
	let filters = {
		model: '',
		dateFrom: '',
		dateTo: ''
	};

	$: hasAdminAccess = $user && isAdmin($user);

	onMount(async () => {
		await checkAuth();
		if (!$user || !isAdmin($user)) {
			goto('/login');
			return;
		}
		await loadFeedback();
	});

	async function loadFeedback() {
		try {
			loading = true;
			error = null;

			const params = new URLSearchParams({
				page: pagination.page.toString(),
				limit: pagination.limit.toString()
			});

			if (filters.model) params.append('model', filters.model);
			if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
			if (filters.dateTo) params.append('dateTo', filters.dateTo);

			const response = await fetch(`/api/admin/feedback?${params}`);

			if (!response.ok) {
				throw new Error('Failed to load feedback');
			}

			const data = await response.json();
			feedback = data.feedback || [];
			pagination = data.pagination || pagination;
		} catch (err) {
			error = err.message;
			console.error('Error loading feedback:', err);
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		pagination.page = 1;
		loadFeedback();
	}

	function clearFilters() {
		filters = {
			model: '',
			dateFrom: '',
			dateTo: ''
		};
		applyFilters();
	}

	function changePage(newPage) {
		pagination.page = newPage;
		loadFeedback();
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleString();
	}

	function goToSession(sessionId) {
		goto(`/admin/sessions/${sessionId}`);
	}

	function goBack() {
		goto('/stats');
	}
</script>

<svelte:head>
	<title>Admin - User Feedback</title>
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
					Back to Stats
				</button>
			</div>

			<!-- Header -->
			<div class="mb-6">
				<h1 class="text-3xl font-bold text-gray-900">User Feedback</h1>
				<p class="mt-2 text-sm text-gray-600">
					Review user feedback on AI responses to improve model performance
				</p>
			</div>

			<!-- Filters -->
			<div class="bg-white shadow rounded-lg p-6 mb-6">
				<div class="flex items-center mb-4">
					<Filter class="w-5 h-5 text-gray-400 mr-2" />
					<h2 class="text-lg font-medium text-gray-900">Filters</h2>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label for="model" class="block text-sm font-medium text-gray-700 mb-1">
							Model
						</label>
						<input
							type="text"
							id="model"
							bind:value={filters.model}
							placeholder="e.g., gpt-4"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>

					<div>
						<label for="dateFrom" class="block text-sm font-medium text-gray-700 mb-1">
							From Date
						</label>
						<input
							type="date"
							id="dateFrom"
							bind:value={filters.dateFrom}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>

					<div>
						<label for="dateTo" class="block text-sm font-medium text-gray-700 mb-1">
							To Date
						</label>
						<input
							type="date"
							id="dateTo"
							bind:value={filters.dateTo}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>

					<div class="flex items-end space-x-2">
						<button
							on:click={applyFilters}
							class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							Apply
						</button>
						<button
							on:click={clearFilters}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
						>
							Clear
						</button>
					</div>
				</div>
			</div>

			<!-- Feedback List -->
			<div class="bg-white shadow rounded-lg p-6">
				{#if loading}
					<div class="text-center py-12">
						<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
						<p class="mt-2 text-gray-600">Loading feedback...</p>
					</div>
				{:else if error}
					<div class="bg-red-50 border border-red-200 rounded-md p-4">
						<p class="text-red-800">{error}</p>
					</div>
				{:else if feedback.length === 0}
					<div class="text-center py-12">
						<ThumbsDown class="w-12 h-12 text-gray-400 mx-auto mb-4" />
						<p class="text-gray-500">No feedback found</p>
						{#if filters.model || filters.dateFrom || filters.dateTo}
							<button on:click={clearFilters} class="mt-2 text-indigo-600 hover:text-indigo-500">
								Clear filters
							</button>
						{/if}
					</div>
				{:else}
					<div class="space-y-6">
						{#each feedback as item}
							<div class="border border-red-200 rounded-lg p-4 bg-red-50">
								<!-- Header -->
								<div class="flex items-start justify-between mb-3">
									<div class="flex items-center space-x-3">
										<ThumbsDown class="w-5 h-5 text-red-600" />
										<div>
											<p class="text-sm font-medium text-gray-900">
												{item.session?.user?.firstName}
												{item.session?.user?.lastName}
											</p>
											<p class="text-xs text-gray-500">{item.session?.user?.email}</p>
										</div>
									</div>
									<button
										on:click={() => goToSession(item.session?.id)}
										class="text-sm text-indigo-600 hover:text-indigo-500"
									>
										View Session →
									</button>
								</div>

								<!-- Message Content -->
								<div class="mb-3">
									<p class="text-sm font-medium text-gray-700 mb-1">AI Response:</p>
									<div class="bg-white rounded p-3 text-sm text-gray-900 max-h-32 overflow-y-auto">
										{item.content.substring(0, 300)}{item.content.length > 300 ? '...' : ''}
									</div>
								</div>

								<!-- Feedback -->
								<div class="mb-3">
									<p class="text-sm font-medium text-red-700 mb-1">User Feedback:</p>
									<div class="bg-white rounded p-3 text-sm text-red-900">
										{item.metadata?.feedback?.text}
									</div>
								</div>

								<!-- Model Info & Metadata -->
								<div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
									{#if item.metadata?.llm}
										<div>
											<span class="text-gray-500">Model:</span>
											<span class="ml-1 font-medium"
												>{item.metadata.llm.provider}/{item.metadata.llm.model}</span
											>
										</div>
									{/if}
									<div>
										<span class="text-gray-500">Session:</span>
										<span class="ml-1 font-medium">{item.session?.title?.substring(0, 30)}</span>
									</div>
									<div>
										<span class="text-gray-500">Submitted:</span>
										<span class="ml-1">{formatDate(item.metadata?.feedback?.timestamp)}</span>
									</div>
									<div>
										<span class="text-gray-500">Message Date:</span>
										<span class="ml-1">{formatDate(item.createdAt)}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Pagination -->
					{#if pagination.totalPages > 1}
						<div class="mt-6 flex items-center justify-between">
							<div class="text-sm text-gray-700">
								Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(
									pagination.page * pagination.limit,
									pagination.totalCount
								)} of {pagination.totalCount} results
							</div>
							<div class="flex space-x-2">
								<button
									on:click={() => changePage(pagination.page - 1)}
									disabled={pagination.page === 1}
									class="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
								>
									Previous
								</button>
								<button
									on:click={() => changePage(pagination.page + 1)}
									disabled={pagination.page === pagination.totalPages}
									class="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
								>
									Next
								</button>
							</div>
						</div>
					{/if}
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
