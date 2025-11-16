#!/usr/bin/env node

/**
 * GraphRAG Migration Script
 *
 * Migrates knowledge graph data from in-memory storage to database storage.
 *
 * Usage:
 *   node scripts/migrate-graphrag.js [options]
 *
 * Options:
 *   --dry-run    Perform a dry run without migrating data
 *   --yes        Skip confirmation prompt
 */

import { MigrationService } from '../src/lib/modules/graphrag/services/MigrationService.js';
import { InMemoryStorageAdapter } from '../src/lib/modules/graphrag/adapters/InMemoryStorageAdapter.js';
import readline from 'readline';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipConfirmation = args.includes('--yes');

/**
 * Prompt user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} User response
 */
function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main migration function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('GraphRAG Migration Tool');
  console.log('='.repeat(60));
  console.log();

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be migrated');
    console.log();
  }

  try {
    // Create source adapter (in-memory)
    // Note: In a real scenario, you would load existing data here
    const sourceAdapter = new InMemoryStorageAdapter();
    const sourceStats = sourceAdapter.getStats();

    console.log('📊 Source Data Statistics:');
    console.log(`   Nodes: ${sourceStats.nodeCount}`);
    console.log(`   Relationships: ${sourceStats.relationshipCount}`);
    console.log(`   Materials: ${sourceStats.materialCount}`);
    console.log(`   Courses: ${sourceStats.courseCount}`);
    console.log();

    if (sourceStats.nodeCount === 0) {
      console.log('✅ No data to migrate');
      process.exit(0);
    }

    // Confirm migration
    if (!skipConfirmation && !dryRun) {
      console.log('⚠️  WARNING: This will migrate data to the database.');
      console.log('   Make sure you have:');
      console.log('   1. Backed up your database');
      console.log('   2. Configured OPENAI_API_KEY in .env');
      console.log('   3. Enabled pgvector extension');
      console.log();

      const confirmed = await confirm('Do you want to proceed?');

      if (!confirmed) {
        console.log('❌ Migration cancelled');
        process.exit(0);
      }
      console.log();
    }

    // Run migration
    console.log('🚀 Starting migration...');
    console.log();

    const migrationService = new MigrationService();
    const result = await migrationService.migrate(sourceAdapter, { dryRun });

    console.log();
    console.log('='.repeat(60));
    console.log('Migration Results');
    console.log('='.repeat(60));
    console.log();

    if (result.success) {
      console.log('✅ Migration completed successfully!');
      console.log();

      if (!dryRun) {
        console.log(`📝 Migrated Nodes: ${result.migratedNodes}`);
        console.log(`🔗 Migrated Relationships: ${result.migratedRelationships}`);
        console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
        console.log(`💾 Backup: ${result.backupPath}`);
        console.log();

        if (result.verification) {
          if (result.verification.passed) {
            console.log('✅ Verification: PASSED');
          } else {
            console.log('⚠️  Verification: FAILED');
            console.log('   Issues:');
            result.verification.issues.forEach((issue) => {
              console.log(`   - ${issue.type}: ${issue.difference} difference`);
            });
          }
        }
      } else {
        console.log('📊 Dry Run Statistics:');
        console.log(`   Nodes to migrate: ${result.stats.nodeCount}`);
        console.log(`   Relationships to migrate: ${result.stats.relationshipCount}`);
        console.log(`   Backup created: ${result.backupPath}`);
      }
    } else {
      console.log('❌ Migration failed!');
      console.log();
      console.log(`Error: ${result.error}`);

      if (result.errors && result.errors.length > 0) {
        console.log();
        console.log('Errors:');
        result.errors.forEach((err) => {
          console.log(`   - Material ${err.materialId}: ${err.error}`);
        });
      }

      process.exit(1);
    }

    console.log();
    console.log('='.repeat(60));
  } catch (error) {
    console.error();
    console.error('❌ Migration failed with error:');
    console.error(error.message);
    console.error();
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
main();
