import { NextResponse } from 'next/server';
import { MEMES_CHANNEL_ID, NEYNAR_API_KEY } from '~/lib/constants';

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

interface NeynarCast {
  hash: string;
  text: string;
  embeds: { url: string }[];
  author: {
    username: string;
    pfp_url: string;
  };
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  replies: {
    count: number;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const timeWindow = searchParams.get('time_window') || '12h';

    console.log('Fetching trending memes with params:', {
      channel_id: MEMES_CHANNEL_ID,
      time_window: '24h', // Using 24h as default for more content
      limit: 10,
      cursor: cursor || 'none'
    });

    const apiUrl = new URL('https://api.neynar.com/v2/farcaster/feed/trending');
    apiUrl.searchParams.set('channel_id', MEMES_CHANNEL_ID);
    apiUrl.searchParams.set('time_window', '24h'); // Set to 24h for more trending content
    apiUrl.searchParams.set('limit', '10'); // API requires limit between 1-10
    if (cursor) {
      apiUrl.searchParams.set('cursor', cursor);
    }

    console.log('Constructed API URL:', apiUrl.toString());

    const headers = new Headers();
    if (NEYNAR_API_KEY) {
      headers.append('api_key', NEYNAR_API_KEY);
    }
    headers.append('Content-Type', 'application/json');

    console.log('Making API request to Neynar...');
    const startTime = Date.now();
    const response = await fetch(apiUrl.toString(), {
      headers,
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    console.log(`API request completed in ${Date.now() - startTime}ms`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Neynar API error: ${errorData.message || 'Unknown error'} (Status: ${response.status})`
      );
    }

    const responseData = await response.json();
    console.log('Received API response:', {
      status: response.status,
      castCount: responseData.casts?.length || 0,
      hasNext: !!responseData.next
    });

    const { casts, next } = responseData;

    if (!Array.isArray(casts)) {
      console.error('Invalid casts data format:', responseData);
      throw new Error('Invalid data format from Neynar API');
    }

    // Filter and map the data with proper typing
    const memes = casts
      .filter((cast: NeynarCast) => 
        cast.embeds?.length > 0 && 
        cast.embeds[0].url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      )
      .map((cast: NeynarCast) => ({
        hash: cast.hash,
        text: cast.text,
        imageUrl: cast.embeds[0].url,
        author: {
          username: cast.author.username,
          pfpUrl: cast.author.pfp_url,
        },
        engagement: {
          likes: cast.reactions.likes_count,
          recasts: cast.reactions.recasts_count,
          replies: cast.replies.count,
        },
        timestamp: new Date().toISOString(),
      }));

    return NextResponse.json({ 
      success: true,
      data: {
        memes,
        count: memes.length,
        lastUpdated: new Date().toISOString(),
        nextCursor: next?.cursor,
        timeWindow
      }
    });
  } catch (error) {
    console.error('Error fetching trending memes:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
