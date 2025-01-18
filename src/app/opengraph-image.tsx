import { ImageResponse } from "next/og";
import { PROJECT_TITLE, PROJECT_DESCRIPTION } from "~/lib/constants";

export const alt = "Farcaster Frames V2 Demo";
export const size = {
  width: 600,
  height: 400,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div tw="h-full w-full flex flex-col justify-center items-center relative bg-gradient-to-br from-purple-600 to-indigo-800">
        <div tw="flex flex-col items-center p-8 bg-white/90 rounded-2xl shadow-2xl">
          <h1 tw="text-6xl font-bold text-purple-900 mb-4">{PROJECT_TITLE}</h1>
          <h3 tw="text-2xl text-purple-800 text-center max-w-[80%]">{PROJECT_DESCRIPTION}</h3>
          <div tw="mt-8 flex items-center">
            <span tw="text-xl text-purple-700 mr-2">Powered by</span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 22H22L12 2Z"
                fill="currentColor"
                tw="text-purple-600"
              />
            </svg>
            <span tw="text-xl font-bold text-purple-600">Farcaster Frames</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
