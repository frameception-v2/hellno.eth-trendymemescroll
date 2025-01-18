import { PROJECT_TITLE } from "~/lib/constants";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;

  const config = {
    accountAssociation: {
      header: "eyJmaWQiOiA4ODcyNDYsICJ0eXBlIjogImN1c3RvZHkiLCAia2V5IjogIjB4N0Q0MDBGRDFGNTkyYkI0RkNkNmEzNjNCZkQyMDBBNDNEMTY3MDRlNyJ9",
      payload: "eyJkb21haW4iOiAiaGVsbG5vZXRoLXRyZW5keW1lbWVzY3JvbGwudmVyY2VsLmFwcCJ9",
      signature: "MHgyZGYwOGMzODE4ZWJlOTNhMDQ0MTNiM2QxYWFjMGVjOTBhMTJmMDQ4MzRhNjQwNjIxYTU3YWExOGQ3ODYyZDc2NTBiYjQwNDc3NGI5MjA1MDk2NDFjZGU0ZWNlZjVmMmI3MThhNDE1NTgyMGZlNjc2Zjg4M2QxNTJmYzU0MDAyZDFi"
    },
    frame: {
      version: "1",
      name: PROJECT_TITLE,
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/frames/hello/opengraph-image`,
      buttonTitle: "Launch Frame",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  return Response.json(config);
}
