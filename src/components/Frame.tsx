"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

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

function MemeCard({ meme, isActive }: { meme: Meme; isActive: boolean }) {
  return (
    <Card className={`border-neutral-200 bg-white ${isActive ? '' : 'hidden'}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <img
            src={meme.author.pfpUrl}
            alt={meme.author.username}
            className={cn("w-8 h-8 rounded-full", "text-purple-600")}
          />
          <CardTitle className="text-neutral-900">{meme.author.username}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <img
          src={meme.imageUrl}
          alt={meme.text}
          className="w-full h-auto rounded-lg"
          loading="lazy"
        />
        <p className="text-neutral-800 text-sm">{meme.text}</p>
      </CardContent>
    </Card>
  );
}

export default function Frame({ title }: { title?: string } = { title: PROJECT_TITLE }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

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
      const response = await fetch(
        `https://api.neynar.com/v1/farcaster/channel/${MEMES_CHANNEL_ID}/casts?time=hour`,
        {
          headers: {
            'api_key': NEYNAR_API_KEY,
          },
        }
      );
      
      const data = await response.json();
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
      
      setMemes(memes);
    } catch (error) {
      console.error('Error fetching memes:', error);
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
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-neutral-900">{title}</h1>
        <div 
          ref={scrollRef}
          className="overflow-y-auto h-[500px] snap-y snap-mandatory"
          onScroll={(e) => {
            const index = Math.round(
              e.currentTarget.scrollTop / e.currentTarget.clientHeight
            );
            setCurrentIndex(index);
          }}
        >
          {memes.map((meme, index) => (
            <div 
              key={meme.hash}
              className="snap-start h-full"
            >
              <MemeCard meme={meme} isActive={index === currentIndex} />
            </div>
          ))}
        </div>
        
        <div className="flex justify-center gap-2 mt-4">
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
      </div>
    </div>
  );
}
