/// <reference types="bun-types" />
import { afterAll, beforeAll } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const DEFAULT_SETUP_TIMEOUT_MS = 30_000;

type DatabaseTable = {
  schemaName: string;
  tableName: string;
};

const quoteIdentifier = (identifier: string) =>
  `"${identifier.replaceAll('"', '""')}"`;

export type PGliteTestDatabaseOptions<TSchema extends Record<string, unknown>> =
  {
    schema: TSchema;
    migrationsFolder: string;
    setupTimeoutMs?: number;
  };

export const setupPGliteTestDatabase = <
  TSchema extends Record<string, unknown>,
>({
  schema,
  migrationsFolder,
  setupTimeoutMs = DEFAULT_SETUP_TIMEOUT_MS,
}: PGliteTestDatabaseOptions<TSchema>) => {
  const client = new PGlite();
  const database = drizzle({ client, schema });

  beforeAll(async () => {
    await client.waitReady;
    await migrate(database, { migrationsFolder });
  }, setupTimeoutMs);

  afterAll(async () => {
    await client.close();
  }, setupTimeoutMs);

  const resetDatabase = async () => {
    const { rows } = await client.query<DatabaseTable>(`
      SELECT schemaname AS "schemaName", tablename AS "tableName"
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    if (rows.length === 0) {
      throw new Error("PGlite test database has no public tables to reset.");
    }

    const tables = rows.map(
      ({ schemaName, tableName }) =>
        `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`
    );
    await client.exec(
      `TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`
    );
  };

  return { database, resetDatabase };
};
