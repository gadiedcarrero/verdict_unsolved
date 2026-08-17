import { z } from 'zod';

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
});

export const EvidenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  discovered: z.boolean(),
  tags: z.array(z.string()),
  relatedEntityIds: z.array(z.string()),
  assetPath: z.string().optional(),
});

export const CaseRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  reportedAt: z.string(),
  author: z.string(),
});

export const ConversationMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  sentAt: z.string(),
});

export const TimelineEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  endTimestamp: z.string().optional(),
  kind: z.enum(['camera', 'access', 'ping', 'event']),
  label: z.string(),
  relatedEvidenceId: z.string().optional(),
});

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  relatedEntityIds: z.array(z.string()),
});

export const ConclusionRequirementSchema = z.object({
  questionId: z.string(),
  acceptedAnswerIds: z.array(z.string()),
  requiredEvidenceIds: z.array(z.string()),
});

export const CaseEndingSchema = z.object({
  id: z.string(),
  requirements: z.array(ConclusionRequirementSchema),
  rewardMoney: z.number(),
  rewardReputation: z.number(),
  outcomeMessage: z.string(),
});

export const CaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  clientName: z.string(),
  premise: z.string(),
  initialQuestion: z.string(),
  targetDurationMinutes: z.tuple([z.number(), z.number()]),
});

export const CaseBundleSchema = z.object({
  case: CaseSchema,
  characters: z.array(CharacterSchema),
  evidence: z.array(EvidenceSchema),
  records: z.array(CaseRecordSchema),
  conversations: z.array(ConversationMessageSchema),
  conclusions: z.array(CaseEndingSchema),
  timelineEvents: z.array(TimelineEventSchema),
  locations: z.array(LocationSchema),
});

export type Character = z.infer<typeof CharacterSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type CaseRecord = z.infer<typeof CaseRecordSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type ConclusionRequirement = z.infer<typeof ConclusionRequirementSchema>;
export type CaseEnding = z.infer<typeof CaseEndingSchema>;
export type Case = z.infer<typeof CaseSchema>;
export type CaseBundle = z.infer<typeof CaseBundleSchema>;
