export abstract class DatabaseDriver {
  driver;
  
  abstract addVertex(labels: [string], properties: { [key: string]: any }): Promise<Boolean>;
  abstract addEdge(
    relationLabels: [string],
    sourcePropName: string,
    sourcePropValue: any,
    targetPropName: string,
    targetPropValue: any,
    properties: { [key: string]: any }
  ) : Promise<Boolean>;
  abstract deleteVertex(id: string): Promise<Boolean>;
  abstract deleteEdge(properties: any, remote: boolean): Promise<Boolean>;

  abstract setVertexProperty(vid: string, key: string, value: string): Promise<Boolean>;
  abstract setEdgeProperty(eid: string, key: string, value: string): Promise<Boolean>;

  abstract removeVertexProperty(vid: string, key: string): Promise<Boolean>;
  abstract removeEdgeProperty(eid: string, key: string): Promise<Boolean>;

}
