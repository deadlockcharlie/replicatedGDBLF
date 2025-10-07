import { logger } from "../helpers/logging";
import { DatabaseDriver } from "./driver";
import neo4j from "neo4j-driver";

export class MemGraphDriver extends DatabaseDriver {
  driver;
  constructor() {
    super();

    logger.info("Connecting to bolt on :", process.env.DATABASE_URI);
    this.driver = neo4j.driver(
      process.env.DATABASE_URI,
      neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
    );
    (async () => {
      await this.driver.getServerInfo();

      logger.info("Connected to the Database.");
    })();
  }

  async addVertex(labels, properties): Promise<Boolean> {
    logger.info("Adding vertex");
    try {
      logger.debug(JSON.stringify(labels));
      const labelString = labels.join(":");
      // Build and execute Cypher query
      const query = `CREATE (n:${labelString} $properties) RETURN n`;
      const params = { properties: properties };
      logger.debug("Add vertex query string: " + query);
      const result = await this.driver.executeQuery(query, params);
      if (result.records && result.records.length === 0) {
        return Promise.resolve(false);
      }
      logger.info("Vertex added with labels: " + labelString);
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in add vertex: " + err);
      return Promise.resolve(Promise.resolve(false));
    }
  }

  async deleteVertex(id): Promise<Boolean> {
    try {
      logger.info("Deleting vertex with id: " + id);
      const query = 'MATCH (n {id: "' + id + '"}) DELETE n';
      logger.debug("Delete vertex query: " + query);
      const result = await this.driver.executeQuery(query, null);
      // logger.info(JSON.stringify(result));
      if (result.summary.counters._stats.nodesDeleted == 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in delete vertex: " + err);
      return Promise.resolve(false);
    }
  }

  async addEdge(
    relationLabels: [string],
    sourcePropName: string,
    sourcePropValue: any,

    targetPropName: string,
    targetPropValue: any,
    properties: { [key: string]: any }
  ): Promise<Boolean> {
    const relationLabelString = relationLabels.join(":");

    const query = `
          MATCH (a {${sourcePropName}: "${sourcePropValue}"}), 
                (b {${targetPropName}: "${targetPropValue}"})
          CREATE (a)-[r:${relationLabelString}]->(b)
          SET r += $properties
          RETURN r;
            `;

    const params = {
      sourcePropName: sourcePropName,
      sourcePropValue: sourcePropValue,
      targetPropName: targetPropName,
      targetPropValue: targetPropValue,
      properties: properties,
    };

    try {
      const result = await this.driver.executeQuery(query, params);
      if (result.records && result.records.length === 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in add edge: " + err);
      return Promise.resolve(false);
    }
  }

  async deleteEdge(id: string): Promise<Boolean> {
    const query = 'MATCH ()-[r {id: "' + id + '"}]-() DELETE r';
    logger.info("Delete edge query: " + query);
    try {
      const result = await this.driver.executeQuery(query, null);
      logger.info(JSON.stringify(result));
      if (result.summary.counters._stats.relationshipsDeleted == 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in delete edge: " + err);
      return Promise.resolve(false);
    }
  }

  async setVertexProperty(
    vid: string,
    key: string,
    value: string
  ): Promise<Boolean> {
    const query =
      'MATCH (n {id: "' +
      vid +
      '"}) SET n.' +
      key +
      '="' +
      value +
      '"  RETURN n;';

    try {
      const result = await this.driver.executeQuery(query, null);
      if (result.records.length === 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in set vertex property: " + err);
      return Promise.resolve(false);
    }
  }
  async setEdgeProperty(
    eid: string,
    key: string,
    value: string
  ): Promise<Boolean> {
    const query =
      'MATCH ()-[r {id: "' +
      eid +
      '"}]->() SET r.' +
      key +
      '="' +
      value +
      '"  RETURN r';

    try {
      const result = await this.driver.executeQuery(query, null);
      if (result.records && result.records.length === 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in set edge property: " + err);
      return Promise.resolve(false);
    }
  }

  async removeVertexProperty(vid: string, key: string): Promise<Boolean> {
    const query = 'MATCH (n {id: "' + vid + '"}) REMOVE n.' + key + " RETURN n";
    try {
      const result = await this.driver.executeQuery(query, null);
      if (result.records && result.records.length == 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in remove vertex property: " + err);
      return Promise.resolve(false);
    }
  }

  async removeEdgeProperty(eid: string, key: string): Promise<Boolean> {
    const query =
      'MATCH ()-[r {id: "' + eid + '"}]->() REMOVE r.' + key + " RETURN r";

    try {
      const result = await this.driver.executeQuery(query, null);
      if (result.records && result.records.length == 0) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    } catch (err) {
      logger.error("Error in remove edge property: " + err);
      return Promise.resolve(false);
    }
  }

  async *streamQuery(session: any, query: string, batchSize: number = 10000) {
    let skip = 0;
    while (Promise.resolve(true)) {
      const result = await this.driver.executeQuery(
        `${query} SKIP $skip LIMIT $limit`,
        { skip: neo4j.int(skip), limit: neo4j.int(batchSize) }
      );

      if (result.records.length === 0) break;

      yield result.records; // yield a batch of records
      skip += batchSize;
    }
  }
}
