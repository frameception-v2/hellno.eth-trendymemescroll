export const PROJECT_ID = "TrendyMemeScroll";
export const PROJECT_TITLE = "TrendyMemeScroll";
export const PROJECT_DESCRIPTION = "Discover and share the hottest memes on Farcaster. Scroll, react, and connect with the community!";
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
if (!NEYNAR_API_KEY) {
  console.error("NEYNAR_API_KEY is not set in environment variables");
}
export const MEMES_CHANNEL_ID = "memes"; // Replace with actual memes channel ID
