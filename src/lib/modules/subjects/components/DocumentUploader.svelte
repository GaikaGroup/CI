<script>
  import { createEventDispatcher } from 'svelte';
  import Button from '$shared/components/Button.svelte';
  import { Upload, File, FileText, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-svelte';

  export let materials = [];

  const dispatch = createEventDispatcher();

  // File upload state
  let fileInput;
  let dragOver = false;
  let uploading = false;
  let uploadProgress = 0;

  // Supported file types
  const SUPPORTED_TYPES = ['text/plain', 'application/pdf'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  function handleFileSelect(event) {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  }

  function handleDrop(event) {
    event.preventDefault();
    dragOver = false;
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
  }

  function handleDragOver(event) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dragOver = false;
  }

  async function processFiles(files) {
    for (const file of files) {
      if (!validateFile(file)) {
        continue;
      }

      await uploadFile(file);
    }
  }

  function validateFile(file) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      dispatch('error', {
        message: `File type not supported: ${file.name}. Only TXT and PDF files are allowed.`,
        code: 'INVALID_FILE_TYPE'
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      dispatch('error', {
        message: `File too large: ${file.name}. Maximum size is 10MB.`,
        code: 'FILE_TOO_LARGE'
      });
      return false;
    }

    // Check if file already exists
    if (materials.some((m) => m.originalName === file.name)) {
      dispatch('error', {
        message: `File already exists: ${file.name}`,
        code: 'FILE_EXISTS'
      });
      return false;
    }

    return true;
  }

  async function uploadFile(file) {
    uploading = true;
    uploadProgress = 0;

    try {
      // Create material object
      const material = {
        id: crypto.randomUUID(),
        filename: `${Date.now()}_${file.name}`,
        originalName: file.name,
        fileType: file.type === 'application/pdf' ? 'pdf' : 'txt',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        embeddingStatus: 'pending',
        vectorIds: [],
        chunkCount: 0,
        averageChunkSize: 0,
        topics: [],
        language: 'unknown',
        queryCount: 0,
        lastQueried: null,
        relevanceScore: 0
      };

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        uploadProgress += 10;
        if (uploadProgress >= 90) {
          clearInterval(progressInterval);
        }
      }, 100);

      // Read file content (for processing)
      const content = await readFileContent(file);

      // Complete upload
      uploadProgress = 100;
      clearInterval(progressInterval);

      // Start embedding process
      material.embeddingStatus = 'processing';

      dispatch('upload-complete', { material, content });

      // Simulate embedding process
      setTimeout(() => {
        material.embeddingStatus = 'completed';
        material.chunkCount = Math.ceil(content.length / 500); // Rough estimate
        material.averageChunkSize = Math.floor(content.length / material.chunkCount);
        material.language = detectLanguage(content);
        material.topics = extractTopics(content);
        material.vectorIds = Array.from({ length: material.chunkCount }, () => crypto.randomUUID());

        dispatch('embedding-complete', { material });
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      dispatch('error', {
        message: `Upload failed: ${file.name}. ${error.message}`,
        code: 'UPLOAD_FAILED'
      });
    } finally {
      uploading = false;
      uploadProgress = 0;
    }
  }

  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  function detectLanguage(content) {
    // Simple language detection based on common words
    const englishWords = [
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by'
    ];
    const spanishWords = [
      'el',
      'la',
      'y',
      'o',
      'pero',
      'en',
      'de',
      'con',
      'por',
      'para',
      'que',
      'es'
    ];
    const frenchWords = [
      'le',
      'la',
      'et',
      'ou',
      'mais',
      'dans',
      'de',
      'avec',
      'par',
      'pour',
      'que',
      'est'
    ];

    const words = content.toLowerCase().split(/\s+/).slice(0, 100);

    let englishCount = 0;
    let spanishCount = 0;
    let frenchCount = 0;

    words.forEach((word) => {
      if (englishWords.includes(word)) englishCount++;
      if (spanishWords.includes(word)) spanishCount++;
      if (frenchWords.includes(word)) frenchCount++;
    });

    if (englishCount > spanishCount && englishCount > frenchCount) return 'English';
    if (spanishCount > englishCount && spanishCount > frenchCount) return 'Spanish';
    if (frenchCount > englishCount && frenchCount > spanishCount) return 'French';

    return 'Unknown';
  }

  function extractTopics(content) {
    // Simple topic extraction based on word frequency
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const wordCount = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  function deleteMaterial(material) {
    if (confirm(`Are you sure you want to delete "${material.originalName}"?`)) {
      dispatch('delete-material', { materialId: material.id });
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'pending':
        return Clock;
      case 'processing':
        return Clock;
      case 'completed':
        return CheckCircle;
      case 'failed':
        return AlertCircle;
      default:
        return File;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-stone-600 dark:text-gray-400';
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function openFileDialog() {
    fileInput?.click();
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-xl font-semibold text-stone-900 dark:text-white">Learning Materials</h2>
      <p class="text-sm text-stone-600 dark:text-gray-300 mt-1">
        Upload documents (TXT, PDF) to provide context for your agents
      </p>
    </div>
    <Button on:click={openFileDialog} disabled={uploading}>
      <Upload class="w-4 h-4 mr-2" />
      Upload Files
    </Button>
  </div>

  <!-- File Input -->
  <input
    bind:this={fileInput}
    type="file"
    multiple
    accept=".txt,.pdf,text/plain,application/pdf"
    on:change={handleFileSelect}
    class="hidden"
  />

  <!-- Drop Zone -->
  <div
    class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {dragOver
      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
      : 'border-stone-300 dark:border-gray-600'}"
    on:drop={handleDrop}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    role="button"
    tabindex="0"
    on:click={openFileDialog}
    on:keydown={(e) => e.key === 'Enter' && openFileDialog()}
  >
    <Upload class="w-12 h-12 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
    <p class="text-stone-600 dark:text-gray-300 mb-2">Drop files here or click to browse</p>
    <p class="text-sm text-stone-500 dark:text-gray-400">Supports TXT and PDF files up to 10MB</p>
  </div>

  <!-- Upload Progress -->
  {#if uploading}
    <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-blue-800 dark:text-blue-200">Uploading...</span>
        <span class="text-sm text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
      </div>
      <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
        <div
          class="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
          style="width: {uploadProgress}%"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Materials List -->
  {#if materials.length > 0}
    <div class="mt-6 space-y-3">
      <h3 class="text-lg font-semibold text-stone-900 dark:text-white">Uploaded Materials</h3>

      {#each materials as material}
        <div class="border border-stone-200 dark:border-gray-700 rounded-lg p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3 flex-1">
              <div class="flex-shrink-0">
                {#if material.fileType === 'pdf'}
                  <FileText class="w-6 h-6 text-red-600 dark:text-red-400" />
                {:else}
                  <File class="w-6 h-6 text-blue-600 dark:text-blue-400" />
                {/if}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-medium text-stone-900 dark:text-white truncate">
                    {material.originalName}
                  </h4>
                  <div class="flex items-center gap-1 {getStatusColor(material.embeddingStatus)}">
                    <svelte:component
                      this={getStatusIcon(material.embeddingStatus)}
                      class="w-4 h-4"
                    />
                    <span class="text-xs capitalize">{material.embeddingStatus}</span>
                  </div>
                </div>

                <div class="flex items-center gap-4 text-sm text-stone-500 dark:text-gray-400">
                  <span>{formatFileSize(material.size)}</span>
                  <span>{material.fileType.toUpperCase()}</span>
                  {#if material.language !== 'unknown'}
                    <span>{material.language}</span>
                  {/if}
                  {#if material.chunkCount > 0}
                    <span>{material.chunkCount} chunks</span>
                  {/if}
                </div>

                {#if material.topics.length > 0}
                  <div class="flex flex-wrap gap-1 mt-2">
                    {#each material.topics.slice(0, 3) as topic}
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-stone-100 text-stone-700 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {topic}
                      </span>
                    {/each}
                    {#if material.topics.length > 3}
                      <span class="text-xs text-stone-500 dark:text-gray-400">
                        +{material.topics.length - 3} more
                      </span>
                    {/if}
                  </div>
                {/if}

                {#if material.embeddingStatus === 'failed'}
                  <p class="text-sm text-red-600 dark:text-red-400 mt-1">
                    Embedding failed. Please try re-uploading the file.
                  </p>
                {/if}
              </div>
            </div>

            <Button variant="secondary" size="sm" on:click={() => deleteMaterial(material)}>
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="mt-6 text-center py-8">
      <File class="w-12 h-12 text-stone-400 dark:text-gray-500 mx-auto mb-4" />
      <p class="text-stone-500 dark:text-gray-400 mb-2">No materials uploaded yet</p>
      <p class="text-sm text-stone-400 dark:text-gray-500">
        Upload documents to provide context for your agents
      </p>
    </div>
  {/if}
</div>
