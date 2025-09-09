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
import { GremlinDriver } from "./drivers/germlinDriver";
import { MemGraphDriver } from "./drivers/memgraphDriver";
import { ArangoDBDriver } from "./drivers/ArangoDBDriver";
import { MongoDBDriver } from "./drivers/MongoDBDriver";

logger.info(`environment: ${JSON.stringify(process.env)}`);
const dbname = process.env.DATABASE;
logger.info(`Database specified ${dbname}`);
export var driver;
switch (dbname) {
  case "NEO4J":
  case "MEMGRAPH":
    driver = new MemGraphDriver();
    break;
  case "JANUSGRAPH":
    driver = new GremlinDriver();
    break;
  case "ARANGODB":
    driver = new ArangoDBDriver();
    break;
  case "MONGODB":
    driver = new MongoDBDriver();
    break;

  default:
    logger.error(
      "No database specified in configuration. Cannot initialize driver."
    );
    process.exit(1);
    break;
}

import { query, checkSchema, validationResult, check } from "express-validator";

import { serviceRegistry } from "./helpers/serviceRegistry";
export var registry = new serviceRegistry();

import {
  VertexSchema,
  deleteVertexSchema,
  EdgeSchema,
  deleteEdgeSchema,
  setVertexPropertySchema,
  setEdgePropertySchema,
  removeVertexPropertySchema,
  removeEdgePropertySchema,
} from "./schemas/requests";

// app.post("/write", async (req, res) => {
//   logger.info("query route called");
//   logger.info(JSON.stringify(req.body));
//   logger.info(JSON.stringify(registry.services));

//   const result = await driver.runQuery(req.body.query, req.body.params || null);
//   logger.info(result);

//   let futures = [];

//   registry.services.forEach((uri) => {
//     logger.info("Endpoint" + uri);
//     futures.push(axios.post(uri + "/write", req.body));
//   });

//   try {
//     await Promise.all(futures);
//     logger.info("Done");
//     res.status(200).json("Done!");
//   } catch (err) {
//     logger.info(err.message);
//     res
//       .status(500)
//       .json(
//         "An error occurred when forwarding to a follower. Please try again"
//       );
//   }
// });

async function forwardRequest(endpoint, requestBody) {
  let futures = [];
  registry.services.forEach((uri) => {
    logger.info("Endpoint" + uri);
    futures.push(axios.post(uri + endpoint, requestBody));
  });

  try {
    await Promise.all(futures);
    logger.info("Done");
  } catch (err) {
    logger.info(err.message);
  }
}

app.post(
  "/api/addVertex",
  checkSchema(VertexSchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Add Vertex Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        if (await driver.addVertex(req.body.label, req.body.properties)) {
          await forwardRequest("/api/addVertex", req.body);
          res.status(200).json("Vertex added.");
        } else {
          res.status(500).json("Error occurred: Vertex could not be created.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);

app.post(
  "/api/deleteVertex",
  checkSchema(deleteVertexSchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Delete Vertex Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        logger.info("Deleting vertex with id: " + req.body.id);
        if (await driver.deleteVertex(req.body.id)) {
          await forwardRequest("/api/deleteVertex", req.body);
          res.status(200).json("Vertex deleted.");
        } else {
          res.status(500).json("Error occurred: Vertex could not be deleted.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);

app.post(
  "/api/addEdge",
  checkSchema(EdgeSchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Add Edge Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        if(await driver.addEdge(
          req.body.relationType,
          req.body.sourceLabel,
          req.body.sourcePropName,
          req.body.sourcePropValue,
          req.body.targetLabel,
          req.body.targetPropName,
          req.body.targetPropValue,
          req.body.properties
        )){
          await forwardRequest("/api/addEdge", req.body);
          res.status(200).json("Edge added.");
        } else {
          res.status(500).json("Error occurred: Edge could not be created.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);

app.post(
  "/api/deleteEdge",
  checkSchema(deleteEdgeSchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Delete Edge Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        if(await driver.deleteEdge(req.body.id)){ 
          await forwardRequest("/api/deleteEdge", req.body);
          res.status(200).json("Edge deleted.");
        } else {
          res.status(500).json("Error occurred: Edge could not be deleted.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);

app.post(
  "/api/setVertexProperty",
  checkSchema(setVertexPropertySchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Set Vertex Property Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        logger.info("Setting vertex property with id: " + req.body.id);
        if (await driver.setVertexProperty(
          req.body.id,
          req.body.key,
          req.body.value
        )) {
          await forwardRequest("/api/setVertexProperty", req.body);
          res.status(200).json("Vertex property set.");
        } else {
          logger.error("Error occurred: Vertex property could not be set.");
          res.status(500).json("Error occurred: Vertex property could not be set.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);

app.post(
  "/api/setEdgeProperty",
  checkSchema(setEdgePropertySchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Set Edge Property Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        if(await driver.setEdgeProperty(
          req.body.id,
          req.body.key,
          req.body.value
        ))
        {
          await forwardRequest("/api/setEdgeProperty", req.body);
          res.status(200).json("Edge property set.");
        } else {
          logger.error("Error occurred: Edge property could not be set.");
          res.status(500).json("Error occurred: Edge property could not be set.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);

app.post(
  "/api/removeVertexProperty",
  checkSchema(removeVertexPropertySchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Remove Vertex Property Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        logger.info("Removing vertex property with id: " + req.body.id);
        if(await driver.removeVertexProperty(
          req.body.id,
          req.body.key
        )){
          await forwardRequest("/api/removeVertexProperty", req.body);
          res.status(200).json("Vertex property removed.");
        } else {
          res
            .status(500)
            .json("Error occurred: Vertex property could not be removed.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);
        

app.post(
  "/api/removeEdgeProperty",
  checkSchema(removeEdgePropertySchema, ["body"]),
  async (req, res) => {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      logger.error(
        `Remove Edge Property Malformed request rejected: ${JSON.stringify(
          validation.array()
        )}`
      );
      res.status(500).json("Malformed request.");
    } else {
      try {
        logger.info("Removing edge property with id: " + req.body.id);
        if(await driver.removeEdgeProperty(
          req.body.id,
          req.body.key
        )){
          await forwardRequest("/api/removeEdgeProperty", req.body);
          res.status(200).json("Edge property removed.");
        } else {
          res
            .status(500)
            .json("Error occurred: Edge property could not be removed.");
        }
      } catch (e) {
        res.status(500).json("Error occurred: " + e.message);
        logger.error("Error occurred: " + e.message);
      }
    }
  }
);

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
import { stripTypeScriptTypes } from "module";

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
