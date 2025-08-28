// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0b5c79a274d3f57ab2701c80c243fe75@o4509923023519744.ingest.us.sentry.io/4509923024633856",

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
