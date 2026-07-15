import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const corsOptions: cors.CorsOptions = {
  origin: process.env.FRONTEND_URL ?? true,
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

export default app;


