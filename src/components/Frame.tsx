"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
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
}

interface DebugLog {
  timestamp: string;
  endpoint: string;
  params: Record<string, any>;
  response: any;
}

function MemeCard({ meme, isActive }: { meme: Meme; isActive: boolean }) {
  return (
    <Card className={`border-neutral-200 bg-white ${isActive ? '' : 'hidden'}`}>
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
        <img
          src={meme.imageUrl}
          alt={meme.text}
          className="w-full max-w-[300px] md:max-w-[600px] h-auto rounded-lg"
          loading="lazy"
        />
        <p className="text-neutral-800 text-sm">{meme.text}</p>
      </CardContent>
    </Card>
  );
}

export default function Frame({ title = PROJECT_TITLE }: { title?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const fetchTrendingMemes = async () => {
    try {
      const endpoint = '/api/trending';
      const params = {
        channel_id: MEMES_CHANNEL_ID,
        time_window: '24h',
        limit: 10
      };
      
      console.log('Fetching trending memes from:', endpoint, 'with params:', params);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log('API Response:', data); // Log full response for debugging
      if (!data?.memes) {
        throw new Error(`Invalid response format from API. Received: ${JSON.stringify(data, null, 2)}`);
      }
      
      setMemes(data.memes);
      setError(null);
      
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
      await fetchTrendingMemes();
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
            className="overflow-y-auto h-[400px] md:h-[500px] snap-y snap-mandatory"
            onScroll={(e) => {
              const index = Math.round(
                e.currentTarget.scrollTop / e.currentTarget.clientHeight
              );
              setCurrentIndex(index);
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
          {memes.length > 0 && (
            <div className="flex flex-col md:flex-row justify-center gap-2 mt-4 w-full max-w-[300px] md:max-w-[600px] mx-auto">
              <PurpleButton
                onClick={() => {
                  scrollRef.current?.scrollBy({
                    top: -scrollRef.current.clientHeight,
                    behavior: 'smooth',
                  });
                }}
                disabled={currentIndex === 0}
              >
                Previous
              </PurpleButton>
              <PurpleButton
                onClick={() => {
                  scrollRef.current?.scrollBy({
                    top: scrollRef.current.clientHeight,
                    behavior: 'smooth',
                  });
                }}
                disabled={currentIndex === memes.length - 1}
              >
                Next
              </PurpleButton>
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
