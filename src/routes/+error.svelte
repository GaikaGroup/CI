<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Home, RefreshCw, AlertTriangle, BookOpen } from 'lucide-svelte';

	$: error = $page.error;
	$: status = $page.status;

	function handleGoHome() {
		goto('/');
	}

	function handleGoBack() {
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
		} else {
			goto('/');
		}
	}

	function handleRefresh() {
		if (typeof window !== 'undefined') {
			window.location.reload();
		}
	}

	function handleGoToCourses() {
		goto('/my-courses');
	}

	function handleGoToCatalogue() {
		goto('/catalogue');
	}

	// Get appropriate error message and suggestions based on status
	$: errorInfo = getErrorInfo(status, error);

	function getErrorInfo(status, error) {
		switch (status) {
			case 404:
				return {
					title: 'Page Not Found',
					message: error?.message || 'The page you are looking for does not exist.',
					details: error?.details || 'The URL may be incorrect or the content may have been moved.',
					suggestions: [
						'Check the URL for typos',
						'Go back to the previous page',
						'Visit the course catalogue',
						'Return to your courses'
					],
					showCourseActions: true
				};
			case 403:
				return {
					title: 'Access Denied',
					message: error?.message || 'You do not have permission to access this resource.',
					details: error?.details || 'This content may require special permissions or authentication.',
					suggestions: [
						'Make sure you are logged in',
						'Check if you have the required permissions',
						'Contact an administrator if you believe this is an error'
					],
					showCourseActions: false
				};
			case 500:
				return {
					title: 'Server Error',
					message: error?.message || 'An internal server error occurred.',
					details: error?.details || 'Something went wrong on our end. Please try again later.',
					suggestions: [
						'Try refreshing the page',
						'Wait a few minutes and try again',
						'Contact support if the problem persists'
					],
					showCourseActions: true
				};
			default:
				return {
					title: 'Something Went Wrong',
					message: error?.message || 'An unexpected error occurred.',
					details: error?.details || 'Please try again or contact support if the problem persists.',
					suggestions: [
						'Try refreshing the page',
						'Go back and try again',
						'Contact support if needed'
					],
					showCourseActions: true
				};
		}
	}
</script>

<svelte:head>
	<title>Error {status} - Learn Mode</title>
	<meta name="description" content="An error occurred while loading the page" />
</svelte:head>

<div class="min-h-screen bg-stone-50 dark:bg-gray-900 flex items-center justify-center px-4">
	<div class="max-w-2xl w-full">
		<!-- Error Icon and Status -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
				<AlertTriangle class="w-8 h-8 text-red-600 dark:text-red-400" />
			</div>
			<div class="text-6xl font-bold text-stone-300 dark:text-gray-600 mb-2">
				{status}
			</div>
		</div>

		<!-- Error Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700 p-8 mb-8">
			<h1 class="text-2xl font-bold text-stone-900 dark:text-white mb-4">
				{errorInfo.title}
			</h1>
			
			<p class="text-stone-700 dark:text-gray-300 mb-4">
				{errorInfo.message}
			</p>
			
			{#if errorInfo.details}
				<p class="text-sm text-stone-600 dark:text-gray-400 mb-6">
					{errorInfo.details}
				</p>
			{/if}

			<!-- Suggestions -->
			{#if errorInfo.suggestions.length > 0}
				<div class="mb-6">
					<h3 class="text-sm font-semibold text-stone-900 dark:text-white mb-3">
						What you can try:
					</h3>
					<ul class="space-y-2">
						{#each errorInfo.suggestions as suggestion}
							<li class="flex items-start gap-2 text-sm text-stone-600 dark:text-gray-400">
								<div class="w-1.5 h-1.5 bg-stone-400 dark:bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
								<span>{suggestion}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex flex-wrap gap-3">
				<button
					on:click={handleGoBack}
					class="inline-flex items-center px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
				>
					<ArrowLeft class="w-4 h-4 mr-2" />
					Go Back
				</button>

				<button
					on:click={handleRefresh}
					class="inline-flex items-center px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
				>
					<RefreshCw class="w-4 h-4 mr-2" />
					Refresh
				</button>

				<button
					on:click={handleGoHome}
					class="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
				>
					<Home class="w-4 h-4 mr-2" />
					Home
				</button>

				{#if errorInfo.showCourseActions}
					<button
						on:click={handleGoToCourses}
						class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
					>
						<BookOpen class="w-4 h-4 mr-2" />
						My Courses
					</button>

					<button
						on:click={handleGoToCatalogue}
						class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
					>
						<BookOpen class="w-4 h-4 mr-2" />
						Browse Catalogue
					</button>
				{/if}
			</div>
		</div>

		<!-- Additional Help -->
		<div class="text-center text-sm text-stone-500 dark:text-gray-400">
			<p>
				If you continue to experience issues, please 
				<a href="mailto:support@example.com" class="text-amber-600 dark:text-amber-400 hover:underline">
					contact support
				</a>
			</p>
		</div>
	</div>
</div>