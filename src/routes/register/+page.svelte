<script>
  import { goto } from '$app/navigation';
  import { register as registerService } from '$modules/auth/services';

  let firstName = '';
  let lastName = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let terms = false;
  let error = '';
  let loading = false;

  // Password strength state
  let strength = 0;
  let strengthText = 'Password strength';
  let strengthColor = '#666';

  // Update password strength whenever password changes
  $: updateStrength(password);

  function updateStrength(pw) {
    strength = 0;
    if (pw.length >= 8) strength++;
    if (pw.length >= 12) strength++;
    if (/\d/.test(pw)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) strength++;

    if (strength <= 1) {
      strengthText = 'Weak password';
      strengthColor = '#ff4757';
    } else if (strength <= 2) {
      strengthText = 'Medium strength';
      strengthColor = '#ffa502';
    } else if (strength >= 3) {
      strengthText = 'Strong password';
      strengthColor = '#2ed573';
    } else {
      strengthText = 'Password strength';
      strengthColor = '#666';
    }
  }

  // Password match indicator
  $: passwordMatchText = confirmPassword
    ? password === confirmPassword
      ? '✓ Passwords match'
      : '✗ Passwords do not match'
    : '';
  $: passwordMatchColor = confirmPassword
    ? password === confirmPassword
      ? '#2ed573'
      : '#ff4757'
    : '';

  async function handleSignUp() {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      error = 'Please fill in all fields';
      return;
    }
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }
    if (!terms) {
      error = 'Please agree to the Terms of Service and Privacy Policy';
      return;
    }

    loading = true;
    const res = await registerService({
      name: `${firstName} ${lastName}`,
      email,
      password
    });
    if (res) {
      error = '';
      goto('/login');
    } else {
      error = 'Registration failed';
    }
    loading = false;
  }

  function signUpWithGoogle() {
    alert('Google sign-up would be implemented here');
  }

  function signUpWithApple() {
    alert('Apple sign-up would be implemented here');
  }
</script>

