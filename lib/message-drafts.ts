export interface DraftableAction {
  kind: string;
  title: string;
  detail: string | null;
}

export function actionDraftMessage(action: DraftableAction): string {
  const subject = cleanTitle(action.title);

  switch (action.kind) {
    case "lead_response":
      return "Hi, thanks for reaching out. I’m following up on your enquiry. How can I help you today?";
    case "quote_followup":
      return `Hi, I’m just following up on ${subject}. Did you have a chance to review it, or is there anything I can clarify before we move forward?`;
    case "quote_expired":
      return `Hi, I’m checking in on ${subject}. The quote has expired, but I can re-check the details and confirm the next step if you are still interested.`;
    case "invoice_chase":
      return `Hi, I’m following up on ${subject}. Please let me know when payment will be made, or if there is anything we need to resolve.`;
    case "promise_check":
      return `Hi, I’m checking whether the promised payment for ${subject} has been made. Please confirm when you can.`;
    default:
      return `Hi, I’m following up on ${subject}. Please let me know the next step.`;
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/^Follow up\s+/i, "")
    .replace(/^Chase\s+/i, "")
    .replace(/^Reply to\s+/i, "")
    .replace(/^Check\s+/i, "")
    .trim();
}
