import { Mastra } from '@mastra/core/mastra';
import { flightAgent } from './agents/flight.agent';

export const mastra = new Mastra({
  agents: {
    flightAgent,
  },
});