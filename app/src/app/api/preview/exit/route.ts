import { CRAFT_PREVIEW_TOKEN_COOKIE } from "@/lib/craft/preview";
import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const draft = await draftMode();
  draft.disable();

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(CRAFT_PREVIEW_TOKEN_COOKIE);

  return response;
};
