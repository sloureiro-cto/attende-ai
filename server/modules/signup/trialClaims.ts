import 'server-only';
import { sha256Hex } from '../../lib/crypto';
import { TrialClaimModel, type TrialClaimKind } from './models';

const keyOf = (kind: TrialClaimKind, raw: string) => sha256Hex(`${kind}:${raw}`);

/** Atomic reservation. `already_mine` makes a retry idempotent; `taken` = another account used it. */
export async function reserveTrialClaim(kind: TrialClaimKind, raw: string, userId: string): Promise<'reserved' | 'already_mine' | 'taken'> {
  const key = keyOf(kind, raw);
  try {
    await TrialClaimModel.create({ kind, key, userId, status: 'reserved' });
    return 'reserved';
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const existing = await TrialClaimModel.findOne({ kind, key }).select('userId').lean();
    return existing?.userId === userId ? 'already_mine' : 'taken';
  }
}

/** Frees what a failed attempt reserved, so the user can retry with another card. */
export const releaseTrialClaim = (kind: TrialClaimKind, raw: string, userId: string) =>
  TrialClaimModel.deleteOne({ kind, key: keyOf(kind, raw), userId, status: 'reserved' });

export const consumeTrialClaim = (kind: TrialClaimKind, raw: string, userId: string, workspaceId: string) =>
  TrialClaimModel.updateOne({ kind, key: keyOf(kind, raw), userId }, { $set: { status: 'consumed', workspaceId } });
