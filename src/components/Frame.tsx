"use client";

import { useEffect, useCallback, useState, useRef } from "react";

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function(...args: Parameters<T>) {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import { Card } from "~/components/ui/card";
import { CardHeader } from "~/components/ui/card";
import { CardTitle } from "~/components/ui/card";
import { CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { MEMES_CHANNEL_ID, NEYNAR_API_KEY, DEBUG_MODE } from "~/lib/constants";

import { config } from "~/components/providers/WagmiProvider";
import { PurpleButton } from "~/components/ui/PurpleButton";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

interface Meme {
  hash: string;
  text: string;
  imageUrl: string;
  author: {
    username: string;
    pfpUrl: string;
  };
  engagement: {
    likes: number;
    recasts: number;
    replies: number;
  };
  timestamp: string;
}

interface DebugLog {
  timestamp: string;
  endpoint: string;
  params: Record<string, any>;
  response: any;
}

function MemeCard({ meme, isActive }: { meme: Meme; isActive: boolean }) {
  return (
    <Card className={`border-neutral-200 bg-white shadow-none ${isActive ? '' : 'hidden'}`}>
      <div className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="text-purple-600">
            <img
              src={meme.author.pfpUrl}
              alt={meme.author.username}
              className={cn("w-8 h-8 rounded-full")}
            />
          </div>
          <CardTitle className="text-neutral-900">{meme.author.username}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative w-full h-[90vh] flex items-center justify-center">
          <img
            src={meme.imageUrl}
            alt={meme.text}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: 'min(100vw, 1200px)',
              maxHeight: '90vh',
            }}
            loading="eager"
            onError={(e) => {
              e.currentTarget.src = meme.author.pfpUrl;
              e.currentTarget.className = 'w-full h-full object-contain rounded-lg';
            }}
          />
          <div className="absolute bottom-2 right-2 bg-black/75 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
            {new Date(meme.timestamp).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-4 text-sm mt-2">
          <span>❤️ {meme.engagement.likes}</span>
          <span>🔁 {meme.engagement.recasts}</span>
          <span>💬 {meme.engagement.replies}</span>
        </div>
        <p className="text-neutral-800 text-sm">{meme.text}</p>
      </CardContent>
    </Card>
  );
}

export default function Frame({ title = PROJECT_TITLE }: { title?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  // Debounced scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) < SCROLL_THRESHOLD;
    
    if (isNearBottom) {
      fetchTrendingMemes(false);
    }
  }, [isLoadingMore, hasMore]);

  // Add scroll event listener
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const debouncedScroll = debounce(handleScroll, SCROLL_DEBOUNCE);
    container.addEventListener('scroll', debouncedScroll);
    return () => container.removeEventListener('scroll', debouncedScroll);
  }, [handleScroll]);

  const fetchTrendingMemes = async (initialLoad = true) => {
    try {
      if (isLoadingMore || (!initialLoad && !hasMore)) return;
      setIsLoadingMore(true);
      
      const endpoint = '/api/trending';
      const params = {
        channel_id: MEMES_CHANNEL_ID,
        time_window: '24h',
        limit: 10,
        cursor: initialLoad ? undefined : cursor
      };
      
      console.log('Fetching trending memes from:', endpoint, 'with params:', params);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('API Response:', data); // Log full response for debugging
      if (!data?.data?.memes) {
        throw new Error(`Invalid response format from API. Received: ${JSON.stringify(data, null, 2)}`);
      }
      
      // Transform API response to match our Meme interface
      const formattedMemes = data.data.memes.map((meme: any) => ({
        hash: meme.hash,
        text: meme.text,
        imageUrl: meme.imageUrl,
        author: {
          username: meme.author.username,
          pfpUrl: meme.author.pfpUrl
        },
        engagement: {
          likes: meme.engagement.likes,
          recasts: meme.engagement.recasts,
          replies: meme.engagement.replies
        },
        timestamp: meme.timestamp
      }));
      
      setMemes(prev => initialLoad ? formattedMemes : [...prev, ...formattedMemes]);
      setError(null);
      setCursor(data.data?.cursor);
      setHasMore(formattedMemes.length > 0);
      
      if (DEBUG_MODE) {
        setDebugLogs(prev => [{
          timestamp: new Date().toISOString(),
          endpoint,
          params,
          response: data
        }, ...prev].slice(0, 5)); // Keep last 5 logs
      }
    } catch (error) {
      console.error('Error fetching memes:', error);
      const errorMessage = error instanceof Error ? 
        `${error.message}\n\nPlease check:\n1. NEYNAR_API_KEY is set\n2. API endpoint is correct\n3. Network connection` : 
        'Failed to load memes';
      setError(errorMessage);
      setMemes([]);
      
      if (DEBUG_MODE) {
        setDebugLogs(prev => [{
          timestamp: new Date().toISOString(),
          endpoint: '/api/trending',
          params: {},
          response: { error: error instanceof Error ? error.message : 'Unknown error' }
        }, ...prev].slice(0, 5));
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchTrendingMemes(true);
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-full max-w-[300px] md:max-w-[600px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-neutral-900">{title}</h1>
        {error ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800">
            <p className="font-medium">Error loading memes:</p>
            <p>{error}</p>
            <p className="mt-2 text-sm">
              Please check your API key configuration and try again.
            </p>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            className="overflow-y-auto h-[calc(100vh-100px)] snap-y snap-mandatory scroll-smooth"
            style={{
              scrollSnapType: 'y mandatory',
              scrollBehavior: 'smooth',
              height: 'calc(100vh - 100px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
          {error ? (
            <div className="text-center text-red-500 py-8">
              Error loading memes: {error}
            </div>
          ) : memes.length > 0 ? (
            memes.map((meme, index) => (
              <div 
                key={meme.hash}
                className="snap-start h-full"
              >
                <MemeCard meme={meme} isActive={index === currentIndex} />
              </div>
            ))
          ) : (
            <div className="text-center text-neutral-500 py-8">Loading memes...</div>
          )}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          )}
          </div>
        )}
        
        {DEBUG_MODE && debugLogs.length > 0 && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">Debug Logs</h3>
            {debugLogs.map((log, index) => (
              <div key={index} className="mb-4 p-2 bg-white rounded">
                <div className="text-sm text-gray-600">{log.timestamp}</div>
                <div className="font-medium">Endpoint: {log.endpoint}</div>
                <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                  Params: {JSON.stringify(log.params, null, 2)}
                </pre>
                <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                  Response: {JSON.stringify(log.response, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
