import express from "express";
import cookieParser from "cookie-parser";
import process from "process";
import http from "http";
import dotenv from "dotenv";
import intoStream from "into-stream";
dotenv.config();

export var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.set("Connection", "close");
  next();
});

import { logger } from "./helpers/logging";

// Setup Database
import { Neo4jDriver } from "./drivers/neo4jDriver";
import { GremlinDriver } from "./drivers/germlinDriver";

logger.info(`environment: ${JSON.stringify(process.env)}`);
const dbname = process.env.DATABASE;
logger.info(`Database specified ${dbname}`);
export var driver;
switch (dbname) {
  case "NEO4J":
  case "MEMGRAPH":
    driver = new Neo4jDriver();
    break;
  case "JANUSGRAPH":
    driver = new GremlinDriver();
    break;
  default:
    logger.error(
      "No database specified in configuration. Cannot initialize driver."
    );
    process.exit(1);
    break;
}

import { serviceRegistry } from "./helpers/serviceRegistry";
export var registry = new serviceRegistry();

app.post("/write", async (req, res) => {
  logger.info("query route called");
  logger.info(JSON.stringify(req.body));
  logger.info(JSON.stringify(registry.services));

  const result = await driver.runQuery(req.body.query, req.body.params || null);
  logger.info(result);

  let futures = [];

  registry.services.forEach((uri) => {
    logger.info("Endpoint" + uri);
    futures.push(axios.post(uri + "/write", req.body));
  });

  try {
    await Promise.all(futures);
    logger.info("Done");
    res.status(200).json("Done!");
  } catch (err) {
    logger.info(err.message);
    res
      .status(500)
      .json(
        "An error occurred when forwarding to a follower. Please try again"
      );
  }
});


app.post("/read", async (req, res) => {
  logger.info("read route called");
  logger.info(JSON.stringify(req.body));
  logger.info(JSON.stringify(registry.services));

  const result = await driver.runQuery(req.body.query, req.body.params || null);
  logger.info(result);
  res.status(200).json("Done");

});

app.post("/register", async (req, res) => {
  logger.info("Service trying to register: " + req.body);
  registry.registerService(req.body.uri);
  res.status(200).json("Service registered. You will now receive requests");
});

app.get("/health", async (req, res) => {
  if (process.env.LEADER) logger.info("Health route called");
  res.status(200).json("Hey I am up!!");
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send("error");
});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

var port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, "0.0.0.0");
server.on("error", onError);
server.on("listening", onListening);

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

import axios from "axios";
import { selectFields } from "express-validator/lib/field-selection";
import { connect } from "http2";
import { RetryHandler } from "undici";
import { error } from "console";

let leader: boolean = false;
async function onListening() {
  let endpoint = process.env.LEADER_URI;
  if (endpoint == process.env.MY_URI) {
    leader = true;
  }
  if (!leader) {
    let data = { uri: process.env.MY_URI };
    logger.info(endpoint);
    let retries = 10;
    let attempt = 0;
    let connected = false;
    while (attempt < retries && !connected) {
      axios
        .post(endpoint + "/register", data)
        .then((response) => {
          logger.info("Connected to the leader");
          connected = true;
        })
        .catch((error) => {
          logger.error("Error when registering with leader" + error.message);
        });
      attempt++;
      await sleep(2000);
      if (attempt == retries) {
        logger.error("Leader not reachable. Replication unstable.");
        process.exit(1);
      }
    }
  } else {
    logger.info("I am the leader");
  }

  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  logger.debug("Listening on " + bind);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
