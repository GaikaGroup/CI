/**
 * Generate slugs for existing courses
 * Run: node scripts/generate-course-slugs.js
 */

import { getPrismaClient } from '../src/lib/database/connection.js';
import { generateUniqueSlug } from '../src/lib/utils/slugify.js';

async function generateSlugs() {
  const prisma = getPrismaClient();

  try {
    console.log('Fetching courses without slugs...');

    const courses = await prisma.course.findMany({
      where: {
        OR: [{ slug: null }, { slug: '' }]
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    console.log(`Found ${courses.length} courses to update`);

    if (courses.length === 0) {
      console.log('All courses already have slugs!');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const course of courses) {
      try {
        const slug = generateUniqueSlug(course.name, course.id);

        await prisma.course.update({
          where: { id: course.id },
          data: { slug }
        });

        console.log(`✓ ${course.name} -> ${slug}`);
        updated++;
      } catch (error) {
        console.error(`✗ Failed to update course ${course.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\nCompleted: ${updated} updated, ${errors} errors`);

    // Now add unique constraint
    console.log('\nAdding unique constraint to slug column...');
    await prisma.$executeRaw`ALTER TABLE "courses" ADD CONSTRAINT "courses_slug_key" UNIQUE ("slug")`;
    console.log('✓ Unique constraint added');
  } catch (error) {
    console.error('Error generating slugs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateSlugs();
