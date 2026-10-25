import { z } from 'zod';

export const OBSTACLE_IDS = [
  'lift_broken','stairs_one_way','lift_jam','construction_block','platform_change','crowd_surge',
  'cow_on_bridge','police_check','board_dead','train_arrives_wrong_platform',
  'hunger_crash','upi_failure','no_network','ticket_not_printed','ticket_on_dead_phone',
  'forgot_bag','wrong_coach','overpacked',
  'coach_doesnt_exist','door_wont_open','train_starting','wrong_train','pantry_car','friends_at_wrong_door',
  'chai_spill','trolley_jam','sleeping_passenger','power_cut','vendor_swarm','selfie_crowd',
] as const;
export const SIGNATURE_OBSTACLES = ['lift_broken','platform_change','crowd_surge','cow_on_bridge','police_check','board_dead'] as const;

export const Difficulty = z.enum(['easy', 'normal', 'hard']);
export const Role = z.enum(['scout', 'loader', 'fixer', 'anchor']);
export const Verdict = z.enum(['perfect', 'clean', 'partial', 'solo', 'total_miss']);
export type VerdictType = z.infer<typeof Verdict>;
export const ObstacleId = z.enum(OBSTACLE_IDS);
export type ObstacleIdT = z.infer<typeof ObstacleId>;

const t = z.number().int().min(0).max(160_000); // ms into match

export const TimelineEvent = z.discriminatedUnion('type', [
  z.object({ t, type: z.literal('obstacle_trigger'), obstacleId: ObstacleId }),
  z.object({ t, type: z.literal('ping'), pingId: z.string().max(30), targetRole: Role.optional() }),
  z.object({ t, type: z.literal('friend_stuck'), friendId: z.string().max(30), role: Role }),
  z.object({ t, type: z.literal('friend_rescued'), friendId: z.string().max(30) }),
  z.object({ t, type: z.literal('bag_dropped'), friendId: z.string().max(30) }),
  z.object({ t, type: z.literal('boarded'), entityId: z.string().max(30) }),
  z.object({ t, type: z.literal('left_behind'), entityId: z.string().max(30), role: Role.optional() }),
  z.object({ t, type: z.literal('scout_report'), platform: z.number().int().min(1).max(9), correct: z.boolean() }),
  z.object({ t, type: z.literal('mistake'), role: Role, kind: z.string().max(30) }),
]);
export type TimelineEventT = z.infer<typeof TimelineEvent>;

export const Narrative = z.object({
  headline: z.string().min(1).max(80),
  story: z.string().min(1).max(700),
  punchline: z.string().min(1).max(120),
  tags: z.array(z.string().max(30)).min(1).max(4),
});
export type NarrativeT = z.infer<typeof Narrative>;

export const MatchLogIn = z.object({
  id: z.string().max(40),
  seed: z.string().max(120),
  createdAt: z.string().max(40),
  durationMs: z.number().int().min(0).max(160_000),
  difficulty: Difficulty,
  events: z.array(TimelineEvent).max(200),
  verdict: Verdict,
  boardedCount: z.number().int().min(0).max(5),
  bagsLoaded: z.number().int().min(0).max(20),
  pingsSent: z.number().int().min(0).max(500),
  obstaclesTriggered: z.number().int().min(0).max(30),
});
export type MatchLogT = z.infer<typeof MatchLogIn> & { narrative: NarrativeT | null };

export const StartRequest = z.object({ difficulty: Difficulty.optional() }).default({});
export const AnnounceRequest = z.object({
  matchId: z.string().max(40),
  lang: z.enum(['en', 'hi']).optional(),
  gameStateSnapshot: z.object({
    timeRemaining: z.number().min(0).max(150_000),
    lastObstacle: ObstacleId.nullable(),
    playerCarrying: z.number().int().min(0).max(3),
    stuckFriendRole: Role.nullable(),
  }),
});
export const EndRequest = z.object({ matchId: z.string().max(40), log: MatchLogIn });
