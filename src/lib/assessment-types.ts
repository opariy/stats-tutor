// Assessment types for knowledge testing flow

export type Question = {
  id: string;
  question: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[];  // 4 answer options (A, B, C, D)
  correctIndex: number;  // index of correct answer (0-3)
  explanation: string;  // brief explanation of why the correct answer is right
};

export type Answer = {
  questionId: string;
  selectedIndex: number;  // which option user selected (0-3)
  isCorrect: boolean;
  topic: string;
};

export type TopicScore = {
  topic: string;
  correct: number;
  total: number;
};

export type AssessmentResult = {
  totalQuestions: number;
  correctCount: number;
  topicBreakdown: TopicScore[];
  failedTopics: string[];
};

export type Quiz = {
  subject: string;
  questions: Question[];
};

// Compute assessment results from answers
export function computeResults(answers: Answer[]): AssessmentResult {
  const topicMap = new Map<string, { correct: number; total: number }>();

  for (const answer of answers) {
    const existing = topicMap.get(answer.topic) || { correct: 0, total: 0 };
    existing.total += 1;
    if (answer.isCorrect) {
      existing.correct += 1;
    }
    topicMap.set(answer.topic, existing);
  }

  const topicBreakdown: TopicScore[] = [];
  const failedTopics: string[] = [];

  for (const [topic, scores] of topicMap.entries()) {
    topicBreakdown.push({
      topic,
      correct: scores.correct,
      total: scores.total,
    });

    // Consider topic "failed" if less than 50% correct
    if (scores.correct / scores.total < 0.5) {
      failedTopics.push(topic);
    }
  }

  return {
    totalQuestions: answers.length,
    correctCount: answers.filter(a => a.isCorrect).length,
    topicBreakdown,
    failedTopics,
  };
}
