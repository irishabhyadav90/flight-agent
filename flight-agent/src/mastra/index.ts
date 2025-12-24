import { Mastra } from '@mastra/core/mastra';
import { flightAgent } from './agents/flight.agent';
import { LibSQLStore } from "@mastra/libsql";

const storage = new LibSQLStore({
  url: "file:./storage.db",
});

export const mastra = new Mastra({
  agents: {
    flightAgent,
  },
  storage
});