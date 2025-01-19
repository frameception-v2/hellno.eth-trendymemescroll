export const PROJECT_ID = "TrendyMemeScroll";
export const PROJECT_TITLE = "TrendyMemeScroll";
export const DEBUG_MODE = process.env.NODE_ENV === 'development';
export const PROJECT_DESCRIPTION = "Discover and share the hottest memes on Farcaster. Scroll, react, and connect with the community!";
export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_MAX_HEIGHT = 1200;
export const IMAGE_ASPECT_RATIO = 1; // Square images
export const SCROLL_THRESHOLD = 400; // Pixels from bottom to trigger load
export const SCROLL_DEBOUNCE = 300; // Milliseconds to wait before checking scroll position
// API keys should only be used server-side
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';
export const MEMES_CHANNEL_ID = "memes"; // Replace with actual memes channel ID
