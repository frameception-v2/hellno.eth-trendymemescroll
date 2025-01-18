import { NextResponse } from 'next/server';
import { MEMES_CHANNEL_ID, NEYNAR_API_KEY } from '~/lib/constants';

export async function GET() {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/trending?channel_id=${MEMES_CHANNEL_ID}&time_window=7d`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data?.casts) {
      throw new Error('Invalid data format from API');
    }
    
    const memes = data.casts
      .filter((cast: any) => cast.embeds?.length > 0)
      .map((cast: any) => ({
        hash: cast.hash,
        text: cast.text,
        imageUrl: cast.embeds[0].url,
        author: {
          username: cast.author.username,
          pfpUrl: cast.author.pfp_url,
        },
      }));
    
    return NextResponse.json({ memes });
  } catch (error) {
    console.error('Error fetching trending memes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending memes' },
      { status: 500 }
    );
  }
}
