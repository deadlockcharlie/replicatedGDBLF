import { DatabaseDriver } from "./driver";
import gremlin from "gremlin";
import { Graph } from "gremlin/lib/structure/graph";
import { logger } from "../helpers/logging";
import { WebSocket } from "ws";

export class GremlinDriver extends DatabaseDriver {

  driver;
  open = false;
  ws: WebSocket;
  constructor() {
    super();
    console.log(
      "Initializing Gremlin server connection on: " + process.env.DATABASE_URI
    );
    try {

      this.ws = new WebSocket(process.env.DATABASE_URI + "/gremlin", {
        rejectUnauthorized: false,
      });

      const dc = new gremlin.driver.DriverRemoteConnection(
        process.env.DATABASE_URI + "/gremlin",
        { webSocket: this.ws }
      );
      const graph = new Graph();

      this.driver = graph.traversal().withRemote(dc);
      this.driver.V().count().next();
      console.log("Gremlin server connection initialized");
    } catch (err) {
      logger.error(err);
      process.exit(1);
    }
  }

  async addVertex(labels, properties): Promise<Boolean> {
    logger.info("Adding vertex");
    try {
      const traversal = this.driver.addV('Node');
      
      traversal.property('Labels', labels.join(','));
      for (const [key, value] of Object.entries(properties)) {
        traversal.property(key, value);
      }
      
      const result = await traversal.next();
      
      logger.info(result);
      return Promise.resolve(true);
    } catch (err) {
      logger.error("addVertex: "+err);
      return Promise.resolve(false);
    }
  }

  deleteVertex(id): Promise<Boolean> {
    try {
      (async () => {
        await this.driver
          .V()
          .has("id", id)
          .as("v")
          .bothE()
          .drop()
          .select("v")
          .drop()
          .iterate();
      })();
      return Promise.resolve(true);
    } catch (err) {
      logger.error(err);
      throw new err();
    }
  }

  addEdge(
    relationLabels: [string],
    sourcePropName: string,
    sourcePropValue: any,
    targetPropName: string,
    targetPropValue: any,
    properties: { [key: string]: any }
  ) {
    try {
      const traversal = this.driver
        .V()
        .has(targetPropName, targetPropValue)
        .as("target")
        .V()
        .has(sourcePropName, sourcePropValue)
        .addE("Relationship")
        .property('Labels', relationLabels.join(','))
        .to("target");

      for (const [key, value] of Object.entries(properties)) {
        if(Array.isArray(value))
          traversal.property(key, value.join(','));
        else
          traversal.property(key, value);
      }
      (async () => {
        const result = await traversal.next();
      })();
      return Promise.resolve(true);
    } catch (err) {
      logger.error("addEdge: "+err);
      return Promise.resolve(false);
    }
  }

  deleteEdge(properties: any) {
    try {
      (async () => {
        this.driver
          .E()
          .has("id", properties.id)
          .drop()
          .iterate();
      })();
      return Promise.resolve(true);
    } catch (err) {
      logger.error("deleteEdge: " + err);
      return Promise.resolve(false);
    }
  }

  async setVertexProperty(vid: string, key: string, value: string): Promise<Boolean> {
    try {
      logger.info(`Setting vertex property: ${key}=${value} for vertex ID: ${vid}`);
      const result = await this.driver
        .V()
        .has("id", vid)
        .property(key, value)
        .next();
      logger.info(`Property set successfully: ${result}`);
      return Promise.resolve(true);
    } catch (err) {
      logger.error(`setVertexProperty: ${err}`);
      return Promise.resolve(false);
    }
  }
  async setEdgeProperty(eid: string, key: string, value: string): Promise<Boolean> {
    try {
      logger.info(`Setting edge property: ${key}=${value} for edge ID: ${eid}`);
      const result = await this.driver
        .E()
        .has("id", eid)
        .property(key, value)
        .next();
      logger.info(`Property set successfully: ${result}`);
      return Promise.resolve(true);
    } catch (err) {
      logger.error(`setEdgeProperty: ${err}`);
      return Promise.resolve(false);
    }
  }
  async removeVertexProperty(vid: string, key: string) {
    try {
      logger.info(`Removing vertex property: ${key} for vertex ID: ${vid}`);
      const result = await this.driver
      .V()
      .has("id", vid)
      .properties(key)
      .drop()
      .next();
      logger.info(`Property removed successfully: ${result}`);
      return Promise.resolve(true);
    } catch (err) {
      logger.error(`removeVertexProperty: ${err}`);
      return Promise.resolve(false);
    }
  }
  async removeEdgeProperty(eid: string, key: string) {
    try {
      logger.info(`Removing edge property: ${key} for edge ID: ${eid}`);
      const result = await this.driver
      .E()
      .has("id", eid)
      .properties(key)
      .drop()
      .next();
      logger.info(`Property removed successfully: ${result}`);
      return Promise.resolve(true);
    } catch (err) {
      logger.error(`removeEdgeProperty: ${err}`);
      return Promise.resolve(false);
    }
  }
}
