import { logger } from "../helpers/logging";
import { DatabaseDriver } from "./driver";
import neo4j from "neo4j-driver";

export class Neo4jDriver extends DatabaseDriver {
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
      logger.info("Connected to the database");
    })();
  }

  async runQuery(query: String, params: any) {
      var result = await this.driver.executeQuery(query, params);
      logger.info(JSON.stringify(result));
  }
}
