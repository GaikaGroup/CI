<script>
  import { onMount } from 'svelte';
  import { login, user, checkAuth } from '$modules/auth/stores';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { setMode } from '$lib/stores/mode';
  let email = '';
  let password = '';
  let remember = false;
  let error = '';
  let redirect = '/sessions';

  $: redirect = $page.url.searchParams.get('redirect') || '/sessions';

  async function handleSignIn() {
    error = '';
    if (!email || !password) {
      error = 'Please fill in all fields';
      return;
    }
    try {
      await login(email, password);
      setMode(redirect === '/learn' || redirect === '/catalogue' ? 'catalogue' : 'fun');
      goto(redirect);
    } catch (e) {
      error = 'Invalid credentials';
    }
  }

  // Check if user is already authenticated on mount
  onMount(async () => {
    await checkAuth();
    if ($user) {
      // User is already authenticated, redirect to sessions
      goto('/sessions');
    }
  });
</script>

<div class="main-content">
  <section class="welcome-section">
    <h1>Welcome back to AI Tutor</h1>
    <p>
      Continue your personalized learning journey with our advanced AI-powered tutoring platform.
    </p>
    <div class="features">
      <div class="feature">
        <div class="feature-icon"></div>
        <div class="feature-text">Personalized learning paths</div>
      </div>
      <div class="feature">
        <div class="feature-icon"></div>
        <div class="feature-text">24/7 AI assistance</div>
      </div>
      <div class="feature">
        <div class="feature-icon"></div>
        <div class="feature-text">Progress tracking</div>
      </div>
      <div class="feature">
        <div class="feature-icon"></div>
        <div class="feature-text">Interactive exercises</div>
      </div>
    </div>
  </section>

  <div class="signin-container">
    <div class="signin-header">
      <h2>Sign In</h2>
      <p>Access your personalized learning dashboard</p>
    </div>

    <div class="form-group">
      <label for="email">Email or Username</label>
      <input
        type="text"
        id="email"
        class="form-input"
        placeholder="Enter your email or username"
        bind:value={email}
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        class="form-input"
        placeholder="Enter your password"
        bind:value={password}
      />
    </div>

    <div class="signin-options">
      <label class="remember-me">
        <input type="checkbox" bind:checked={remember} />
        Remember me
      </label>
      <a href="/forgot-password" class="forgot-password">Forgot password?</a>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <button class="signin-button" on:click={handleSignIn}>Sign In</button>

    <div class="divider">
      <span>or continue with</span>
    </div>

    <div class="social-signin">
      <button class="social-btn"><span>📧</span> Google</button>
      <button class="social-btn"><span>🍎</span> Apple</button>
    </div>

    <div class="signup-link">
      Don't have an account? <a href="/signup">Sign up here</a>
    </div>
  </div>
</div>

<style>
  .main-content {
    display: flex;
    min-height: calc(100vh - 70px);
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    gap: 4rem;
    align-items: center;
  }
  .welcome-section {
    flex: 1;
    padding-right: 2rem;
  }
  .welcome-section h1 {
    font-size: 3rem;
    font-weight: 700;
    color: #333;
    margin-bottom: 1rem;
    line-height: 1.2;
  }
  .welcome-section p {
    font-size: 1.2rem;
    color: #666;
    margin-bottom: 2rem;
    line-height: 1.6;
  }
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }
  .feature {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .feature-icon {
    width: 24px;
    height: 24px;
    background-color: #ff8c00;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 0.25rem;
  }
  .feature-text {
    color: #666;
  }
  .signin-container {
    flex: 0 0 400px;
    background: white;
    padding: 3rem;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
  }
  .signin-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  .signin-header h2 {
    font-size: 2rem;
    font-weight: 700;
    color: #333;
    margin-bottom: 0.5rem;
  }
  .signin-header p {
    color: #666;
    font-size: 1rem;
  }
  .form-group {
    margin-bottom: 1.5rem;
  }
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
  }
  .form-input {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s ease;
    background-color: #fafafa;
  }
  .form-input:focus {
    outline: none;
    border-color: #ff8c00;
    background-color: white;
    box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.1);
  }
  .form-input::placeholder {
    color: #999;
  }
  .signin-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    font-size: 0.9rem;
  }
  .remember-me {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .remember-me input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: #ff8c00;
  }
  .forgot-password {
    color: #ff8c00;
    text-decoration: none;
    font-weight: 500;
  }
  .forgot-password:hover {
    text-decoration: underline;
  }
  .signin-button {
    width: 100%;
    background-color: #ff8c00;
    color: white;
    padding: 1rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 1.5rem;
  }
  .signin-button:hover {
    background-color: #e07b00;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(255, 140, 0, 0.3);
  }
  .divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    font-size: 0.9rem;
    color: #999;
  }
  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: #e0e0e0;
  }
  .divider span {
    padding: 0 1rem;
  }
  .social-signin {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .social-btn {
    flex: 1;
    padding: 0.875rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 500;
  }
  .social-btn:hover {
    border-color: #ff8c00;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .signup-link {
    text-align: center;
    color: #666;
    font-size: 0.9rem;
  }
  .signup-link a {
    color: #ff8c00;
    font-weight: 600;
    text-decoration: none;
  }
  .signup-link a:hover {
    text-decoration: underline;
  }
  .error-message {
    color: #ff4757;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    text-align: center;
  }
  @media (max-width: 768px) {
    .main-content {
      flex-direction: column;
      padding: 1rem;
      gap: 2rem;
    }
    .welcome-section {
      padding-right: 0;
      text-align: center;
    }
    .welcome-section h1 {
      font-size: 2rem;
    }
    .signin-container {
      flex: none;
      width: 100%;
      max-width: 400px;
      padding: 2rem;
    }
    .features {
      grid-template-columns: 1fr;
    }
  }
</style>
