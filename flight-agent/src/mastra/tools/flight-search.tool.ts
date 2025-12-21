import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { amadeus } from '../lib/amadeus.client';

/**
 * TOOL 1: Convert city names to airport codes
 * This minimizes API calls by caching airport codes
 */
export const airportSearchTool = createTool({
  id: 'airport-search',
  description: 'Converts city/airport names to IATA codes (e.g., "London" → "LHR")',
  inputSchema: z.object({
    cityName: z.string().describe('City or airport name'),
  }),
  outputSchema: z.object({
    locations: z.array(
      z.object({
        code: z.string(),
        name: z.string(),
        cityName: z.string(),
        countryName: z.string(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { cityName } = context;

    const response = await amadeus.searchLocation(cityName);

    const locations = response.data.map((loc: any) => ({
      code: loc.iataCode,
      name: loc.name,
      cityName: loc.address?.cityName || loc.name,
      countryName: loc.address?.countryName || '',
    }));

    return { locations };
  },
});

/**
 * TOOL 2: Search flights with optimization
 */
export const flightSearchTool = createTool({
  id: 'flight-search',
  description: 'Searches for real flight offers with live pricing',
  inputSchema: z.object({
    originCode: z.string().describe('Origin airport code (e.g., DXB)'),
    destinationCode: z.string().describe('Destination airport code (e.g., LHR)'),
    departureDate: z.string().describe('Date in YYYY-MM-DD format'),
    adults: z.number().default(1),
    returnDate: z.string().optional(),
    travelClass: z
      .enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
      .default('ECONOMY'),
    directOnly: z.boolean().default(false),
  }),
  outputSchema: z.object({
    flights: z.array(
      z.object({
        id: z.string(),
        price: z.string(),
        currency: z.string(),
        airline: z.string(),
        departure: z.string(),
        arrival: z.string(),
        duration: z.string(),
        stops: z.number(),
      })
    ),
    count: z.number(),
  }),
  execute: async ({ context }) => {
    const {
      originCode,
      destinationCode,
      departureDate,
      adults,
      returnDate,
      travelClass,
      directOnly,
    } = context;

    const response = await amadeus.searchFlights({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate,
      adults,
      returnDate,
      travelClass,
      nonStop: directOnly,
      max: 5, // Limit results to save processing
    });

    // Format flight data
    const flights = response.data.map((offer: any) => {
      const firstSegment = offer.itineraries[0].segments[0];
      const lastSegment =
        offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1];

      return {
        id: offer.id,
        price: offer.price.total,
        currency: offer.price.currency,
        airline: response.dictionaries.carriers[firstSegment.carrierCode] || firstSegment.carrierCode,
        departure: firstSegment.departure.at,
        arrival: lastSegment.arrival.at,
        duration: offer.itineraries[0].duration,
        stops: offer.itineraries[0].segments.length - 1,
      };
    });

    return {
      flights,
      count: flights.length,
    };
  },
});