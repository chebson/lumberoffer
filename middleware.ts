import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything under /app needs a login. Buyer pages (/o), the open pixel and unsubscribe stay public.
const isProtected = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
