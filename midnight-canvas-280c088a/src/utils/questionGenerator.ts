// Question templates for different query types
interface QuestionTemplate {
  trigger: string[];
  questions: string[];
}

const questionTemplates: QuestionTemplate[] = [
  {
    trigger: ['business', 'startup', 'company', 'enterprise'],
    questions: [
      "What type of business are you looking to start or research?",
      "What industry or niche does this business focus on?",
      "Are you looking for inspiration, tutorials, or specific examples?",
      "What platforms should I search? (Twitter, Reddit, LinkedIn, YouTube, etc.)",
    ],
  },
  {
    trigger: ['build', 'create', 'make', 'develop', 'design'],
    questions: [
      "What are you trying to build?",
      "What's the main purpose or goal of this project?",
      "Do you need technical tutorials, design inspiration, or both?",
      "What's your experience level with this type of project?",
    ],
  },
  {
    trigger: ['learn', 'tutorial', 'how to', 'guide', 'course'],
    questions: [
      "What skill or topic do you want to learn?",
      "What's your current experience level (beginner, intermediate, advanced)?",
      "Do you prefer video tutorials, written guides, or community discussions?",
      "Are you looking for free resources or are you open to paid courses?",
    ],
  },
  {
    trigger: ['marketing', 'promote', 'advertise', 'grow audience'],
    questions: [
      "What are you trying to market or promote?",
      "Who is your target audience?",
      "What platforms are you currently using or considering?",
      "What's your main marketing goal? (brand awareness, sales, engagement)",
    ],
  },
  {
    trigger: ['product', 'tool', 'software', 'app', 'service'],
    questions: [
      "What type of product or tool are you looking for?",
      "What problem are you trying to solve?",
      "What's your budget range (free, under $50, premium)?",
      "Do you need reviews, comparisons, or recommendations?",
    ],
  },
];

// Default questions for general queries
const defaultQuestions = [
  "Can you provide more details about what you're looking for?",
  "What platforms would you like me to search? (Twitter, Reddit, YouTube, LinkedIn, etc.)",
  "Are you looking for recent information or general knowledge?",
  "What's the main goal you're trying to achieve?",
];

export const generateFollowUpQuestions = (userQuery: string): string[] => {
  const queryLower = userQuery.toLowerCase();

  // Find matching template
  for (const template of questionTemplates) {
    if (template.trigger.some(keyword => queryLower.includes(keyword))) {
      return template.questions;
    }
  }

  // Return default questions if no match
  return defaultQuestions;
};

export const generateInitialResponse = (userQuery: string): string => {
  return `I'll help you find the best information across social media platforms. Let me ask a few questions to give you the most relevant results.`;
};

// Simulate processing user answers and generating results
export const generateSearchResults = (answers: { question: string; answer: string }[]): string => {
  const platforms = answers
    .find(a => a.question.toLowerCase().includes('platform'))
    ?.answer || 'Twitter, Reddit, and YouTube';

  return `Based on your answers, I'll search across ${platforms} for the most relevant and recent discussions, tutorials, and insights.

This is a beta version, so I'm currently gathering your requirements to provide the most accurate results in future updates.

Summary of your search:
${answers.map(a => `• ${a.question}\n  → ${a.answer}`).join('\n\n')}

In the full version, this will return curated results from multiple social media platforms with:
- Real discussions and user experiences
- Tutorial recommendations
- Expert insights
- Community opinions
- Recent trends and updates`;
};
