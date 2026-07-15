import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const corsOptions: cors.CorsOptions = {
  // Render deployments can shift hostnames across environments.
  // Reflect the request Origin header when present, to avoid mismatched
  // Access-Control-Allow-Origin responses.
  origin: (requestOrigin, callback) => {
    if (!requestOrigin) return callback(null, true);

    // Allow your known frontend domains (add more as needed).
    const allowed = new Set([
      process.env.FRONTEND_URL,
      "https://phishguard-backend-1-ijpp.onrender.com",
      "https://phishguard-front-end.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ].filter(Boolean) as string[]);

    if (allowed.has(requestOrigin)) return callback(null, true);
    return callback(new Error(`CORS origin not allowed: ${requestOrigin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};


app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.sendStatus(204);
    return;
  }

  return next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Render (and other platforms) may probe the service using HEAD/GET on `/`.
// The API itself lives under `/api`, so return a lightweight OK response here
// to avoid 404s causing health/startup checks to fail.
app.get("/", (_req, res) => {
  res.json({ ok: true });
});

app.head("/", (_req, res) => {
  res.status(200).end();
});

app.use("/api", router);

// ---------------------------------------------------------------------------
// Frontend (served from a build copied into src/public during CI/build)
// ---------------------------------------------------------------------------
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import serveStatic from "serve-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend will host the built frontend from artifacts/api-server/src/public
const frontendDir = process.env.FRONTEND_DIST_DIR
  ? path.resolve(process.env.FRONTEND_DIST_DIR)
  : path.resolve(__dirname, "public");

// Serve only if the directory exists; this keeps dev/API usage safe.
if (fs.existsSync(frontendDir)) {
  app.use(serveStatic(frontendDir, { index: false }));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });
}

export default app;






