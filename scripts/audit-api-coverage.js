#!/usr/bin/env node

/**
 * API Endpoint Test Coverage Audit Tool
 * 
 * This script scans all API endpoints and verifies that each has comprehensive test coverage
 * including tests for: success (200/201), authentication (401), authorization (403),
 * validation (400), and error handling (500).
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

/**
 * Recursively find all +server.js files in a directory
 */
async function findServerFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await findServerFiles(fullPath, files);
    } else if (entry.name === '+server.js') {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Extract HTTP methods from a server file
 */
async function extractHttpMethods(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const methods = [];
  
  // Look for exported HTTP method handlers
  const methodRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/g;
  let match;
  
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  return methods;
}

/**
 * Find test files that might test a given endpoint
 */
async function findTestFiles(testsDir) {
  const testFiles = [];
  
  async function scan(dir) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name.endsWith('.test.js')) {
          testFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, skip
    }
  }
  
  await scan(testsDir);
  return testFiles;
}

/**
 * Check if a test file covers an endpoint
 */
async function checkTestCoverage(testFilePath, endpointPath, method) {
  try {
    const content = await readFile(testFilePath, 'utf-8');
    const normalizedEndpoint = endpointPath.replace(/\\/g, '/');
    
    // Check if test file imports or references the endpoint
    const hasEndpointReference = content.includes(normalizedEndpoint) || 
                                  content.includes(endpointPath);
    
    if (!hasEndpointReference) {
      return null;
    }
    
    // Check for different test scenarios
    const scenarios = {
      success: /20[01]|success|should\s+(?:create|return|get|update|delete).*successfully/i.test(content),
      auth: /401|unauthorized|not\s+authenticated|authentication\s+required/i.test(content),
      authorization: /403|forbidden|not\s+authorized|permission|admin/i.test(content),
      validation: /400|bad\s+request|invalid|validation|required\s+field/i.test(content),
      error: /500|internal\s+server\s+error|error\s+handling|should\s+handle\s+error/i.test(content)
    };
    
    return scenarios;
  } catch (error) {
    return null;
  }
}

/**
 * Analyze test coverage for an endpoint
 */
async function analyzeEndpointCoverage(endpointPath, method, testFiles) {
  const coverage = {
    success: false,
    auth: false,
    authorization: false,
    validation: false,
    error: false
  };
  
  const testingFiles = [];
  
  for (const testFile of testFiles) {
    const scenarios = await checkTestCoverage(testFile, endpointPath, method);
    
    if (scenarios) {
      testingFiles.push(relative(projectRoot, testFile));
      
      // Merge scenarios
      Object.keys(coverage).forEach(key => {
        if (scenarios[key]) {
          coverage[key] = true;
        }
      });
    }
  }
  
  return { coverage, testingFiles };
}

/**
 * Generate coverage report
 */
function generateReport(results) {
  console.log('\n' + colors.blue + '═'.repeat(80) + colors.reset);
  console.log(colors.blue + '  API Endpoint Test Coverage Audit' + colors.reset);
  console.log(colors.blue + '═'.repeat(80) + colors.reset + '\n');
  
  let totalEndpoints = 0;
  let fullyCovered = 0;
  let partiallyCovered = 0;
  let notCovered = 0;
  
  for (const result of results) {
    const { endpoint, method, coverage, testingFiles } = result;
    const coveredScenarios = Object.values(coverage).filter(Boolean).length;
    const totalScenarios = Object.keys(coverage).length;
    
    totalEndpoints++;
    
    let status;
    let statusColor;
    
    if (coveredScenarios === totalScenarios) {
      status = '✅ Fully Covered';
      statusColor = colors.green;
      fullyCovered++;
    } else if (coveredScenarios > 0) {
      status = '⚠️  Partially Covered';
      statusColor = colors.yellow;
      partiallyCovered++;
    } else {
      status = '❌ Not Covered';
      statusColor = colors.red;
      notCovered++;
    }
    
    console.log(statusColor + status + colors.reset + ' ' + colors.gray + method + colors.reset + ' ' + endpoint);
    
    // Show coverage details
    const scenarios = [
      { key: 'success', label: '200/201 Success' },
      { key: 'auth', label: '401 Authentication' },
      { key: 'authorization', label: '403 Authorization' },
      { key: 'validation', label: '400 Validation' },
      { key: 'error', label: '500 Error Handling' }
    ];
    
    const missing = scenarios.filter(s => !coverage[s.key]);
    
    if (missing.length > 0) {
      console.log('  ' + colors.red + 'Missing: ' + missing.map(s => s.label).join(', ') + colors.reset);
    }
    
    if (testingFiles.length > 0) {
      console.log('  ' + colors.gray + 'Tests: ' + testingFiles.join(', ') + colors.reset);
    }
    
    console.log('');
  }
  
  // Summary
  console.log(colors.blue + '─'.repeat(80) + colors.reset);
  console.log(colors.blue + '  Summary' + colors.reset);
  console.log(colors.blue + '─'.repeat(80) + colors.reset + '\n');
  
  const coveragePercentage = totalEndpoints > 0 
    ? Math.round((fullyCovered / totalEndpoints) * 100) 
    : 0;
  
  console.log(`  Total Endpoints: ${totalEndpoints}`);
  console.log(`  ${colors.green}✅ Fully Covered: ${fullyCovered}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Partially Covered: ${partiallyCovered}${colors.reset}`);
  console.log(`  ${colors.red}❌ Not Covered: ${notCovered}${colors.reset}`);
  console.log(`  Coverage: ${coveragePercentage}%\n`);
  
  if (coveragePercentage < 100) {
    console.log(colors.yellow + '  ⚠️  Not all endpoints have complete test coverage!' + colors.reset);
    console.log(colors.gray + '  Add tests for missing scenarios to improve coverage.\n' + colors.reset);
  } else {
    console.log(colors.green + '  🎉 All endpoints have complete test coverage!' + colors.reset + '\n');
  }
}

/**
 * Main audit function
 */
async function auditApiCoverage() {
  try {
    console.log('Scanning API endpoints...');
    
    const apiDir = join(projectRoot, 'src', 'routes', 'api');
    const testsDir = join(projectRoot, 'tests');
    
    // Find all API server files
    const serverFiles = await findServerFiles(apiDir);
    console.log(`Found ${serverFiles.length} API endpoints\n`);
    
    // Find all test files
    const testFiles = await findTestFiles(testsDir);
    console.log(`Found ${testFiles.length} test files\n`);
    
    // Analyze each endpoint
    const results = [];
    
    for (const serverFile of serverFiles) {
      const methods = await extractHttpMethods(serverFile);
      const endpointPath = relative(join(projectRoot, 'src', 'routes'), serverFile);
      
      for (const method of methods) {
        const { coverage, testingFiles } = await analyzeEndpointCoverage(
          serverFile,
          method,
          testFiles
        );
        
        results.push({
          endpoint: endpointPath,
          method,
          coverage,
          testingFiles
        });
      }
    }
    
    // Generate report
    generateReport(results);
    
  } catch (error) {
    console.error('Error during audit:', error);
    process.exit(1);
  }
}

// Run audit
auditApiCoverage();
