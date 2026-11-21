export class GameAccessError extends Error {}

export function inviteError(message: string): { title: string; detail: string } {
  const text = message.toLowerCase();
  if (text.includes("session")) return { title: "Your session needs refreshing", detail: "Refresh this page, then open the invite again. Your saved words stay on this device." };
  if (text.includes("already_in_game") || text.includes("already in")) return { title: "Invite unavailable", detail: "This invitation could not be matched to your game. Your other games are still available in the lobby." };
  if (text.includes("game_full") || text.includes("full")) return { title: "This game is full", detail: "Both places are taken. Ask your friend to create another game." };
  if (text.includes("not_found") || text.includes("not found") || text.includes("expired") || text.includes("invalid token")) return { title: "Invite unavailable", detail: "This link is no longer available. Ask your friend for a new invite." };
  if (text.includes("game_started") || text.includes("already started")) return { title: "This round has ended", detail: "Ask your friend to start a new round and share its invite." };
  return { title: "Could not connect", detail: "Check your connection and try again. Your invitation has not been changed." };
}
