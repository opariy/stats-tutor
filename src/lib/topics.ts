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
    number: 1,
    title: "Role of Statistics in Engineering",
    topics: [
      {
        id: "stats-role",
        name: "Role of Statistics",
        chapter: 1,
        description: "Role of statistics in engineering problem solving, variability",
      },
      {
        id: "study-types",
        name: "Enumerative vs Analytical Studies",
        chapter: 1,
        description: "Enumerative and analytical studies, data collection methods",
      },
      {
        id: "designed-experiments",
        name: "Designed Experiments",
        chapter: 1,
        description: "Advantages of designed experiments over observational studies",
      },
      {
        id: "models",
        name: "Mechanistic vs Empirical Models",
        chapter: 1,
        description: "Mechanistic and empirical models, probability models in engineering",
      },
    ],
  },
  {
    number: 2,
    title: "Probability",
    topics: [
      {
        id: "sample-space",
        name: "Sample Space and Events",
        chapter: 2,
        description: "Sample space, events, probability of an event",
      },
      {
        id: "addition-rule",
        name: "Rule of Addition",
        chapter: 2,
        description: "Addition rule for probability, mutually exclusive events",
      },
      {
        id: "conditional-prob",
        name: "Conditional Probability",
        chapter: 2,
        description: "Conditional probability, multiplication rule, total probability",
      },
      {
        id: "independence",
        name: "Independence",
        chapter: 2,
        description: "Independent events and their properties",
      },
      {
        id: "bayes-theorem",
        name: "Bayes' Theorem",
        chapter: 2,
        description: "Bayes' theorem and its applications",
      },
    ],
  },
  {
    number: 3,
    title: "Discrete Random Variables",
    topics: [
      {
        id: "random-variable",
        name: "Random Variables",
        chapter: 3,
        description: "Concept of a random variable, discrete random variables",
      },
      {
        id: "pmf-cdf",
        name: "PMF and CDF",
        chapter: 3,
        description: "Probability mass function and cumulative distribution functions",
      },
      {
        id: "discrete-mean-var",
        name: "Mean and Variance",
        chapter: 3,
        description: "Mean and variance of a discrete random variable",
      },
      {
        id: "binomial",
        name: "Binomial Distribution",
        chapter: 3,
        description: "Binomial distribution, parameters n and p, applications",
      },
      {
        id: "poisson",
        name: "Poisson Distribution",
        chapter: 3,
        description: "Poisson distribution, rate parameter λ, applications",
      },
      {
        id: "geometric",
        name: "Geometric Distribution",
        chapter: 3,
        description: "Geometric distribution, waiting for first success",
      },
      {
        id: "hypergeometric",
        name: "Hypergeometric Distribution",
        chapter: 3,
        description: "Hypergeometric distribution, sampling without replacement",
      },
    ],
  },
  {
    number: 4,
    title: "Continuous Random Variables",
    topics: [
      {
        id: "continuous-rv",
        name: "Continuous Random Variables",
        chapter: 4,
        description: "Continuous random variables, probability density functions",
      },
      {
        id: "continuous-cdf",
        name: "CDF for Continuous RVs",
        chapter: 4,
        description: "Cumulative distribution functions for continuous variables",
      },
      {
        id: "continuous-mean-var",
        name: "Mean and Variance",
        chapter: 4,
        description: "Mean and variance of a continuous random variable",
      },
      {
        id: "uniform",
        name: "Uniform Distribution",
        chapter: 4,
        description: "Uniform distribution on interval [a, b]",
      },
      {
        id: "normal",
        name: "Normal Distribution",
        chapter: 4,
        description: "Normal distribution, standard normal, z-scores",
      },
      {
        id: "exponential",
        name: "Exponential Distribution",
        chapter: 4,
        description: "Exponential distribution, memoryless property",
      },
      {
        id: "gamma-erlang",
        name: "Gamma and Erlang Distributions",
        chapter: 4,
        description: "Gamma distribution, Erlang as special case",
      },
      {
        id: "weibull",
        name: "Weibull Distribution",
        chapter: 4,
        description: "Weibull distribution for reliability analysis",
      },
      {
        id: "normal-approx",
        name: "Normal Approximation",
        chapter: 4,
        description: "Normal approximation to Binomial and Poisson distributions",
      },
    ],
  },
  {
    number: 6,
    title: "Random Sampling and Data Description",
    topics: [
      {
        id: "random-sampling",
        name: "Random Sampling",
        chapter: 6,
        description: "Random sampling methods and principles",
      },
      {
        id: "data-summary",
        name: "Data Summary and Display",
        chapter: 6,
        description: "Summarizing and displaying data, descriptive statistics",
      },
      {
        id: "stem-leaf",
        name: "Stem-and-Leaf Diagrams",
        chapter: 6,
        description: "Creating and interpreting stem-and-leaf diagrams",
      },
      {
        id: "histograms",
        name: "Frequency Distributions and Histograms",
        chapter: 6,
        description: "Frequency distributions, histograms, and their interpretation",
      },
      {
        id: "box-plots",
        name: "Box Plots",
        chapter: 6,
        description: "Box plots, quartiles, identifying outliers",
      },
      {
        id: "time-sequence",
        name: "Time Sequence Plots",
        chapter: 6,
        description: "Time sequence plots for temporal data",
      },
      {
        id: "normal-prob-plot",
        name: "Normal Probability Plots",
        chapter: 6,
        description: "Normal probability plots to assess normality",
      },
    ],
  },
  {
    number: 7,
    title: "Point Estimation of Parameters",
    topics: [
      {
        id: "unbiased-estimators",
        name: "Unbiased Estimators",
        chapter: 7,
        description: "Unbiased estimators and their properties",
      },
      {
        id: "estimator-variance",
        name: "Variance of Estimators",
        chapter: 7,
        description: "Variance of a point estimator, efficiency",
      },
      {
        id: "standard-error",
        name: "Standard Error",
        chapter: 7,
        description: "Standard error of a point estimator",
      },
      {
        id: "mse",
        name: "Mean Square Error",
        chapter: 7,
        description: "Mean square error of point estimators",
      },
      {
        id: "sampling-distributions",
        name: "Sampling Distributions",
        chapter: 7,
        description: "Sampling distributions and their properties",
      },
      {
        id: "clt",
        name: "Central Limit Theorem",
        chapter: 7,
        description: "Sampling distribution of means, Central Limit Theorem",
      },
    ],
  },
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
  return `You are a statistics tutor for an engineering statistics course covering Chapters 1-4 and 6-10.

TOPICS YOU COVER:
- Chapter 1: Role of Statistics in Engineering (variability, study types, designed experiments, models)
- Chapter 2: Probability (sample space, events, conditional probability, independence, Bayes' theorem)
- Chapter 3: Discrete Random Variables (PMF, CDF, Binomial, Poisson, Geometric, Hypergeometric)
- Chapter 4: Continuous Random Variables (PDF, Uniform, Normal, Exponential, Gamma, Weibull, normal approximation)
- Chapter 6: Random Sampling and Data Description (sampling, histograms, box plots, normal probability plots)
- Chapter 7: Point Estimation (unbiased estimators, standard error, MSE, sampling distributions, CLT)
- Chapter 8: Confidence Intervals (mean, variance, proportion, tolerance & prediction intervals)
- Chapter 9: Hypothesis Testing (z-test, t-test, chi-square test on variance)
- Chapter 10: Two-Sample Inference (difference in means, paired t-test, F-test, two proportions)

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
