/**
 * Pure state rules for the one-question-at-a-time dock. The draft shape matches the saved
 * sessionStorage draft: { [questionId]: { choice: optionId | 'custom' | '', custom: string } }.
 * @typedef {{id:string,required:boolean,options:{id:string,label:string}[]}} Item
 * @typedef {Record<string,{choice:string,custom:string}>} Draft
 */
/** @param {Item} item @param {Draft} draft */
export function answerValue(item, draft) {
  const entry = draft[item.id];
  if (!entry) return undefined;
  const text = entry.choice === 'custom' || !item.options.length ? entry.custom.trim() : item.options.find((option) => option.id === entry.choice)?.label;
  return text || undefined;
}

/** A multi-question dock ends with a review step; a single question submits directly. @param {Item[]} items */
export const reviewStep = (items) => (items.length > 1 ? items.length : -1);

/** @param {Item[]} items @param {Draft} draft @param {number} step */
export const canAdvance = (items, draft, step) => step >= items.length || !items[step].required || Boolean(answerValue(items[step], draft));

/** @param {Item[]} items @param {Draft} draft */
export const canSubmit = (items, draft) => items.every((item) => !item.required || answerValue(item, draft)) && items.some((item) => answerValue(item, draft));

/** Next step, or the same step when the current answer is required and missing. */
export const nextStep = (items, draft, step) => (canAdvance(items, draft, step) ? Math.min(step + 1, reviewStep(items) === -1 ? items.length - 1 : items.length) : step);
export const backStep = (step) => Math.max(0, step - 1);

/** First step that still needs an answer (used to resume a saved draft). */
export function firstOpenStep(items, draft) {
  const index = items.findIndex((item) => item.required && !answerValue(item, draft));
  return index === -1 ? 0 : index;
}

/** Exact payload `replyToQuestion` has always received. @param {{id:string,version?:number}} question @param {Item[]} items @param {Draft} draft */
export function buildPayload(question, items, draft) {
  if (!question.version) return { question_id: question.id, answer: answerValue(items[0], draft) };
  const answers = items.filter((item) => answerValue(item, draft)).map((item) => ({
    question_id: item.id,
    ...(draft[item.id]?.choice !== 'custom' && item.options.length ? { option_id: draft[item.id].choice } : { value: draft[item.id]?.custom.trim() }),
  }));
  return { question_id: question.id, question_version: question.version, answers };
}
