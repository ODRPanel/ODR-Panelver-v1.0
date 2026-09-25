import "server-only";

/** Stub for a video-conferencing API/SDK embed (Section 7.2 of the
 * SOW/SRS). Returns a locally-hosted placeholder link so the Hearings
 * module (5.3) has something real to store and display. */
export async function createHearingRoomLink(hearingId: string): Promise<string> {
  return `simulated-video://local-evaluation-build/room/${hearingId}`;
}
