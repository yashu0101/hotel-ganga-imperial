import type { Instrumentation } from "next";

// Every unhandled server error (pages, route handlers) is logged as one JSON line with the route, so it can be
// found in Vercel logs and alerted on through a log drain. To add Sentry or similar later, report from here too.
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const message = error instanceof Error ? error.name + ": " + error.message : String(error);
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      event: "request.unhandled_error",
      time: new Date().toISOString(),
      error: message,
      digest,
      method: request.method,
      path: request.path.split("?")[0],
      route: context.routePath,
      routeType: context.routeType,
    }),
  );
};
