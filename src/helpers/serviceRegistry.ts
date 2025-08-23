import { logger } from "./logging";
export class serviceRegistry {
  services = [];

  constructor() {
  }

   registerService ( uri: string) {
    logger.info("Adding Service "+ uri);
    this.services.push(uri);
    logger.info("New replica registered : " + uri);
    return 0;
  }
}
