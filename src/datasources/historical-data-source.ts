export class HistoricalDataSourceService {
  dataSourceMap: Record<string, any> = {};

  putObject(key: string, value: any) {
    this.dataSourceMap[key] = value;
  }

  getObject(key: string) {
    return this.dataSourceMap[key];
  }
}
