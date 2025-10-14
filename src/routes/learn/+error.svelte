<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, BookOpen, RefreshCw, AlertTriangle, Search } from 'lucide-svelte';

	$: error = $page.error;
	$: status = $page.status;

	function handleGoToCourses() {
		goto('/my-courses');
	}

	function handleGoToCatalogue() {
		goto('/catalogue');
	}

	function handleRefresh() {
		if (typeof window !== 'undefined') {
			window.location.reload();
		}
	}

	// Get course-specific error information
	$: errorInfo = getCourseErrorInfo(status, error);

	function getCourseErrorInfo(status, error) {
		switch (status) {
			case 404:
				return {
					title: 'Course Not Found',
					message: error?.message || 'The course you are looking for does not exist.',
					details: error?.details || 'This course may have been removed, renamed, or you may not have access to it.',
					icon: Search,
					suggestions: [
						'Check if the course URL is correct',
						'The course may have been moved or deleted',
						'Browse available courses in the catalogue',
						'Check your enrolled courses'
					]
				};
			case 403:
				return {
					title: 'Course Access Denied',
					message: error?.message || 'You do not have access to this course.',
					details: error?.details || 'This course may require enrollment or special permissions.',
					icon: AlertTriangle,
					suggestions: [
						'Make sure you are enrolled in this course',
						'Check if the course is still active',
						'Contact an administrator if you believe you should have access',
						'Browse other available courses'
					]
				};
			default:
				return {
					title: 'Course Loading Error',
					message: error?.message || 'Unable to load the course.',
					details: error?.details || 'There was a problem loading the course content.',
					icon: AlertTriangle,
					suggestions: [
						'Try refreshing the page',
						'Check your internet connection',
						'Go back to your courses and try again',
						'Browse the course catalogue for alternatives'
					]
				};
		}
	}
</script>

<svelte:head>
	<title>Course Error {status} - Learn Mode</title>
	<meta name="description" content="Course loading error" />
</svelte:head>

<div class="min-h-screen bg-stone-50 dark:bg-gray-900">
	<!-- Header -->
	<div class="bg-white dark:bg-gray-800 border-b border-stone-200 dark:border-gray-700">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center gap-4">
				<button
					on:click={handleGoToCourses}
					class="flex items-center gap-2 text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
				>
					<ArrowLeft class="w-4 h-4" />
					<span class="hidden sm:inline">My Courses</span>
				</button>
				<div class="h-6 w-px bg-stone-300 dark:bg-gray-600"></div>
				<div>
					<h1 class="text-xl font-semibold text-stone-900 dark:text-white">
						Course Error
					</h1>
					<div class="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400">
						<AlertTriangle class="w-4 h-4" />
						<span>Error {status}</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Error Content -->
	<div class="container mx-auto px-4 py-12">
		<div class="max-w-2xl mx-auto">
			<!-- Error Icon and Status -->
			<div class="text-center mb-8">
				<div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
					<svelte:component this={errorInfo.icon} class="w-8 h-8 text-red-600 dark:text-red-400" />
				</div>
				<div class="text-4xl font-bold text-stone-300 dark:text-gray-600 mb-2">
					{status}
				</div>
			</div>

			<!-- Error Details -->
			<div class="bg-white dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700 p-8 mb-8">
				<h2 class="text-2xl font-bold text-stone-900 dark:text-white mb-4">
					{errorInfo.title}
				</h2>
				
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
						on:click={handleRefresh}
						class="inline-flex items-center px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-stone-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
					>
						<RefreshCw class="w-4 h-4 mr-2" />
						Try Again
					</button>

					<button
						on:click={handleGoToCourses}
						class="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
					>
						<BookOpen class="w-4 h-4 mr-2" />
						My Courses
					</button>

					<button
						on:click={handleGoToCatalogue}
						class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
					>
						<Search class="w-4 h-4 mr-2" />
						Browse Catalogue
					</button>
				</div>
			</div>

			<!-- Course Suggestions -->
			<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
				<h3 class="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-3">
					Looking for courses?
				</h3>
				<p class="text-amber-700 dark:text-amber-300 mb-4">
					Explore our course catalogue to find learning opportunities that match your interests.
				</p>
				<div class="flex gap-3">
					<button
						on:click={handleGoToCourses}
						class="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
					>
						<BookOpen class="w-4 h-4 mr-2" />
						View My Courses
					</button>
					<button
						on:click={handleGoToCatalogue}
						class="inline-flex items-center px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 font-medium rounded-lg transition-colors"
					>
						<Search class="w-4 h-4 mr-2" />
						Browse All Courses
					</button>
				</div>
			</div>
		</div>
	</div>
</div>