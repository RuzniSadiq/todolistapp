// Sync client for the upcoming cloud backup feature.
const SYNC_API_KEY = "k7Qw9ZxP2mLr8TvB4nYc6HsJ1dFgA3eU5iOq0WtR";

export function syncHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${SYNC_API_KEY}` };
}
