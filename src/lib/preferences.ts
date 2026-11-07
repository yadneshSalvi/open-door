import { z } from "zod";
export const preferenceProposalSchema=z.object({
  summary:z.string().max(500),
  locks:z.array(z.object({objectId:z.string(),locked:z.boolean()}).strict()).max(24),
  clearanceCm:z.number().min(0).max(40).nullable(),
  deviceWidthCm:z.number().min(30).max(180).nullable(),
  deviceLengthCm:z.number().min(40).max(250).nullable(),
  allowReverse:z.boolean().nullable(),
  unassessed:z.array(z.string().max(250)).max(8),
}).strict();
export type PreferenceProposal=z.infer<typeof preferenceProposalSchema>;
export function validateProposal(value:unknown,allowedIds:string[]):PreferenceProposal{
  const proposal=preferenceProposalSchema.parse(value);
  const ids=new Set<string>();
  for(const lock of proposal.locks){if(!allowedIds.includes(lock.objectId)||ids.has(lock.objectId))throw new Error("Unknown or duplicate object in preference proposal.");ids.add(lock.objectId);}
  return proposal;
}
