export type AnswerableQuestion = { question_key: string; choices: unknown };

export function isQuestionAnswered(
  question: AnswerableQuestion,
  answers: Record<string, number>,
): boolean {
  const answer = answers[question.question_key];
  return (
    Object.hasOwn(answers, question.question_key) &&
    Number.isInteger(answer) &&
    Array.isArray(question.choices) &&
    answer >= 0 &&
    answer < question.choices.length
  );
}

/** Keep the rendered order, so Submit takes the student to the first omission. */
export function getUnansweredQuestions<T extends AnswerableQuestion>(
  questions: T[],
  answers: Record<string, number>,
): T[] {
  return questions.filter((question) => !isQuestionAnswered(question, answers));
}
