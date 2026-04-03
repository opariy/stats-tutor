export type Topic = {
  id: string;
  name: string;
  chapter: number;
  description: string;
  suggestions?: string[];
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
        suggestions: ["Why is variability important in engineering?", "How do statistics help in quality control?"],
      },
      {
        id: "study-types",
        name: "Enumerative vs Analytical Studies",
        chapter: 1,
        description: "Enumerative and analytical studies, data collection methods",
        suggestions: ["What's the difference between enumerative and analytical studies?", "When should I use each type of study?"],
      },
      {
        id: "designed-experiments",
        name: "Designed Experiments",
        chapter: 1,
        description: "Advantages of designed experiments over observational studies",
        suggestions: ["Why are designed experiments better than observational studies?", "What makes an experiment well-designed?"],
      },
      {
        id: "models",
        name: "Mechanistic vs Empirical Models",
        chapter: 1,
        description: "Mechanistic and empirical models, probability models in engineering",
        suggestions: ["When should I use a mechanistic vs empirical model?", "How do probability models apply to engineering?"],
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
        suggestions: ["How do I define a sample space?", "What's the difference between an event and an outcome?"],
      },
      {
        id: "addition-rule",
        name: "Rule of Addition",
        chapter: 2,
        description: "Addition rule for probability, mutually exclusive events",
        suggestions: ["When can I just add probabilities?", "What does mutually exclusive mean?"],
      },
      {
        id: "conditional-prob",
        name: "Conditional Probability",
        chapter: 2,
        description: "Conditional probability, multiplication rule, total probability",
        suggestions: ["How do I calculate P(A|B)?", "When do I use the multiplication rule?"],
      },
      {
        id: "independence",
        name: "Independence",
        chapter: 2,
        description: "Independent events and their properties",
        suggestions: ["How do I know if events are independent?", "Does independent mean mutually exclusive?"],
      },
      {
        id: "bayes-theorem",
        name: "Bayes' Theorem",
        chapter: 2,
        description: "Bayes' theorem and its applications",
        suggestions: ["When should I use Bayes' theorem?", "How do I set up a Bayes' theorem problem?"],
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
        suggestions: ["What makes something a random variable?", "Discrete vs continuous random variables?"],
      },
      {
        id: "pmf-cdf",
        name: "PMF and CDF",
        chapter: 3,
        description: "Probability mass function and cumulative distribution functions",
        suggestions: ["What's the difference between PMF and CDF?", "How do I find P(X ≤ k) from a PMF?"],
      },
      {
        id: "discrete-mean-var",
        name: "Mean and Variance",
        chapter: 3,
        description: "Mean and variance of a discrete random variable",
        suggestions: ["How do I calculate expected value E(X)?", "What's the formula for variance of a discrete RV?"],
      },
      {
        id: "binomial",
        name: "Binomial Distribution",
        chapter: 3,
        description: "Binomial distribution, parameters n and p, applications",
        suggestions: ["When do I use the binomial distribution?", "How do I calculate binomial probabilities?"],
      },
      {
        id: "poisson",
        name: "Poisson Distribution",
        chapter: 3,
        description: "Poisson distribution, rate parameter λ, applications",
        suggestions: ["When should I use Poisson vs Binomial?", "How do I find λ for a Poisson problem?"],
      },
      {
        id: "geometric",
        name: "Geometric Distribution",
        chapter: 3,
        description: "Geometric distribution, waiting for first success",
        suggestions: ["What's the memoryless property?", "Geometric vs Binomial: when to use which?"],
      },
      {
        id: "hypergeometric",
        name: "Hypergeometric Distribution",
        chapter: 3,
        description: "Hypergeometric distribution, sampling without replacement",
        suggestions: ["When do I use hypergeometric vs binomial?", "How do I set up a hypergeometric problem?"],
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
        suggestions: ["How is PDF different from PMF?", "Why is P(X = x) = 0 for continuous RVs?"],
      },
      {
        id: "continuous-cdf",
        name: "CDF for Continuous RVs",
        chapter: 4,
        description: "Cumulative distribution functions for continuous variables",
        suggestions: ["How do I get PDF from CDF?", "How do I find P(a < X < b)?"],
      },
      {
        id: "continuous-mean-var",
        name: "Mean and Variance",
        chapter: 4,
        description: "Mean and variance of a continuous random variable",
        suggestions: ["How do I integrate to find E(X)?", "What's E(X²) used for?"],
      },
      {
        id: "uniform",
        name: "Uniform Distribution",
        chapter: 4,
        description: "Uniform distribution on interval [a, b]",
        suggestions: ["What's the PDF of uniform distribution?", "How do I find mean and variance of uniform?"],
      },
      {
        id: "normal",
        name: "Normal Distribution",
        chapter: 4,
        description: "Normal distribution, standard normal, z-scores",
        suggestions: ["How do I convert to z-scores?", "How do I use the z-table?"],
      },
      {
        id: "exponential",
        name: "Exponential Distribution",
        chapter: 4,
        description: "Exponential distribution, memoryless property",
        suggestions: ["What's the memoryless property?", "Exponential vs Poisson: what's the relationship?"],
      },
      {
        id: "gamma-erlang",
        name: "Gamma and Erlang Distributions",
        chapter: 4,
        description: "Gamma distribution, Erlang as special case",
        suggestions: ["When do I use Gamma distribution?", "What makes Erlang special?"],
      },
      {
        id: "weibull",
        name: "Weibull Distribution",
        chapter: 4,
        description: "Weibull distribution for reliability analysis",
        suggestions: ["When do I use Weibull?", "What do the shape and scale parameters mean?"],
      },
      {
        id: "normal-approx",
        name: "Normal Approximation",
        chapter: 4,
        description: "Normal approximation to Binomial and Poisson distributions",
        suggestions: ["When can I approximate Binomial with Normal?", "Do I need continuity correction?"],
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
        suggestions: ["Why is random sampling important?", "What's the difference between sample and population?"],
      },
      {
        id: "data-summary",
        name: "Data Summary and Display",
        chapter: 6,
        description: "Summarizing and displaying data, descriptive statistics",
        suggestions: ["What are the key measures of central tendency?", "How do I describe spread?"],
      },
      {
        id: "stem-leaf",
        name: "Stem-and-Leaf Diagrams",
        chapter: 6,
        description: "Creating and interpreting stem-and-leaf diagrams",
        suggestions: ["How do I create a stem-and-leaf plot?", "What can I learn from a stem-and-leaf?"],
      },
      {
        id: "histograms",
        name: "Frequency Distributions and Histograms",
        chapter: 6,
        description: "Frequency distributions, histograms, and their interpretation",
        suggestions: ["How do I choose bin width?", "What shapes indicate about the data?"],
      },
      {
        id: "box-plots",
        name: "Box Plots",
        chapter: 6,
        description: "Box plots, quartiles, identifying outliers",
        suggestions: ["How do I identify outliers in a box plot?", "What are the quartile formulas?"],
      },
      {
        id: "time-sequence",
        name: "Time Sequence Plots",
        chapter: 6,
        description: "Time sequence plots for temporal data",
        suggestions: ["What patterns should I look for?", "How do I detect trends?"],
      },
      {
        id: "normal-prob-plot",
        name: "Normal Probability Plots",
        chapter: 6,
        description: "Normal probability plots to assess normality",
        suggestions: ["How do I read a normal probability plot?", "What does deviation from the line mean?"],
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
        suggestions: ["What makes an estimator unbiased?", "Is sample mean unbiased for population mean?"],
      },
      {
        id: "estimator-variance",
        name: "Variance of Estimators",
        chapter: 7,
        description: "Variance of a point estimator, efficiency",
        suggestions: ["What is efficiency of an estimator?", "How do I compare two estimators?"],
      },
      {
        id: "standard-error",
        name: "Standard Error",
        chapter: 7,
        description: "Standard error of a point estimator",
        suggestions: ["What's the difference between SE and SD?", "How do I calculate standard error?"],
      },
      {
        id: "mse",
        name: "Mean Square Error",
        chapter: 7,
        description: "Mean square error of point estimators",
        suggestions: ["What's the formula for MSE?", "How does MSE relate to bias and variance?"],
      },
      {
        id: "sampling-distributions",
        name: "Sampling Distributions",
        chapter: 7,
        description: "Sampling distributions and their properties",
        suggestions: ["What is a sampling distribution?", "Why does sample size matter?"],
      },
      {
        id: "clt",
        name: "Central Limit Theorem",
        chapter: 7,
        description: "Sampling distribution of means, Central Limit Theorem",
        suggestions: ["What does the CLT tell us?", "When can I apply the CLT?"],
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
        suggestions: ["What's the formula for CI with known variance?", "How do I find the z-value for 95% CI?"],
      },
      {
        id: "ci-mean-var-unknown",
        name: "CI on Mean (Variance Unknown)",
        chapter: 8,
        description: "Confidence interval on the mean of a Normal distribution when variance is unknown (t-distribution)",
        suggestions: ["When do I use t-distribution vs z?", "How do I find degrees of freedom?"],
      },
      {
        id: "ci-variance",
        name: "CI on Population Variance",
        chapter: 8,
        description: "Confidence interval on the variance of a Normal distribution (chi-square distribution)",
        suggestions: ["How do I construct a CI for variance?", "Why is the CI for variance not symmetric?"],
      },
      {
        id: "ci-proportion",
        name: "CI on Population Proportion",
        chapter: 8,
        description: "Confidence interval on a population proportion for large samples",
        suggestions: ["What's the formula for CI on proportion?", "When is the sample size large enough?"],
      },
      {
        id: "tolerance-interval",
        name: "Tolerance Intervals",
        chapter: 8,
        description: "Intervals that contain a specified proportion of the population",
        suggestions: ["What's the difference between tolerance and confidence intervals?", "How do I use tolerance tables?"],
      },
      {
        id: "prediction-interval",
        name: "Prediction Intervals",
        chapter: 8,
        description: "Intervals for predicting a future observation",
        suggestions: ["How is a prediction interval different from a CI?", "Why are prediction intervals wider?"],
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
        suggestions: ["What's the difference between Type I and Type II errors?", "How do I interpret a p-value?"],
      },
      {
        id: "test-mean-var-known",
        name: "Test on Mean (Variance Known)",
        chapter: 9,
        description: "Z-test for the mean when population variance is known",
        suggestions: ["How do I set up a z-test?", "When do I reject the null hypothesis?"],
      },
      {
        id: "test-mean-var-unknown",
        name: "Test on Mean (Variance Unknown)",
        chapter: 9,
        description: "t-test for the mean when population variance is unknown",
        suggestions: ["When do I use t-test vs z-test?", "How do I find the critical t-value?"],
      },
      {
        id: "test-variance",
        name: "Tests on Variance and Std Dev",
        chapter: 9,
        description: "Chi-square test for variance of a Normal distribution",
        suggestions: ["How do I test a claim about variance?", "What are the chi-square critical values?"],
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
        suggestions: ["How do I test if two means are different?", "What's the formula for SE of difference?"],
      },
      {
        id: "two-means-var-unknown",
        name: "Difference in Means (Variances Unknown)",
        chapter: 10,
        description: "Inference for the difference between two means when variances are unknown",
        suggestions: ["Pooled vs unpooled variance: when to use which?", "How do I find degrees of freedom?"],
      },
      {
        id: "paired-t-test",
        name: "Paired t-Test",
        chapter: 10,
        description: "Test for paired or matched samples",
        suggestions: ["When should I use a paired t-test?", "How do I set up paired data?"],
      },
      {
        id: "two-variances",
        name: "Inference on Two Variances",
        chapter: 10,
        description: "F-test for comparing variances of two Normal distributions",
        suggestions: ["How does the F-test work?", "What are the F distribution parameters?"],
      },
      {
        id: "two-proportions",
        name: "Inference on Two Proportions",
        chapter: 10,
        description: "Comparing proportions from two populations",
        suggestions: ["How do I test if two proportions are equal?", "What's the pooled proportion?"],
      },
    ],
  },
];

export const allTopics = chapters.flatMap((ch) => ch.topics);

export function getTopicById(id: string): Topic | undefined {
  return allTopics.find((t) => t.id === id);
}

export function getTopicSuggestions(topicId: string | null): string[] {
  if (!topicId) {
    // Default suggestions for general chat
    return [
      "What's the difference between Type I and Type II errors?",
      "When do I use t-test vs z-test?",
      "Explain confidence intervals",
    ];
  }
  const topic = getTopicById(topicId);
  return topic?.suggestions || [
    `Help me understand ${topic?.name || "this topic"}`,
    "Can you give me a practice problem?",
  ];
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
