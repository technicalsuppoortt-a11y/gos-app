import type { CommerceConfig, Lesson } from './model';

// Editable sample curriculum for a new course and the demo catalog course.
export function sampleCourseModules(): CommerceConfig['modules'] {
  const groups = [
    ['Introduction', ['Welcome to the Course', "What You'll Learn", 'Tools You Need']],
    ['AI Tools & Setup', ['Your AI Toolkit', 'Setting Up ChatGPT', 'Writing Better Prompts', 'AI Image Generation', 'Your Workspace Checklist']],
    ['Creating Your Product', ['Finding Your Niche', 'Validating Your Idea', 'Planning Your Product', 'Creating Content with AI', 'Designing Your Resources', 'Packaging Your Offer']],
    ['Marketing & Sales', ['Understanding Your Audience', 'Building Your Sales Page', 'Writing Your Offer', 'Social Media Content', 'Email Marketing', 'Launching Your Product', 'Tracking Your Results']],
    ['Automation & Scaling', ['Automating Your Workflow', 'Customer Onboarding', 'Scaling Your Business', 'Your Next Steps']],
  ] as const;
  return groups.map(([name, titles], moduleIndex) => ({
    title: `Module ${moduleIndex + 1}: ${name}`,
    lessons: titles.map((title, index): Lesson => ({
      id: `sample-course-${moduleIndex + 1}-${index + 1}`, title,
      kind: moduleIndex === 0 && index === 2 ? 'PDF' : 'Video',
      duration: moduleIndex === 0 ? ['08:24', '06:15', '2.4 MB'][index] : `${String(6 + index * 2).padStart(2, '0')}:${String(15 + index * 7).padStart(2, '0')}`,
      url: '',
    })),
  }));
}
