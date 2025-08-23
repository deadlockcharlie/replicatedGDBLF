import { DatabaseDriver } from "./driver";
import gremlin from "gremlin";
import { Graph } from "gremlin/lib/structure/graph";
import { logger } from "../helpers/logging";
import { WebSocket } from "ws";

export class GremlinDriver extends DatabaseDriver {
  driver;
  constructor() {
    super();
    console.log(
      "Initializing Gremlin server connection on: " + process.env.DATABASE_URI
    );
    try {
      const ws = new WebSocket(process.env.DATABASE_URI + "/gremlin", {
        rejectUnauthorized: false,
      });

      const dc = new gremlin.driver.DriverRemoteConnection(
        process.env.DATABASE_URI + "/gremlin",
        { webSocket: ws }
      );
      const graph = new Graph();

      this.driver = graph.traversal().withRemote(dc);
      console.log("Gremlin server connection initialized");
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  }

  runQuery(query: String, params: any) {
      logger.info("Gremlin runquery called");
  }

}