<div class="main-content">
  <section class="welcome-section">
    <h1>Start your learning journey</h1>
    <p>
      Join thousands of learners who are accelerating their education with our AI-powered tutoring
      platform.
    </p>

    <div class="benefits">
      <div class="benefit">
        <div class="benefit-icon">🎓</div>
        <div class="benefit-content">
          <h3>Personalized Learning</h3>
          <p>AI adapts to your learning style and pace for optimal results</p>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">📊</div>
        <div class="benefit-content">
          <h3>Progress Tracking</h3>
          <p>Monitor your improvement with detailed analytics and insights</p>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">⚡</div>
        <div class="benefit-content">
          <h3>Instant Support</h3>
          <p>Get help 24/7 from our advanced AI tutoring system</p>
        </div>
      </div>
      <div class="benefit">
        <div class="benefit-icon">🏆</div>
        <div class="benefit-content">
          <h3>Proven Results</h3>
          <p>Join successful learners achieving their academic goals</p>
        </div>
      </div>
    </div>
  </section>

  <div class="signup-container">
    <div class="signup-header">
      <h2>Create Account</h2>
      <p>Get started with your free AI Tutor account</p>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="firstName">First Name</label>
        <input
          id="firstName"
          type="text"
          class="form-input"
          placeholder="John"
          bind:value={firstName}
          required
        />
      </div>
      <div class="form-group">
        <label for="lastName">Last Name</label>
        <input
          id="lastName"
          type="text"
          class="form-input"
          placeholder="Doe"
          bind:value={lastName}
          required
        />
      </div>
    </div>

    <div class="form-group">
      <label for="email">Email Address</label>
      <input
        id="email"
        type="email"
        class="form-input"
        placeholder="john.doe@example.com"
        bind:value={email}
        required
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        class="form-input"
        placeholder="Create a strong password"
        bind:value={password}
        required
      />
      <div class="password-strength">
        <div class="strength-meter">
          {#each [1, 2, 3, 4] as i}
            <div
              class="strength-bar {strength >= i
                ? strength <= 1
                  ? 'weak'
                  : strength <= 2
                    ? 'medium'
                    : 'strong'
                : ''}"
            ></div>
          {/each}
        </div>
        <span style="color: {strengthColor}">{strengthText}</span>
      </div>
    </div>

    <div class="form-group">
      <label for="confirmPassword">Confirm Password</label>
      <input
        id="confirmPassword"
        type="password"
        class="form-input"
        placeholder="Confirm your password"
        bind:value={confirmPassword}
        required
      />
      {#if passwordMatchText}
        <div style="font-size: 0.8rem; margin-top: 0.5rem; color: {passwordMatchColor}">
          {passwordMatchText}
        </div>
      {/if}
    </div>

    <div class="terms-agreement">
      <input id="terms" type="checkbox" bind:checked={terms} />
      <label for="terms">
        I agree to the <a href="/terms">Terms of Service</a> and
        <a href="/privacy">Privacy Policy</a>
      </label>
    </div>

    {#if error}
      <p class="error-message">{error}</p>
    {/if}

    <button class="signup-button" on:click|preventDefault={handleSignUp} disabled={loading}>
      {#if loading}Creating Account...{:else}Create Account{/if}
    </button>

    <div class="divider">
      <span>or sign up with</span>
    </div>

    <div class="social-signup">
      <button type="button" class="social-btn" on:click={signUpWithGoogle}>
        <span>📧</span> Google
      </button>
      <button type="button" class="social-btn" on:click={signUpWithApple}>
        <span>🍎</span> Apple
      </button>
    </div>

    <div class="signin-link">
      Already have an account? <a href="/login">Sign in here</a>
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

  .benefits {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .benefit {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .benefit-icon {
    width: 32px;
    height: 32px;
    background-color: #ff8c00;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
  }

  .benefit-content h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .benefit-content p {
    font-size: 0.9rem;
    color: #666;
    line-height: 1.4;
  }

  .signup-container {
    flex: 0 0 450px;
    background: white;
    padding: 3rem;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid #e0e0e0;
  }

  .signup-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .signup-header h2 {
    font-size: 2rem;
    font-weight: 700;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .signup-header p {
    color: #666;
    font-size: 1rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
    flex: 1;
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

  .password-strength {
    margin-top: 0.5rem;
    font-size: 0.8rem;
  }

  .strength-meter {
    display: flex;
    gap: 2px;
    margin-top: 0.25rem;
  }

  .strength-bar {
    height: 3px;
    flex: 1;
    background-color: #e0e0e0;
    border-radius: 2px;
    transition: background-color 0.2s ease;
  }

  .strength-bar.weak {
    background-color: #ff4757;
  }

  .strength-bar.medium {
    background-color: #ffa502;
  }

  .strength-bar.strong {
    background-color: #2ed573;
  }

  .terms-agreement {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 2rem;
    font-size: 0.9rem;
    color: #666;
  }

  .terms-agreement input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: #ff8c00;
    margin-top: 0.2rem;
  }

  .terms-agreement a {
    color: #ff8c00;
    text-decoration: none;
  }

  .terms-agreement a:hover {
    text-decoration: underline;
  }

  .signup-button {
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

  .signup-button:hover {
    background-color: #e07b00;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(255, 140, 0, 0.3);
  }

  .signup-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
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

  .social-signup {
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

  .signin-link {
    text-align: center;
    color: #666;
    font-size: 0.9rem;
  }

  .signin-link a {
    color: #ff8c00;
    font-weight: 600;
    text-decoration: none;
  }

  .signin-link a:hover {
    text-decoration: underline;
  }

  .error-message {
    color: red;
    margin-bottom: 1rem;
    font-size: 0.9rem;
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

    .signup-container {
      flex: none;
      width: 100%;
      max-width: 450px;
      padding: 2rem;
    }

    .form-row {
      flex-direction: column;
      gap: 0;
    }

    .benefits {
      grid-template-columns: 1fr;
    }
  }
</style>
