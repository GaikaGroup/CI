#!/bin/bash

# Function to replace subjects with courses in a file
replace_in_file() {
    local file="$1"
    if [[ -f "$file" ]]; then
        echo "Processing: $file"
        
        # Create backup
        cp "$file" "$file.bak"
        
        # Replace various forms of subject/Subject with course/Course
        sed -i.tmp \
            -e 's/\bsubjects\b/courses/g' \
            -e 's/\bSubjects\b/Courses/g' \
            -e 's/\bsubject\b/course/g' \
            -e 's/\bSubject\b/Course/g' \
            -e 's/subjectId/courseId/g' \
            -e 's/SubjectId/CourseId/g' \
            -e 's/subjectService/courseService/g' \
            -e 's/SubjectService/CourseService/g' \
            -e 's/subjectsStore/coursesStore/g' \
            -e 's/SubjectsStore/CoursesStore/g' \
            -e 's/subjectData/courseData/g' \
            -e 's/SubjectData/CourseData/g' \
            -e 's/enrolledSubjects/enrolledCourses/g' \
            -e 's/EnrolledSubjects/EnrolledCourses/g' \
            -e 's/My Subjects/My Courses/g' \
            -e 's/my-subjects/my-courses/g' \
            -e 's/\/subjects\//\/courses\//g' \
            -e 's/modules\/subjects/modules\/courses/g' \
            "$file"
        
        # Remove temporary file
        rm -f "$file.tmp"
        
        echo "Completed: $file"
    fi
}

# Process key files first
echo "Starting subject to course replacement..."

# Process store files
replace_in_file "src/lib/stores/subjects.js"

# Process route files
find src/routes -name "*.svelte" -exec bash -c 'replace_in_file "$0"' {} \;

# Process component files
find src/lib/modules -name "*.svelte" -exec bash -c 'replace_in_file "$0"' {} \;

# Process service files
find src/lib/modules -name "*.js" -exec bash -c 'replace_in_file "$0"' {} \;

echo "Replacement complete!"
