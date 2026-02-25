declare module 'sql.js' {
  export class Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string, params?: any[]): Array<{ columns: string[]; values: any[][] }>;
    export(): Uint8Array;
  }

  interface SqlJsStatic {
    Database: new (data?: Uint8Array | ArrayBuffer | Buffer) => Database;
  }

  export default function initSqlJs(config?: Record<string, any>): Promise<SqlJsStatic>;
}
