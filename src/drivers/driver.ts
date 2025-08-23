export abstract class DatabaseDriver {
  driver;

  abstract runQuery(query:String, params: any)
}
