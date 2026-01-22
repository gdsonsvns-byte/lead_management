export const DEFAULT_NEXT_ACTIONS = [
  { label: "Client Converted", status: "COMPLETED", order: 1, autoApplyOnFirstFollowUp: false },
  { label: "Client not Interested", status: "CANCELLED", order: 2, autoApplyOnFirstFollowUp: false },
  { label: "Put on Backburner", status: "SKIPPED", order: 3, autoApplyOnFirstFollowUp: false },
  { label: "Client will Call", status: "PENDING", order: 4, autoApplyOnFirstFollowUp: false },
  { label: "Client will Visit", status: "PENDING", order: 5, autoApplyOnFirstFollowUp: false },
  { label: "Client will Message", status: "PENDING", order: 6, autoApplyOnFirstFollowUp: false },
  { label: "Call Client", status: "PENDING", order: 7, autoApplyOnFirstFollowUp: true },
  { label: "Message Client", status: "PENDING", order: 8, autoApplyOnFirstFollowUp: false },
  { label: "Visit Client", status: "PENDING", order: 9, autoApplyOnFirstFollowUp: false },
];