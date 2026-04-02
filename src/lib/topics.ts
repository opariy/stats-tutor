export type Topic = {
  id: string;
  name: string;
  chapter: number;
  description: string;
};

export type Chapter = {
  number: number;
  title: string;
  topics: Topic[];
};

export const chapters: Chapter[] = [
  {
    number: 8,
    title: "Statistical Intervals for a Single Sample",
    topics: [
      {
        id: "ci-mean-var-known",
        name: "CI on Mean (Variance Known)",
        chapter: 8,
        description: "Confidence interval on the mean of a Normal distribution when variance is known",
      },
      {
        id: "ci-mean-var-unknown",
        name: "CI on Mean (Variance Unknown)",
        chapter: 8,
        description: "Confidence interval on the mean of a Normal distribution when variance is unknown (t-distribution)",
      },
      {
        id: "ci-variance",
        name: "CI on Population Variance",
        chapter: 8,
        description: "Confidence interval on the variance of a Normal distribution (chi-square distribution)",
      },
      {
        id: "ci-proportion",
        name: "CI on Population Proportion",
        chapter: 8,
        description: "Confidence interval on a population proportion for large samples",
      },
      {
        id: "tolerance-interval",
        name: "Tolerance Intervals",
        chapter: 8,
        description: "Intervals that contain a specified proportion of the population",
      },
      {
        id: "prediction-interval",
        name: "Prediction Intervals",
        chapter: 8,
        description: "Intervals for predicting a future observation",
      },
    ],
  },
  {
    number: 9,
    title: "Tests of Hypotheses for a Single Sample",
    topics: [
      {
        id: "hypothesis-basics",
        name: "Hypothesis Testing Basics",
        chapter: 9,
        description: "Null and alternative hypotheses, Type I and Type II errors, p-values, significance level",
      },
      {
        id: "test-mean-var-known",
        name: "Test on Mean (Variance Known)",
        chapter: 9,
        description: "Z-test for the mean when population variance is known",
      },
      {
        id: "test-mean-var-unknown",
        name: "Test on Mean (Variance Unknown)",
        chapter: 9,
        description: "t-test for the mean when population variance is unknown",
      },
      {
        id: "test-variance",
        name: "Tests on Variance and Std Dev",
        chapter: 9,
        description: "Chi-square test for variance of a Normal distribution",
      },
    ],
  },
  {
    number: 10,
    title: "Statistical Inference on Two Samples",
    topics: [
      {
        id: "two-means-var-known",
        name: "Difference in Means (Variances Known)",
        chapter: 10,
        description: "Inference for the difference between two means when variances are known",
      },
      {
        id: "two-means-var-unknown",
        name: "Difference in Means (Variances Unknown)",
        chapter: 10,
        description: "Inference for the difference between two means when variances are unknown",
      },
      {
        id: "paired-t-test",
        name: "Paired t-Test",
        chapter: 10,
        description: "Test for paired or matched samples",
      },
      {
        id: "two-variances",
        name: "Inference on Two Variances",
        chapter: 10,
        description: "F-test for comparing variances of two Normal distributions",
      },
      {
        id: "two-proportions",
        name: "Inference on Two Proportions",
        chapter: 10,
        description: "Comparing proportions from two populations",
      },
    ],
  },
];

export const allTopics = chapters.flatMap((ch) => ch.topics);

export function getTopicById(id: string): Topic | undefined {
  return allTopics.find((t) => t.id === id);
}

export function getTopicSystemPrompt(topic: Topic): string {
  return `You are a statistics tutor. Topic: ${topic.name} (${topic.description}).

SOCRATIC METHOD:
- Don't give full answers immediately
- Ask ONE short question to probe their understanding
- Give hints if stuck, then ask again
- Only give complete answer after they've tried

STYLE:
- Be direct. No small talk. No "Hey!" or "Great question!"
- Short responses (2-4 sentences max unless explaining a formula)
- Use math notation when helpful
- Point out common exam mistakes

BAD: "Hey! I can see you're feeling overwhelmed. That's totally normal..."
GOOD: "What's your understanding of what a confidence interval represents?"`;
}

export function getGeneralSystemPrompt(): string {
  return `You are a statistics tutor helping students prepare for their exam on Chapters 8, 9, and 10.

TOPICS YOU COVER:
- Chapter 8: Confidence Intervals (mean with known/unknown variance, variance, proportion, tolerance & prediction intervals)
- Chapter 9: Hypothesis Testing (basics, z-test, t-test, chi-square test on variance)
- Chapter 10: Two-Sample Inference (difference in means, paired t-test, F-test for variances, two proportions)

STAY ON TOPIC:
- If asked about something outside statistics, say: "I'm here for your stats exam. What's your statistics question?"

SOCRATIC METHOD:
- Don't give full answers immediately
- Ask ONE short question to probe their understanding
- Give hints if stuck, then ask again
- Only give complete answer after they've tried

STYLE:
- Be direct. No small talk. No "Hey!" or "Great question!"
- Short responses (2-4 sentences max unless explaining a formula)
- Use math notation when helpful
- Point out common exam mistakes

BAD: "Hey! I can see you're feeling overwhelmed. That's totally normal..."
GOOD: "What's your understanding of what a confidence interval represents?"`;
}
