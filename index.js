#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'node:child_process';
import express from 'express';
import { ToolError, invalid } from './src/errors.js';
import { createEphemeris } from './src/ephemeris.js';
import { PLANET_ABBR, round } from './src/constants.js';
import {
  MAX_SWEEP_CHARS, roundOffset, sampleOffsets, flipsOf, countChanges, passWindows, intersectWindows, bestSubset,
  fitToBudget, makeLongitudeInterpolator, makeLinearInterpolator,
} from './src/sweep.js';

// Vedic / KP reference data
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];
const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'
];
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati'
];
const NAKSHATRA_SPAN = 360 / 27;
const DASHA_LEVELS = ['mahadasha', 'antardasha', 'pratyantardasha', 'sookshma', 'praana', 'deha'];
const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const DEFAULT_AYANAMSA = 'traditional_lahiri';
// Birth times without a UTC offset are taken as Indian Standard Time
const DEFAULT_BIRTH_OFFSET = '+05:30';
// Limits for batch dates and birth-time sweeps
const MAX_AS_OF_DATES = 200;
const MAX_SWEEP_CANDIDATES = 3601;
const MAX_SWEEP_CHAINS = 3601 * 200;
const MAX_EVENT_TESTS = 50;
const SERVER_INSTRUCTIONS = `Vedic astrology calculations (Swiss Ephemeris). Defaults match Jagannatha Hora: Traditional Lahiri ayanamsa, true positions, true nodes, true sidereal solar years; Kalachakra by the SM Singh method.

Birth time and place:
- Always pass datetime as YYYY-MM-DDTHH:mm:ss with an explicit UTC offset, e.g. 1999-06-06T15:30:00+05:30. Keep the seconds exactly as given (15:30:00 and 15:30:03 are different charts).
- If the user gives no timezone or country for the birth, use Indian Standard Time (+05:30). The server also assumes +05:30 when the offset is missing and says so in birth_timezone.
- If the user names a birth place or zone (New York, London, UTC...), use the offset in force there on the birth date.
- For a named Indian city (Bhavnagar, Botad, Mumbai, Ahmedabad...) use its own coordinates. If only "India" is given, use 21°46'N 72°09'E (21.7667, 72.15) when the context points to Gujarat / Western India.
- Kalachakra (calculate_kalachakra_dasha) always runs with the Jagannatha Hora settings and does not depend on the birth place.

Current location (dual-time reporting):
- Dasha transitions happen at one physical moment; show them in both the birth timezone and the native's current local time.
- If you do not know where the native lives now, give the results in the birth timezone and ask: "I have calculated your chart and dashas in your birth timezone (IST). If you are currently living in another city or country (e.g., Melbourne, London, New York), please let me know your current location so I can display all active dasha transition timestamps in your local time."
- Once known, pass current_timezone as an IANA name (Australia/Melbourne, Europe/London, America/New_York). Every start/end then comes with start_local/end_local converted with the real daylight-saving rules for that date; use those values, do not add offsets yourself.
- Present transitions in a table with both columns, e.g. | Level | Sign & Pada | Birth Time (IST) | Current Local Time (Melbourne) |, and never round off seconds.

Keeping calls small:
- When you only need the running period, pass output: "chain" (no full dasha tree); levels (1-6) limits the depth.
- For several dates (e.g. life events), pass as_of as a list: one call returns a compact chain per date.
- For birth-time rectification, use calculate_kalachakra_dasha with birth_time_sweep and the event dates as as_of; birth times giving the same chains are merged into ranges. birth_time_sensitivity gives the days of shift per second of birth time.
- Each current level includes ends_in and next (the following period at that level). Kalachakra periods carry gati (Simhavalokana, Manduka, Markati jumps).`;
const DAY_MS = 24 * 60 * 60 * 1000;
const SIDEREAL_YEAR_DAYS = 365.256363;
// Kalachakra dasha (BPHS). Years of each sign, Aries to Pisces
const KC_YEARS = [7, 16, 9, 21, 5, 9, 16, 7, 10, 4, 4, 10];
// Savya cycles (sign indexes) for Kalachakra navamsas Aries to Scorpio; Sagittarius to Pisces
// repeat Aries to Cancer. Read in order, the 12 cycles form the 108-pada savya stream.
const KC_SAVYA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 7, 6, 5, 3, 4, 2],
  [1, 0, 11, 10, 9, 8, 0, 1, 2],
  [3, 4, 5, 6, 7, 8, 9, 10, 11],
  [7, 6, 5, 3, 4, 2, 1, 0, 11],
  [10, 9, 8, 0, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 7, 6, 5],
  [3, 4, 2, 1, 0, 11, 10, 9, 8],
];
// Kalachakra navamsas of apasavya padas, by position in their nakshatra triad
// (Rohini 1-4, Mrigashira 1-4, Ardra 1-4); Rohini 4 is taken as Leo
const KC_APASAVYA_NAVAMSAS = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17
};
// Keys are the tool's ayanamsa values; flag is the swetest sidereal-mode option.
// Traditional Lahiri (Jagannatha Hora's default) is the official 23°15'00.658" (true, i.e. with
// nutation) on 21 March 1956, less that day's nutation in longitude (16.7769"), carried with
// the current precession model. Swiss Ephemeris' own Lahiri (-sid1) uses IAU 1976 precession
// and 1980 nutation and is a constant 0.14" higher. Checked against JHora Kalachakra times.
const AYANAMSAS = {
  traditional_lahiri: { flag: '-sidudef2435553.5,23.245522528', name: 'Traditional Lahiri' },
  lahiri: { flag: '-sid1', name: 'Lahiri (Swiss Ephemeris)' },
  kp_new: { flag: '-sid45', name: 'KP New (Krishnamurti-Senthilathiban)' },
  kp_old: { flag: '-sid5', name: 'KP Old (Krishnamurti)' },
  raman: { flag: '-sid3', name: 'Raman' },
  yukteshwar: { flag: '-sid7', name: 'Sri Yukteshwar' },
  fagan_bradley: { flag: '-sid0', name: 'Fagan/Bradley' },
};

class SwissEphemerisServer {
  constructor() {
    this.server = this.createServer();
  }

  // Each HTTP session gets its own Server, since a Server can only be connected to one transport
  createServer() {
    const server = new Server(
      {
        name: 'swiss-ephemeris-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );

    this.setupToolHandlers(server);
    return server;
  }

  setupToolHandlers(server) {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'calculate_planetary_positions',
            description: 'Calculate planetary positions, houses, chart points and asteroids for a given datetime and coordinates',
            inputSchema: {
              type: 'object',
              properties: {
                datetime: {
                  type: 'string',
                  description: 'ISO8601 datetime, e.g., 1985-04-12T23:20:50Z',
                },
                latitude: {
                  type: 'number',
                  description: 'Latitude in decimal degrees',
                },
                longitude: {
                  type: 'number',
                  description: 'Longitude in decimal degrees, positive east',
                },
              },
              required: ['datetime', 'latitude', 'longitude'],
            },
          },
          {
            name: 'calculate_transits',
            description: 'Calculate birth chart positions and current transits for comparison. Returns both natal chart and current planetary positions.',
            inputSchema: {
              type: 'object',
              properties: {
                birth_datetime: {
                  type: 'string',
                  description: 'Birth datetime in ISO8601 format, e.g., 1985-04-12T23:20:50Z',
                },
                latitude: {
                  type: 'number',
                  description: 'Birth latitude in decimal degrees',
                },
                longitude: {
                  type: 'number',
                  description: 'Birth longitude in decimal degrees, positive east',
                },
              },
              required: ['birth_datetime', 'latitude', 'longitude'],
            },
          },
          {
            name: 'calculate_solar_revolution',
            description: 'Calculate solar return chart for a specific year. The solar return occurs when the Sun returns to the exact same position as at birth.',
            inputSchema: {
              type: 'object',
              properties: {
                birth_datetime: {
                  type: 'string',
                  description: 'Birth datetime in ISO8601 format, e.g., 1985-04-12T23:20:50Z',
                },
                birth_latitude: {
                  type: 'number',
                  description: 'Birth latitude in decimal degrees',
                },
                birth_longitude: {
                  type: 'number',
                  description: 'Birth longitude in decimal degrees, positive east',
                },
                return_year: {
                  type: 'number',
                  description: 'Year for the solar return calculation, e.g., 2024',
                },
                return_latitude: {
                  type: 'number',
                  description: 'Latitude for solar return location (optional, defaults to birth location)',
                },
                return_longitude: {
                  type: 'number',
                  description: 'Longitude for solar return location (optional, defaults to birth location)',
                },
              },
              required: ['birth_datetime', 'birth_latitude', 'birth_longitude', 'return_year'],
            },
          },
          {
            name: 'calculate_synastry',
            description: 'Calculate synastry chart between two people for relationship compatibility analysis. Compares planetary positions and calculates aspects between the charts.',
            inputSchema: {
              type: 'object',
              properties: {
                person1_datetime: {
                  type: 'string',
                  description: 'Person 1 birth datetime in ISO8601 format, e.g., 1985-04-12T23:20:50Z',
                },
                person1_latitude: {
                  type: 'number',
                  description: 'Person 1 birth latitude in decimal degrees',
                },
                person1_longitude: {
                  type: 'number',
                  description: 'Person 1 birth longitude in decimal degrees, positive east',
                },
                person2_datetime: {
                  type: 'string',
                  description: 'Person 2 birth datetime in ISO8601 format, e.g., 1990-08-25T14:30:00Z',
                },
                person2_latitude: {
                  type: 'number',
                  description: 'Person 2 birth latitude in decimal degrees',
                },
                person2_longitude: {
                  type: 'number',
                  description: 'Person 2 birth longitude in decimal degrees, positive east',
                },
              },
              required: ['person1_datetime', 'person1_latitude', 'person1_longitude', 'person2_datetime', 'person2_latitude', 'person2_longitude'],
            },
          },
          {
            name: 'calculate_vedic_chart',
            description: 'Calculate a sidereal Vedic/KP birth chart with Jagannatha Hora default settings (Traditional Lahiri ayanamsa, true positions, true nodes, true sidereal solar years): planets and Placidus cusps with sign lord, nakshatra, pada, star lord, KP sub lord and sub-sub lord, retrograde status, whole-sign and KP house placement; the Vimshottari dasha timeline with the running chain down to deha (6 levels); and Kalachakra dasha (SM Singh method) with mahadashas, antardashas and the running chain down to deha.',
            inputSchema: {
              type: 'object',
              properties: {
                datetime: {
                  type: 'string',
                  description: 'Birth datetime in ISO8601 format with the birth UTC offset and seconds (fractions allowed, e.g. 15:30:00.25), e.g., 1999-06-06T15:30:00+05:30. Without an offset IST (+05:30) is assumed. Dasha dates are returned in the same offset',
                },
                latitude: {
                  type: 'number',
                  description: 'Birth latitude in decimal degrees',
                },
                longitude: {
                  type: 'number',
                  description: 'Birth longitude in decimal degrees, positive east',
                },
                ayanamsa: {
                  type: 'string',
                  enum: Object.keys(AYANAMSAS),
                  description: 'Ayanamsa to use (default traditional_lahiri, as in Jagannatha Hora). kp_new = Krishnamurti-Senthilathiban, kp_old = original Krishnamurti',
                },
                position_type: {
                  type: 'string',
                  enum: ['true', 'apparent'],
                  description: 'True positions (default, as in Jagannatha Hora) or apparent positions (with light-time and aberration, as most other software)',
                },
                node_type: {
                  type: 'string',
                  enum: ['mean', 'true'],
                  description: 'True or mean lunar node for Rahu/Ketu (default true, as in Jagannatha Hora)',
                },
                as_of: {
                  oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, maxItems: 200 }],
                  description: 'ISO8601 date for the running dasha chains (default now), or a list of up to 200 dates to get one compact chain per date. Dates without an offset are taken as IST',
                },
                output: {
                  type: 'string',
                  enum: ['full', 'chain'],
                  description: 'full (default): dasha trees plus running chains. chain: running chains only (far fewer tokens). A list of as_of dates is always compact',
                },
                levels: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 6,
                  description: 'How deep the dasha chains go: 1 mahadasha ... 6 deha (default 6)',
                },
                current_timezone: {
                  type: 'string',
                  description: 'IANA timezone where the native lives now, e.g. Australia/Melbourne, Europe/London, America/New_York. Adds start_local/end_local to every dasha period, converted with that zone\'s daylight-saving rules',
                },
                dasha_year_days: {
                  type: 'number',
                  description: 'Fixed days per dasha year (e.g. 365.25 or 360). Omit to use true sidereal solar years, as in Jagannatha Hora',
                },
              },
              required: ['datetime', 'latitude', 'longitude'],
            },
          },
          {
            name: 'calculate_kalachakra_dasha',
            description: 'Calculate Kalachakra dasha only, always with Jagannatha Hora settings: Traditional Lahiri ayanamsa, true positions, true sidereal solar years, SM Singh method (full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa), from the Moon in D-1, Rohini 4th pada as Leo. Returns Savya/Apasavya, Paramayush, Deha, Jiva, gati (Simhavalokana/Manduka/Markati) jumps, the running chain down to deha with countdowns and next periods, the birth-time sensitivity, and optionally all mahadashas with antardashas, the sub-periods of any period (drill_down), chains for a list of dates, or a birth-time sweep for rectification.',
            inputSchema: {
              type: 'object',
              properties: {
                datetime: {
                  type: 'string',
                  description: 'Birth datetime in ISO8601 format with the birth UTC offset and seconds (fractions allowed, e.g. 15:30:00.25), e.g., 1999-06-06T15:30:00+05:30. Without an offset IST (+05:30) is assumed. Dates are returned in the same offset',
                },
                latitude: {
                  type: 'number',
                  description: 'Birth latitude (optional; Kalachakra uses the geocentric Moon, so the place does not change the result)',
                },
                longitude: {
                  type: 'number',
                  description: 'Birth longitude, positive east (optional, see latitude)',
                },
                as_of: {
                  oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, maxItems: 200 }],
                  description: 'ISO8601 date for the running chain (default now), or a list of up to 200 dates (e.g. life events) to get one compact chain per date. Dates without an offset are taken as IST',
                },
                output: {
                  type: 'string',
                  enum: ['full', 'chain'],
                  description: 'full (default): all mahadashas with antardashas plus the running chain. chain: only the running chain with countdowns and next periods (far fewer tokens). A list of as_of dates is always compact',
                },
                levels: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 6,
                  description: 'How deep chains go: 1 mahadasha, 2 antardasha, 3 pratyantardasha, 4 sookshma, 5 praana, 6 deha (default 6)',
                },
                birth_time_sweep: {
                  type: 'object',
                  properties: {
                    from_seconds: { type: 'number', description: 'First birth time, in seconds relative to datetime (e.g. -300)' },
                    to_seconds: { type: 'number', description: 'Last birth time, in seconds relative to datetime (e.g. 300)' },
                    step_seconds: { type: 'number', description: 'Step between birth times in seconds (fractions allowed)' },
                  },
                  required: ['from_seconds', 'to_seconds', 'step_seconds'],
                  description: 'Rectification: recompute the Kalachakra for each birth time in this range and return the chain at every as_of date for each (compact). Birth times giving identical chains are merged into ranges. Up to 3601 birth times and 100000 chains (birth times x dates)',
                },
                current_timezone: {
                  type: 'string',
                  description: 'IANA timezone where the native lives now, e.g. Australia/Melbourne, Europe/London, America/New_York. Adds start_local/end_local to every dasha period, converted with that zone\'s daylight-saving rules',
                },
                drill_down: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Sign abbreviations naming a period to divide, e.g. ["Ta"] lists the antardashas of the Ta mahadasha, ["Ta", "Vi", "Aq"] the sookshmas of Ta MD > Vi AD > Aq PD. Abbreviations: Ar Ta Ge Cn Le Vi Li Sc Sg Cp Aq Pi',
                },
              },
              required: ['datetime'],
            },
          },
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.handleToolCall(name, args || {});
        return {
          content: [
            {
              type: 'text',
              // Compact JSON: indentation costs the client tokens without adding information
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError && error.code === ErrorCode.MethodNotFound) {
          throw error;
        }
        // Errors come back as JSON the client can act on: the reason and the parameter to fix
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error: this.describeError(error, args || {}) }) }],
        };
      }
    });
  }

  describeError(error, args) {
    if (error instanceof ToolError) {
      return { reason: error.reason, parameter: error.parameter };
    }
    const reason = (error.message || String(error)).replace(/^MCP error -?\d+: /, '');
    // Validation messages start with the parameter name ("latitude must be ...")
    const first = reason.split(/[\s:]/)[0];
    const known = { 'Invalid datetime': 'datetime', 'Invalid as_of': 'as_of', 'drill_down:': 'drill_down' };
    const prefix = Object.keys(known).find(k => reason.startsWith(k));
    const parameter = prefix ? known[prefix]
      : Object.prototype.hasOwnProperty.call(args, first) || (/^[a-z_]+$/.test(first) && reason.includes(' must ')) ? first
        : null;
    return {
      reason: error instanceof McpError ? reason : `Calculation failed: ${reason}`,
      parameter,
    };
  }

  formatDateToSwiss(date) {
    // Format date as DD.MM.YYYY using UTC components
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }

  formatTimeToSwiss(date) {
    // Format time as HH:MM:SS using UTC components
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  parsePlanetLine(line) {
    // Parse planet position line from swetest output
    // Format: "Sun            ,22 le 53'51.2332" or "Moon           , 2 cp 21' 3.2731"
    const parts = line.trim().split(',');
    if (parts.length < 2) return null;

    const name = parts[0].trim();
    const positionStr = parts[1].trim();
    
    // Parse position like "22 le 53'51.2332" or "2 cp 21' 3.2731" (note space after apostrophe)
    const posMatch = positionStr.match(/^(\d+)\s+([a-z]{2})\s+(\d+)'\s*([\d.]+)$/i);
    if (!posMatch) return null;

    const degrees = parseInt(posMatch[1]);
    const signAbbr = posMatch[2].toLowerCase();
    const minutes = parseInt(posMatch[3]);
    const seconds = parseFloat(posMatch[4]);

    // Map sign abbreviations to full names and calculate longitude
    const signMap = {
      'ar': { name: 'Aries', offset: 0 },
      'ta': { name: 'Taurus', offset: 30 },
      'ge': { name: 'Gemini', offset: 60 },
      'cn': { name: 'Cancer', offset: 90 },
      'le': { name: 'Leo', offset: 120 },
      'vi': { name: 'Virgo', offset: 150 },
      'li': { name: 'Libra', offset: 180 },
      'sc': { name: 'Scorpio', offset: 210 },
      'sa': { name: 'Sagittarius', offset: 240 },
      'cp': { name: 'Capricorn', offset: 270 },
      'aq': { name: 'Aquarius', offset: 300 },
      'pi': { name: 'Pisces', offset: 330 }
    };

    const signInfo = signMap[signAbbr];
    if (!signInfo) return null;

    // Calculate total longitude in degrees
    const longitude = signInfo.offset + degrees + (minutes / 60) + (seconds / 3600);

    return {
      name,
      longitude,
      sign: signInfo.name,
      degree: Math.round((degrees + (minutes / 60) + (seconds / 3600)) * 100) / 100
    };
  }

  parseHouseLine(line) {
    // Parse house cusp line from swetest output
    // Format: "house  1       ,13 cn 39'52.5152"
    const parts = line.trim().split(',');
    if (parts.length < 2) return null;

    const houseMatch = parts[0].trim().match(/^house\s+(\d+)/);
    if (!houseMatch) return null;

    const house = parseInt(houseMatch[1]);
    const positionStr = parts[1].trim();
    
    // Parse position like "13 cn 39'52.5152" (allow optional spaces after apostrophe)
    const posMatch = positionStr.match(/^(\d+)\s+([a-z]{2})\s+(\d+)'\s*([\d.]+)$/i);
    if (!posMatch) return null;

    const degrees = parseInt(posMatch[1]);
    const signAbbr = posMatch[2].toLowerCase();
    const minutes = parseInt(posMatch[3]);
    const seconds = parseFloat(posMatch[4]);

    // Map sign abbreviations to full names and calculate longitude
    const signMap = {
      'ar': { name: 'Aries', offset: 0 },
      'ta': { name: 'Taurus', offset: 30 },
      'ge': { name: 'Gemini', offset: 60 },
      'cn': { name: 'Cancer', offset: 90 },
      'le': { name: 'Leo', offset: 120 },
      'vi': { name: 'Virgo', offset: 150 },
      'li': { name: 'Libra', offset: 180 },
      'sc': { name: 'Scorpio', offset: 210 },
      'sa': { name: 'Sagittarius', offset: 240 },
      'cp': { name: 'Capricorn', offset: 270 },
      'aq': { name: 'Aquarius', offset: 300 },
      'pi': { name: 'Pisces', offset: 330 }
    };

    const signInfo = signMap[signAbbr];
    if (!signInfo) return null;

    // Calculate total longitude in degrees
    const longitude = signInfo.offset + degrees + (minutes / 60) + (seconds / 3600);

    return {
      house,
      longitude,
      sign: signInfo.name,
      degree: Math.round((degrees + (minutes / 60) + (seconds / 3600)) * 100) / 100
    };
  }

  parseChartPointLine(line) {
    // Parse chart point line from swetest output
    // Format: "Ascendant      ,13 cn 39'52.5152"
    const parts = line.trim().split(',');
    if (parts.length < 2) return null;

    const name = parts[0].trim();
    const positionStr = parts[1].trim();
    
    // Parse position like "13 cn 39'52.5152" (allow optional spaces after apostrophe)
    const posMatch = positionStr.match(/^(\d+)\s+([a-z]{2})\s+(\d+)'\s*([\d.]+)$/i);
    if (!posMatch) return null;

    const degrees = parseInt(posMatch[1]);
    const signAbbr = posMatch[2].toLowerCase();
    const minutes = parseInt(posMatch[3]);
    const seconds = parseFloat(posMatch[4]);

    // Map sign abbreviations to full names and calculate longitude
    const signMap = {
      'ar': { name: 'Aries', offset: 0 },
      'ta': { name: 'Taurus', offset: 30 },
      'ge': { name: 'Gemini', offset: 60 },
      'cn': { name: 'Cancer', offset: 90 },
      'le': { name: 'Leo', offset: 120 },
      'vi': { name: 'Virgo', offset: 150 },
      'li': { name: 'Libra', offset: 180 },
      'sc': { name: 'Scorpio', offset: 210 },
      'sa': { name: 'Sagittarius', offset: 240 },
      'cp': { name: 'Capricorn', offset: 270 },
      'aq': { name: 'Aquarius', offset: 300 },
      'pi': { name: 'Pisces', offset: 330 }
    };

    const signInfo = signMap[signAbbr];
    if (!signInfo) return null;

    // Calculate total longitude in degrees
    const longitude = signInfo.offset + degrees + (minutes / 60) + (seconds / 3600);

    return {
      name,
      longitude,
      sign: signInfo.name,
      degree: Math.round((degrees + (minutes / 60) + (seconds / 3600)) * 100) / 100
    };
  }

  calculateEphemeris(datetime, latitude, longitude) {
    try {
      const date = new Date(datetime);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid datetime format. Use ISO8601 format like 1985-04-12T23:20:50Z');
      }

      const swissDate = this.formatDateToSwiss(date);
      const swissTime = this.formatTimeToSwiss(date);
      const ephePath = process.env.SE_EPHE_PATH || '/app/vendor/swisseph';

      // Execute swetest for planets, including asteroids and additional points
      // 0123456789 = Sun through Pluto, t = true Node, A = mean Apogee (Lilith), D = Chiron, F = Ceres, G = Pallas, H = Juno, I = Vesta
      const planetCmd = `SE_EPHE_PATH=${ephePath} swetest -b${swissDate} -ut${swissTime} -p0123456789tADFGHI -fPZ -g, -head`;
      let planetOutput;
      try {
        planetOutput = execSync(planetCmd, { encoding: 'utf8' });
      } catch (error) {
        throw new Error(`Failed to execute swetest for planets: ${error.message}`);
      }

      // Execute swetest for houses (Placidus system)
      const houseCmd = `SE_EPHE_PATH=${ephePath} swetest -b${swissDate} -ut${swissTime} -house${longitude},${latitude},P -fPZ -g, -head`;
      let houseOutput;
      try {
        houseOutput = execSync(houseCmd, { encoding: 'utf8' });
      } catch (error) {
        throw new Error(`Failed to execute swetest for houses: ${error.message}`);
      }

      // Parse planets
      const planets = {};
      const planetLines = planetOutput.split('\n').filter(line => line.trim() && !line.includes('error:') && !line.includes('warning:'));
      
      planetLines.forEach(line => {
        const planet = this.parsePlanetLine(line);
        if (planet) {
          // Map swetest planet codes to readable names
          const planetNames = {
            'Sun': 'Sun',
            'Moon': 'Moon', 
            'Mercury': 'Mercury',
            'Venus': 'Venus',
            'Mars': 'Mars',
            'Jupiter': 'Jupiter',
            'Saturn': 'Saturn',
            'Uranus': 'Uranus',
            'Neptune': 'Neptune',
            'Pluto': 'Pluto',
            'mean Node': 'North Node',
            'true Node': 'North Node',
            'Chiron': 'Chiron',
            'mean Apogee': 'Lilith',
            'Ceres': 'Ceres',
            'Pallas': 'Pallas',
            'Juno': 'Juno',
            'Vesta': 'Vesta'
          };
          
          const name = planetNames[planet.name] || planet.name;
          planets[name] = {
            longitude: planet.longitude,
            sign: planet.sign,
            degree: planet.degree
          };
        }
      });

      // Parse houses and chart points from house output
      const houses = {};
      const chartPoints = {};
      const houseLines = houseOutput.split('\n').filter(line => line.trim() && !line.includes('error:') && !line.includes('warning:'));
      
      houseLines.forEach(line => {
        // Try parsing as house
        if (line.includes('house ')) {
          const house = this.parseHouseLine(line);
          if (house && house.house >= 1 && house.house <= 12) {
            houses[house.house] = {
              longitude: house.longitude,
              sign: house.sign,
              degree: house.degree
            };
          }
        }
        // Try parsing as chart point
        else if (line.includes('Ascendant') || line.includes('MC') || line.includes('ARMC') || line.includes('Vertex')) {
          const chartPoint = this.parseChartPointLine(line);
          if (chartPoint) {
            const pointNames = {
              'Ascendant': 'Ascendant',
              'MC': 'Midheaven',
              'ARMC': 'ARMC',
              'Vertex': 'Vertex'
            };
            
            const name = pointNames[chartPoint.name] || chartPoint.name;
            chartPoints[name] = {
              longitude: chartPoint.longitude,
              sign: chartPoint.sign,
              degree: chartPoint.degree
            };
          }
        }
      });

      // Calculate additional points
      const additionalPoints = {};

      // Add South Node (opposite of North Node)
      if (planets['North Node']) {
        const northNodeLon = planets['North Node'].longitude;
        const southNodeLon = (northNodeLon + 180) % 360;
        const signIndex = Math.floor(southNodeLon / 30);
        const degree = southNodeLon % 30;
        const signs = [
          'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        
        additionalPoints['South Node'] = {
          longitude: southNodeLon,
          sign: signs[signIndex],
          degree: Math.round(degree * 100) / 100
        };
      }

      // Calculate Part of Fortune (ASC + Moon - Sun)
      if (chartPoints.Ascendant && planets.Sun && planets.Moon) {
        const ascLon = chartPoints.Ascendant.longitude;
        const sunLon = planets.Sun.longitude;
        const moonLon = planets.Moon.longitude;
        let fortuneLon = (ascLon + moonLon - sunLon) % 360;
        if (fortuneLon < 0) fortuneLon += 360;
        
        const signIndex = Math.floor(fortuneLon / 30);
        const degree = fortuneLon % 30;
        const signs = [
          'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        
        additionalPoints['Part of Fortune'] = {
          longitude: fortuneLon,
          sign: signs[signIndex],
          degree: Math.round(degree * 100) / 100
        };
      }

      // Add IC and Descendant based on Ascendant and Midheaven
      if (chartPoints.Ascendant) {
        const ascLon = chartPoints.Ascendant.longitude;
        const descLon = (ascLon + 180) % 360;
        const signIndex = Math.floor(descLon / 30);
        const degree = descLon % 30;
        const signs = [
          'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        
        chartPoints.Descendant = {
          longitude: descLon,
          sign: signs[signIndex],
          degree: Math.round(degree * 100) / 100
        };
      }

      if (chartPoints.Midheaven) {
        const mcLon = chartPoints.Midheaven.longitude;
        const icLon = (mcLon + 180) % 360;
        const signIndex = Math.floor(icLon / 30);
        const degree = icLon % 30;
        const signs = [
          'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        
        chartPoints.IC = {
          longitude: icLon,
          sign: signs[signIndex],
          degree: Math.round(degree * 100) / 100
        };
      }

      return {
        planets,
        houses,
        chart_points: chartPoints,
        additional_points: additionalPoints,
        datetime: datetime,
        coordinates: {
          latitude,
          longitude
        }
      };

    } catch (error) {
      throw new Error(`Swiss Ephemeris calculation failed: ${error.message}`);
    }
  }

  calculateSynastryAspects(person1Planets, person2Planets) {
    const aspects = [];
    const aspectOrbs = {
      'conjunction': 8,
      'opposition': 8,
      'trine': 8,
      'square': 8,
      'sextile': 6,
      'quincunx': 3,
      'semisextile': 3
    };

    const aspectAngles = {
      'conjunction': 0,
      'semisextile': 30,
      'sextile': 60,
      'square': 90,
      'trine': 120,
      'quincunx': 150,
      'opposition': 180
    };

    // Main planets for synastry analysis
    const mainPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    for (const planet1 of mainPlanets) {
      if (!person1Planets[planet1]) continue;
      
      for (const planet2 of mainPlanets) {
        if (!person2Planets[planet2]) continue;

        const lon1 = person1Planets[planet1].longitude;
        const lon2 = person2Planets[planet2].longitude;
        
        // Calculate the angular distance
        let distance = Math.abs(lon1 - lon2);
        if (distance > 180) {
          distance = 360 - distance;
        }

        // Check for each aspect type
        for (const [aspectName, aspectAngle] of Object.entries(aspectAngles)) {
          const orb = aspectOrbs[aspectName];
          const angleDiff = Math.abs(distance - aspectAngle);
          
          if (angleDiff <= orb) {
            aspects.push({
              person1_planet: planet1,
              person2_planet: planet2,
              aspect: aspectName,
              orb: angleDiff.toFixed(2),
              exact_angle: distance.toFixed(2),
              person1_position: {
                longitude: lon1,
                sign: person1Planets[planet1].sign,
                degree: person1Planets[planet1].degree
              },
              person2_position: {
                longitude: lon2,
                sign: person2Planets[planet2].sign,
                degree: person2Planets[planet2].degree
              }
            });
          }
        }
      }
    }

    return aspects.sort((a, b) => parseFloat(a.orb) - parseFloat(b.orb));
  }

  calculateVedicChart(datetime, latitude, longitude, options = {}) {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid datetime format. Use ISO8601 format like 1985-04-12T23:20:50Z');
    }

    const ayanamsaKey = options.ayanamsa || DEFAULT_AYANAMSA;
    const ayanamsa = AYANAMSAS[ayanamsaKey];
    if (!ayanamsa) {
      throw new Error(`Unknown ayanamsa: ${ayanamsaKey}. Use one of: ${Object.keys(AYANAMSAS).join(', ')}`);
    }
    // Defaults follow Jagannatha Hora: true (not apparent) positions and true nodes
    const nodeType = options.node_type || 'true';
    const positionType = options.position_type || 'true';
    const yearDays = options.dasha_year_days;

    const asOfInputs = Array.isArray(options.as_of) ? options.as_of : null;
    const asOfTimes = (asOfInputs || [options.as_of]).map(a => (a ? new Date(a) : new Date()));
    if (asOfTimes.some(t => isNaN(t.getTime()))) {
      throw new Error('Invalid as_of datetime. Use ISO8601 format like 2024-01-01T00:00:00+05:30');
    }
    const asOf = asOfTimes[0];
    const levels = options.levels || 6;
    const compact = options.output === 'chain' || Boolean(asOfInputs);

    const ephePath = process.env.SE_EPHE_PATH || '/app/vendor/swisseph';
    const positionFlag = positionType === 'true' ? ' -true' : '';
    const base = `SE_EPHE_PATH=${ephePath} swetest ${this.swissTimeArgs(date)} ${ayanamsa.flag}${positionFlag} -g, -head`;

    // Birth-time sweep: Vimshottari chains, lagna and cusp sub-lords per birth time
    if (options.birth_time_sweep) {
      const moon = createEphemeris(ephePath).series('Moon', date, 1, 1, { siderealFlag: ayanamsa.flag, positionFlag })[0];
      const swept = this.runBirthSweep({
        datetime,
        date,
        sweep: options.birth_time_sweep,
        asOfTimes,
        levels,
        main: { system: 'vimshottari', ayanamsaKey, kalachakraAyanamsaKey: ayanamsaKey, yearDays, positionFlag },
        eventTests: options.event_tests || [],
        sweepOutput: options.sweep_output || 'auto',
        place: { latitude, longitude },
        chartItems: true,
        varga: options.vargaLagnaKey || null,
      });
      return {
        settings: this.chartSettings({ ayanamsa, positionType, nodeType, yearDays }),
        birth_time_sensitivity: this.birthTimeSensitivity(moon.speed, this.vimshottariStart(moon.lon), this.kalachakraStart(moon.lon)),
        ...swept,
        note: swept.sweep_output === 'ranges'
          ? 'Each range lists the birth times (inclusive, in step_seconds steps) that give the same Vimshottari chain at every as_of date (chains[k] belongs to as_of[k]), the same lagna and the same cusp sub-lords.'
          : 'Each flip is a birth-time offset (seconds from datetime) where that value changes; at_start is the value at from_seconds.',
        datetime,
        coordinates: { latitude, longitude },
      };
    }

    // 0-9 = Sun through Pluto, m = mean Node, t = true Node; l = decimal longitude, s = daily speed
    const nodeCode = nodeType === 'true' ? 't' : 'm';
    const planetOutput = execSync(`${base} -p0123456789${nodeCode} -fPls`, { encoding: 'utf8' });
    const houseOutput = execSync(`${base} -p -house${longitude},${latitude},P -fPl`, { encoding: 'utf8' });
    // Without -head, swetest prints the ayanamsa in use (also for user-defined ones)
    const ayanamsaOutput = execSync(base.replace(' -head', '') + ' -p0', { encoding: 'utf8' });

    const planets = {};
    for (const [name, lon, speed] of this.swetestRows(planetOutput)) {
      const planetName = name.endsWith('Node') ? 'Rahu' : name;
      planets[planetName] = { longitude: parseFloat(lon), speed: parseFloat(speed) };
    }
    if (planets.Rahu) {
      planets.Ketu = { longitude: (planets.Rahu.longitude + 180) % 360, speed: planets.Rahu.speed };
    }

    const cusps = {};
    let ascendantLon = null;
    let mcLon = null;
    for (const [name, lon] of this.swetestRows(houseOutput)) {
      const houseMatch = name.match(/^house\s+(\d+)$/);
      if (houseMatch) cusps[parseInt(houseMatch[1])] = parseFloat(lon);
      else if (name === 'Ascendant') ascendantLon = parseFloat(lon);
      else if (name === 'MC') mcLon = parseFloat(lon);
    }
    if (ascendantLon === null || Object.keys(cusps).length !== 12) {
      throw new Error('Failed to parse house cusps from swetest output');
    }

    const ayanamsaMatch = ayanamsaOutput.match(/ayanamsa\s*=\s*(\d+)°\s*(\d+)'\s*([\d.]+)/);
    const ayanamsaValue = ayanamsaMatch
      ? parseInt(ayanamsaMatch[1]) + parseInt(ayanamsaMatch[2]) / 60 + parseFloat(ayanamsaMatch[3]) / 3600
      : null;

    const lagnaSign = Math.floor(ascendantLon / 30);

    // KP house: the Placidus cusp interval the planet falls in
    const kpHouseOf = (lon) => {
      for (let h = 1; h <= 12; h++) {
        const start = cusps[h];
        const end = cusps[h === 12 ? 1 : h + 1];
        const span = (end - start + 360) % 360;
        if ((lon - start + 360) % 360 < span) return h;
      }
      return null;
    };

    const planetData = {};
    for (const [name, p] of Object.entries(planets)) {
      const signIndex = Math.floor(p.longitude / 30);
      const isNode = name === 'Rahu' || name === 'Ketu';
      planetData[name] = {
        ...this.describeSiderealPoint(p.longitude),
        // Vedic convention treats Rahu/Ketu as always retrograde (the true node can briefly move forward)
        retrograde: isNode ? true : p.speed < 0,
        speed: Math.round(p.speed * 10000) / 10000,
        house_whole_sign: ((signIndex - lagnaSign + 12) % 12) + 1,
        house_kp: kpHouseOf(p.longitude),
      };
    }

    const houses = {};
    for (let h = 1; h <= 12; h++) {
      houses[h] = this.describeSiderealPoint(cusps[h]);
    }

    const moonLon = planets.Moon.longitude;
    const vimshottari = this.vimshottariStart(moonLon);
    const kalachakra = this.kalachakraStart(moonLon);

    // One clock covers both dasha systems, from the earliest period start to the latest end
    const sunTable = yearDays ? null : this.makeSunTableForYears(
      date.getTime(),
      { ephePath, siderealFlag: ayanamsa.flag, positionFlag },
      Math.min(-vimshottari.elapsedYears, kalachakra.firstStartYears),
      Math.max(120 - vimshottari.elapsedYears, kalachakra.lastEndYears)
    );
    const clock = this.makeDashaClock(date.getTime(), { sunTable, yearDays });
    const dashaOptions = { levels, compact, asOfList: asOfInputs ? asOfTimes.map(t => t.getTime()) : null };
    const formatTime = this.makeTimeFormatter(datetime);
    const yearDescription = yearDays
      ? `${yearDays} days`
      : 'true sidereal solar year (one sidereal revolution of the Sun, as in Jagannatha Hora)';

    return {
      zodiac: 'sidereal',
      ayanamsa: {
        name: ayanamsa.name,
        value: ayanamsaValue !== null ? Math.round(ayanamsaValue * 1000000) / 1000000 : null,
        value_dms: ayanamsaValue !== null ? this.formatDms(ayanamsaValue) : null,
      },
      position_type: positionType,
      node_type: nodeType,
      house_system: 'Placidus (for KP cusps); house_whole_sign counts from the Lagna sign',
      lagna: this.describeSiderealPoint(ascendantLon),
      midheaven: mcLon !== null ? this.describeSiderealPoint(mcLon) : null,
      planets: planetData,
      houses,
      birth_time_sensitivity: this.birthTimeSensitivity(planets.Moon.speed, vimshottari, kalachakra),
      vimshottari_dasha: this.calculateVimshottari(vimshottari, date.getTime(), clock, formatTime, asOf, yearDescription, dashaOptions),
      kalachakra_dasha: this.calculateKalachakra(kalachakra, clock, formatTime, asOf, yearDescription, { ...dashaOptions, ayanamsaName: ayanamsa.name }),
      datetime,
      coordinates: { latitude, longitude },
    };
  }

  // The settings a chart was calculated with
  chartSettings({ ayanamsa, positionType, nodeType, yearDays, extra = {} }) {
    return {
      ayanamsa: ayanamsa.name,
      positions: positionType,
      nodes: nodeType,
      house_system: 'Placidus (KP cusps); whole-sign houses from the lagna sign',
      dasha_year: yearDays ? `${yearDays} days` : 'true sidereal solar year',
      kalachakra: 'SM Singh method, from the Moon in D-1, Rohini 4th pada as Leo',
      ...extra,
    };
  }

  swetestRows(output) {
    return output.split('\n')
      .map(line => line.split(',').map(part => part.trim()))
      .filter(parts => parts.length >= 2 && parts[1] !== '' && !isNaN(parseFloat(parts[1])));
  }

  // swetest date arguments for an instant, keeping fractional seconds
  swissTimeArgs(date) {
    const ms = date.getUTCMilliseconds();
    const time = this.formatTimeToSwiss(date) + (ms ? `.${String(ms).padStart(3, '0')}` : '');
    return `-b${this.formatDateToSwiss(date)} -ut${time}`;
  }

  // Sidereal Sun longitude (unwrapped, so it keeps increasing past 360) and speed every
  // STEP days from fromMs to toMs, with lookups in both directions by cubic Hermite
  // interpolation. One table can serve several birth times (see makeDashaClock).
  makeSunTable({ ephePath, siderealFlag, positionFlag, fromMs, toMs }) {
    const STEP = 2;
    const CHUNK = 18000; // swetest prints at most 36525 lines per call
    const count = Math.ceil((toMs - fromMs) / (STEP * DAY_MS)) + 1;
    const lons = [];
    const speeds = [];
    for (let s = 0; s < count; s += CHUNK) {
      const n = Math.min(CHUNK, count - s);
      const start = new Date(fromMs + s * STEP * DAY_MS);
      const output = execSync(
        `SE_EPHE_PATH=${ephePath} swetest ${this.swissTimeArgs(start)} ` +
        `${siderealFlag}${positionFlag} -p0 -fls -g, -head -n${n} -s${STEP}`,
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
      );
      this.swetestRows(output).forEach(([lon, speed]) => {
        lons.push(parseFloat(lon));
        speeds.push(parseFloat(speed));
      });
    }
    if (lons.length !== count) {
      throw new Error('Failed to compute the solar year table from swetest');
    }
    for (let i = 1; i < lons.length; i++) {
      while (lons[i] < lons[i - 1]) lons[i] += 360;
    }

    // Cubic Hermite value and slope at fraction x between grid points i and i + 1
    const hermite = (i, x) => {
      const p0 = lons[i];
      const p1 = lons[i + 1];
      const m0 = speeds[i] * STEP;
      const m1 = speeds[i + 1] * STEP;
      const x2 = x * x;
      const x3 = x2 * x;
      return {
        value: (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * m1,
        slope: (6 * x2 - 6 * x) * p0 + (3 * x2 - 4 * x + 1) * m0 + (-6 * x2 + 6 * x) * p1 + (3 * x2 - 2 * x) * m1,
      };
    };

    return {
      covers: (ms) => ms >= fromMs && ms <= fromMs + (count - 1) * STEP * DAY_MS,
      lonAt: (ms) => {
        const pos = Math.min(Math.max((ms - fromMs) / (STEP * DAY_MS), 0), count - 1.000001);
        const i = Math.floor(pos);
        return hermite(i, pos - i).value;
      },
      // Time (ms) at which the unwrapped longitude reaches `target`, or null outside the table
      msAtLon: (target) => {
        if (target < lons[0] || target > lons[count - 1]) return null;
        let lo = 0;
        let hi = count - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (lons[mid] <= target) lo = mid; else hi = mid;
        }
        let x = (target - lons[lo]) / (lons[hi] - lons[lo]);
        for (let k = 0; k < 6; k++) {
          const { value, slope } = hermite(lo, x);
          x -= (value - target) / slope;
        }
        return fromMs + (lo + x) * STEP * DAY_MS;
      },
    };
  }

  // Returns a function converting dasha years (relative to birth) to a timestamp in ms.
  // With yearDays, a year is a fixed number of days. Otherwise a year is one sidereal
  // revolution of the true Sun, so N years have passed when the sidereal Sun has moved
  // N * 360 degrees from its birth position (Jagannatha Hora's true sidereal solar years).
  makeDashaClock(birthMs, { sunTable, yearDays }) {
    if (yearDays) {
      return (years) => birthMs + years * yearDays * DAY_MS;
    }
    const birthLon = sunTable.lonAt(birthMs);
    return (years) => sunTable.msAtLon(birthLon + years * 360) ?? birthMs + years * SIDEREAL_YEAR_DAYS * DAY_MS;
  }

  // Sun table covering [fromYears, toYears] around a birth time (plus a year of margin)
  makeSunTableForYears(birthMs, settings, fromYears, toYears) {
    return this.makeSunTable({
      ...settings,
      fromMs: birthMs + (fromYears - 1) * SIDEREAL_YEAR_DAYS * DAY_MS,
      toMs: birthMs + (toYears + 1) * SIDEREAL_YEAR_DAYS * DAY_MS,
    });
  }

  // Kalachakra gati (jump) when the dasha moves from sign `a` to sign `b`. Markati (monkey)
  // is the Cancer-Leo step taken between frog jumps; `prevGati`/`nextIsManduka` give that context.
  kalachakraGati(a, b, neighbourIsManduka) {
    const d = (b - a + 12) % 12;
    if (d === 4 || d === 8) return 'Simhavalokana';
    if (d === 2 || d === 10) return 'Manduka';
    if ((d === 1 || d === 11) && ((a === 3 && b === 4) || (a === 4 && b === 3)) && neighbourIsManduka) return 'Markati';
    if (d === 1 || d === 11) return null;
    return 'other jump';
  }

  // Sets p.gati on each period of a sibling list from the sign change into it
  markGatis(periods) {
    const raw = periods.map((p, i) => (i ? this.kalachakraGati(periods[i - 1].sign, p.sign, false) : null));
    periods.forEach((p, i) => {
      if (!i) return;
      const neighbourIsManduka = raw[i - 1] === 'Manduka' || raw[i + 1] === 'Manduka';
      p.gati = this.kalachakraGati(periods[i - 1].sign, p.sign, neighbourIsManduka);
    });
    return periods;
  }

  // Human-readable time remaining, e.g. "12d 04:33:10"
  formatDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const days = Math.floor(total / 86400);
    const rest = total % 86400;
    const hh = String(Math.floor(rest / 3600)).padStart(2, '0');
    const mm = String(Math.floor((rest % 3600) / 60)).padStart(2, '0');
    const ss = String(rest % 60).padStart(2, '0');
    return `${days}d ${hh}:${mm}:${ss}`;
  }

  // Adds DEFAULT_BIRTH_OFFSET to an ISO datetime that has no UTC offset
  withDefaultOffset(datetime) {
    if (typeof datetime !== 'string' || /(Z|[+-]\d{2}:?\d{2})$/i.test(datetime.trim())) return datetime;
    const trimmed = datetime.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00${DEFAULT_BIRTH_OFFSET}`;
    return /T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00${DEFAULT_BIRTH_OFFSET}` : `${trimmed}${DEFAULT_BIRTH_OFFSET}`;
  }

  // Formats a timestamp as wall-clock time in an IANA timezone, e.g.
  // "2026-09-12 14:14:26 AEST (UTC+10:00)", using that zone's daylight-saving rules
  makeZoneFormatter(timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset',
    });
    const names = ['en-US', 'en-AU', 'en-GB', 'en-IN', 'en-NZ', 'en-CA'].map(locale =>
      new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }));
    return (ms) => {
      const date = new Date(ms);
      const p = Object.fromEntries(parts.formatToParts(date).map(x => [x.type, x.value]));
      const offset = p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName.replace('GMT', '');
      const abbreviation = names
        .map(f => f.formatToParts(date).find(x => x.type === 'timeZoneName').value)
        .find(n => !/^(GMT|UTC)/.test(n));
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${abbreviation ? `${abbreviation} ` : ''}(UTC${offset})`;
    };
  }

  // Adds start_local/end_local (and as_of_local) next to every start/end in a dasha result
  addLocalTimes(value, formatLocal) {
    if (Array.isArray(value)) {
      value.forEach(v => this.addLocalTimes(v, formatLocal));
    } else if (value && typeof value === 'object') {
      for (const key of ['start', 'end', 'as_of']) {
        if (typeof value[key] === 'string') value[`${key}_local`] = formatLocal(new Date(value[key]).getTime());
      }
      Object.values(value).forEach(v => this.addLocalTimes(v, formatLocal));
    }
    return value;
  }

  // Applies the optional current_timezone to the dasha parts of a result
  withCurrentTimezone(result, datetime, currentTimezone, dashaKeys) {
    result.birth_timezone = /[+-]\d{2}:?\d{2}$/.test(datetime) ? `UTC${datetime.slice(-6)}` : 'UTC';
    if (datetime !== result.datetime_input) result.birth_timezone += ' (assumed IST: no offset given)';
    delete result.datetime_input;
    if (currentTimezone) {
      const formatLocal = this.makeZoneFormatter(currentTimezone);
      result.current_timezone = currentTimezone;
      dashaKeys.forEach(key => this.addLocalTimes(result[key], formatLocal));
    }
    return result;
  }

  // Formats timestamps in the UTC offset given with the birth datetime (e.g. +05:30), else UTC
  makeTimeFormatter(datetime) {
    const match = datetime.match(/([+-])(\d{2}):?(\d{2})$/);
    const offsetMinutes = match ? (match[1] === '-' ? -1 : 1) * (parseInt(match[2]) * 60 + parseInt(match[3])) : 0;
    const suffix = match ? `${match[1]}${match[2]}:${match[3]}` : 'Z';
    return (ms) => {
      const local = new Date(Math.round(ms / 1000) * 1000 + offsetMinutes * 60000);
      return local.toISOString().replace(/\.\d{3}Z$/, suffix);
    };
  }

  describeSiderealPoint(lon) {
    const signIndex = Math.floor(lon / 30);
    const degreeInSign = lon - signIndex * 30;
    const nakshatraIndex = Math.floor(lon / NAKSHATRA_SPAN);
    const posInNakshatra = lon - nakshatraIndex * NAKSHATRA_SPAN;
    const pada = Math.floor(posInNakshatra / (NAKSHATRA_SPAN / 4)) + 1;

    // KP sub and sub-sub: divide the nakshatra (then the sub) in proportion to the
    // Vimshottari years, starting from the lord of the division being split
    const starLord = DASHA_ORDER[nakshatraIndex % 9];
    const sub = this.subdivide(starLord, NAKSHATRA_SPAN, posInNakshatra);
    const subSub = this.subdivide(sub.lord, sub.length, sub.offset);

    return {
      longitude: Math.round(lon * 1000000) / 1000000,
      sign: SIGNS[signIndex],
      sign_lord: SIGN_LORDS[signIndex],
      degree: Math.round(degreeInSign * 10000) / 10000,
      degree_dms: this.formatDms(degreeInSign),
      nakshatra: NAKSHATRAS[nakshatraIndex],
      nakshatra_pada: pada,
      star_lord: starLord,
      sub_lord: sub.lord,
      sub_sub_lord: subSub.lord,
    };
  }

  subdivide(startLord, length, offset) {
    // Walk the 9 Vimshottari lords from startLord, each taking length * years / 120
    const startIndex = DASHA_ORDER.indexOf(startLord);
    let cursor = 0;
    for (let i = 0; i < 9; i++) {
      const lord = DASHA_ORDER[(startIndex + i) % 9];
      const part = length * DASHA_YEARS[lord] / 120;
      if (offset < cursor + part || i === 8) {
        return { lord, length: part, offset: offset - cursor };
      }
      cursor += part;
    }
  }

  // Running chain (down to `levels`) at time t, or [] when t is outside the dashas
  dashaChainAt(t, mahadashas, subPeriods, levels) {
    const find = (periods) => periods.find(p => t >= p.startMs && t < p.endMs) || null;
    const chain = [];
    let level = find(mahadashas);
    while (level && chain.length < levels) {
      chain.push(level);
      level = chain.length < levels ? find(subPeriods(level)) : null;
    }
    return chain;
  }

  // The `current` block: each level with time remaining and the period that follows it
  // at the same level (which can fall under the next parent period)
  describeCurrentChain(t, engine, levels, formatTime, label) {
    const chain = this.dashaChainAt(t, engine.mahadashas, engine.subPeriods, levels);
    if (!chain.length) return null;
    const current = { as_of: formatTime(t) };
    chain.forEach((p, i) => {
      const nextChain = this.dashaChainAt(p.endMs + 1, engine.mahadashas, engine.subPeriods, i + 1);
      const next = nextChain.length > i ? nextChain[i] : null;
      current[DASHA_LEVELS[i]] = {
        ...engine.fmt(p),
        ends_in: this.formatDuration(p.endMs - t),
        next: next ? { ...engine.fmt(next), starts_in: this.formatDuration(next.startMs - t) } : null,
      };
    });
    current.chain = chain.map(label).join('-');
    return current;
  }

  // Compact chains for several dates: just the labels and each level's start/end
  describeChains(times, engine, levels, formatTime, label) {
    return times.map(t => {
      const chain = this.dashaChainAt(t, engine.mahadashas, engine.subPeriods, levels);
      return {
        as_of: formatTime(t),
        chain: chain.map(label).join('-') || null,
        periods: chain.map((p, i) => ({ level: DASHA_LEVELS[i], ...engine.fmt(p) })),
      };
    });
  }

  vimshottariStart(moonLon) {
    const nakshatraIndex = Math.floor(moonLon / NAKSHATRA_SPAN);
    const elapsedFraction = (moonLon - nakshatraIndex * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
    const firstLord = DASHA_ORDER[nakshatraIndex % 9];
    return {
      nakshatraIndex,
      elapsedFraction,
      firstLord,
      // The birth dasha started before birth; only its remaining fraction runs after birth
      elapsedYears: elapsedFraction * DASHA_YEARS[firstLord],
    };
  }

  // Vimshottari periods in years relative to birth (no clock): the mahadashas and a
  // function giving the sub-periods of any period
  vimshottariRaw(start) {
    const { firstLord, elapsedYears } = start;
    const firstIndex = DASHA_ORDER.indexOf(firstLord);
    const mahadashas = [];
    let cursor = -elapsedYears;
    for (let i = 0; i < 9; i++) {
      const lord = DASHA_ORDER[(firstIndex + i) % 9];
      mahadashas.push({ lord, start: cursor, end: cursor + DASHA_YEARS[lord] });
      cursor += DASHA_YEARS[lord];
    }
    // Each lord takes its share of the parent, starting from the parent lord
    const sub = (parent) => {
      const startIndex = DASHA_ORDER.indexOf(parent.lord);
      const length = parent.end - parent.start;
      const periods = [];
      let c = parent.start;
      for (let i = 0; i < 9; i++) {
        const lord = DASHA_ORDER[(startIndex + i) % 9];
        const part = length * DASHA_YEARS[lord] / 120;
        periods.push({ lord, start: c, end: c + part });
        c += part;
      }
      return periods;
    };
    return { mahadashas, sub, label: (p) => p.lord };
  }

  vimshottariEngine(start, clock, formatTime) {
    const raw = this.vimshottariRaw(start);
    // Periods are built in years relative to birth, then turned into times with the clock
    const timed = (p) => ({ ...p, startMs: clock(p.start), endMs: clock(p.end) });
    const fmt = (p) => ({ lord: p.lord, start: formatTime(p.startMs), end: formatTime(p.endMs) });
    return { mahadashas: raw.mahadashas.map(timed), subPeriods: (parent) => raw.sub(parent).map(timed), fmt, raw };
  }

  // Running chain at `years` after birth using only year arithmetic (fast; for sweeps)
  chainAtYears(raw, years, levels) {
    const chain = [];
    let periods = raw.mahadashas;
    while (chain.length < levels) {
      const found = periods.find(p => years >= p.start && years < p.end);
      if (!found) break;
      chain.push(found);
      if (chain.length < levels) periods = raw.sub(found);
    }
    return chain;
  }

  calculateVimshottari(start, birthMs, clock, formatTime, asOf, yearDescription, { levels = 6, compact = false, asOfList } = {}) {
    const { nakshatraIndex, elapsedFraction, firstLord } = start;
    const engine = this.vimshottariEngine(start, clock, formatTime);
    const label = (p) => p.lord;

    return {
      moon_nakshatra: NAKSHATRAS[nakshatraIndex],
      balance_at_birth: {
        lord: firstLord,
        years: Math.round((1 - elapsedFraction) * DASHA_YEARS[firstLord] * 10000) / 10000,
      },
      year: yearDescription,
      ...(asOfList
        ? { chains: this.describeChains(asOfList, engine, levels, formatTime, label) }
        : { current: this.describeCurrentChain(asOf.getTime(), engine, levels, formatTime, label) }),
      ...(compact ? {} : {
        mahadashas: engine.mahadashas.map(p => ({
          lord: p.lord,
          start: formatTime(Math.max(p.startMs, birthMs)),
          end: formatTime(p.endMs),
          antardashas: engine.subPeriods(p)
            .filter(ad => ad.endMs > birthMs)
            .map(ad => ({
              lord: ad.lord,
              start: formatTime(Math.max(ad.startMs, birthMs)),
              end: formatTime(ad.endMs),
            })),
        })),
      }),
    };
  }

  // Kalachakra cycle (9 signs) whose Kalachakra navamsa is `sign`, with the absolute padas (0-107)
  // its entries stand for: the savya stream positions 9 * sign to 9 * sign + 8.
  // An apasavya cycle (only used for the Moon's own pada) is the savya cycle read backwards.
  kalachakraCycle(savya, sign) {
    const signs = KC_SAVYA[sign % 8];
    const positions = signs.map((_, i) => 9 * sign + i);
    return savya
      ? { signs, positions }
      : { signs: [...signs].reverse(), positions: positions.reverse() };
  }

  isSavyaPada(pada) {
    return Math.floor(Math.floor(pada / 4) / 3) % 2 === 0;
  }

  // Kalachakra navamsa of an absolute pada (0-107): savya padas use their own navamsa,
  // apasavya padas the mirrored order (Rohini 4 = Leo)
  kalachakraNavamsa(pada) {
    const nakshatra = Math.floor(pada / 4);
    return this.isSavyaPada(pada) ? pada % 12 : KC_APASAVYA_NAVAMSAS[4 * (nakshatra % 3) + (pada % 4)];
  }

  kalachakraStart(moonLon) {
    const padaSpan = NAKSHATRA_SPAN / 4;
    const pada = Math.floor(moonLon / padaSpan);
    const savya = this.isSavyaPada(pada);
    const sign = this.kalachakraNavamsa(pada);
    const cycle = this.kalachakraCycle(savya, sign);
    const paramayush = cycle.signs.reduce((sum, s) => sum + KC_YEARS[s], 0);

    // SM Singh: the elapsed fraction of the Moon's pada is applied to the whole cycle
    const elapsedFraction = (moonLon - pada * padaSpan) / padaSpan;
    const elapsedYears = elapsedFraction * paramayush;
    let firstIndex = 0;
    let cumulative = 0;
    while (cumulative + KC_YEARS[cycle.signs[firstIndex]] <= elapsedYears) {
      cumulative += KC_YEARS[cycle.signs[firstIndex]];
      firstIndex++;
    }
    return {
      pada,
      savya,
      sign,
      cycle,
      paramayush,
      firstIndex,
      firstStartYears: cumulative - elapsedYears,
      lastEndYears: cumulative - elapsedYears + paramayush,
    };
  }

  // Kalachakra periods in years relative to birth (no clock)
  kalachakraRaw(start) {
    const { savya, cycle, firstIndex, firstStartYears } = start;
    // Mahadashas run strictly through the cycle, returning to its beginning after the last sign
    const mahadashas = [];
    let cursor = firstStartYears;
    for (let i = 0; i < 9; i++) {
      const index = (firstIndex + i) % 9;
      const s = cycle.signs[index];
      mahadashas.push({
        sign: s,
        position: cycle.positions[index],
        start: cursor,
        end: cursor + KC_YEARS[s],
        cycleRestart: i > 0 && index === 0,
      });
      cursor += KC_YEARS[s];
    }
    // SM Singh: sub-periods of a period come from the pada it stands for, the way the
    // mahadashas come from the Moon's pada: the cycle of that pada's Kalachakra navamsa from
    // its start, each sign taking its share of the parent in proportion to its years. The
    // cycle runs forward when the pada has the same direction (savya/apasavya) as the Moon's
    // pada and backward otherwise (checked against Jagannatha Hora down to deha level).
    const sub = (parent) => {
      const forward = this.isSavyaPada(parent.position) === savya;
      const c = this.kalachakraCycle(forward, this.kalachakraNavamsa(parent.position));
      const total = c.signs.reduce((sum, x) => sum + KC_YEARS[x], 0);
      const length = parent.end - parent.start;
      const periods = [];
      let at = parent.start;
      c.signs.forEach((x, i) => {
        const part = length * KC_YEARS[x] / total;
        periods.push({ sign: x, position: c.positions[i], start: at, end: at + part });
        at += part;
      });
      return periods;
    };
    return { mahadashas, sub, label: (p) => SIGN_ABBR[p.sign] };
  }

  kalachakraEngine(start, clock, formatTime) {
    const padaName = (q) => `${NAKSHATRAS[Math.floor(q / 4)]} ${(q % 4) + 1}`;
    const timed = (p) => ({ ...p, startMs: clock(p.start), endMs: clock(p.end) });
    const raw = this.kalachakraRaw(start);
    const subPeriods = (parent) => this.markGatis(raw.sub(parent).map(timed));
    const mahadashas = this.markGatis(raw.mahadashas.map(timed));

    const fmt = (p) => ({
      sign: SIGNS[p.sign],
      sign_abbr: SIGN_ABBR[p.sign],
      pada: padaName(p.position),
      ...(p.gati ? { gati: p.gati } : {}),
      ...(p.cycleRestart ? { cycle_restart: true } : {}),
      start: formatTime(p.startMs),
      end: formatTime(p.endMs),
    });
    return { mahadashas, subPeriods, fmt, padaName, raw };
  }

  // Kalachakra dasha by the SM Singh method. `levels` is how deep the running chain goes
  // (3 = to pratyantardasha, 6 = to deha); `drillDown` is an optional path of sign
  // abbreviations (e.g. ['Ta', 'Vi']) whose sub-periods are listed, like dividing a period in JHora.
  // `compact` leaves out the full mahadasha/antardasha tree; `asOfList` gives chains for several dates.
  calculateKalachakra(start, clock, formatTime, asOf, yearDescription, { levels = 6, drillDown, compact = false, asOfList, ayanamsaName } = {}) {
    const { pada, savya, sign, cycle, paramayush } = start;
    const engine = this.kalachakraEngine(start, clock, formatTime);
    const label = (p) => SIGN_ABBR[p.sign];

    let drilled;
    if (drillDown && drillDown.length) {
      let periods = engine.mahadashas;
      const path = [];
      for (const abbr of drillDown) {
        // A sign can occur twice in a cycle; take the first occurrence
        const match = periods.find(p => SIGN_ABBR[p.sign].toLowerCase() === String(abbr).toLowerCase());
        if (!match) {
          throw new Error(`drill_down: ${abbr} is not one of ${periods.map(p => SIGN_ABBR[p.sign]).join(', ')}`);
        }
        path.push(match);
        periods = engine.subPeriods(match);
      }
      drilled = {
        path: path.map((p, i) => ({ level: DASHA_LEVELS[i], ...engine.fmt(p) })),
        [`${DASHA_LEVELS[Math.min(path.length, 5)]}s`]: periods.map(engine.fmt),
      };
    }

    const first = cycle.signs[0];
    const last = cycle.signs[8];
    return {
      method: 'SM Singh: dasa sesham fraction applied to the full cycle; mahadashas strictly from the cycle (back to its start after the last sign); sub-periods found from each period\'s pada the way mahadashas are found from the Moon\'s pada',
      ayanamsa: `${ayanamsaName} (Kalachakra is very sensitive to the ayanamsa: another ayanamsa can move the whole timeline by months or years)`,
      from: 'Moon (D-1)',
      direction: savya ? 'Savya' : 'Apasavya',
      moon_pada: engine.padaName(pada),
      navamsa: SIGNS[sign],
      paramayush,
      deha: SIGN_ABBR[savya ? first : last],
      jiva: SIGN_ABBR[savya ? last : first],
      year: yearDescription,
      gati_legend: 'gati marks the jump into a period: Simhavalokana (lion, trinal jump), Manduka (frog, jump over a sign), Markati (monkey, the Cancer-Leo step between frog jumps), other jump (e.g. where the cycle restarts); cycle_restart marks a mahadasha where the SM Singh cycle begins again',
      ...(asOfList
        ? { chains: this.describeChains(asOfList, engine, levels, formatTime, label) }
        : { current: this.describeCurrentChain(asOf.getTime(), engine, levels, formatTime, label) }),
      ...(drilled ? { drill_down: drilled } : {}),
      ...(compact ? {} : {
        mahadashas: engine.mahadashas.map(p => ({
          ...engine.fmt(p),
          antardashas: engine.subPeriods(p).map(engine.fmt),
        })),
      }),
    };
  }

  // Days by which each dasha system's boundaries move per second of birth time. The Moon's
  // motion moves the elapsed part of the birth dasha; a later birth moves boundaries earlier.
  birthTimeSensitivity(moonSpeed, vimshottari, kalachakra) {
    const moonPerSecond = moonSpeed / 86400;
    const round = (v) => Math.round(v * 10000) / 10000;
    return {
      kalachakra_days_per_birth_second: round(moonPerSecond / (NAKSHATRA_SPAN / 4) * kalachakra.paramayush * SIDEREAL_YEAR_DAYS),
      vimshottari_days_per_birth_second: round(moonPerSecond / NAKSHATRA_SPAN * DASHA_YEARS[vimshottari.firstLord] * SIDEREAL_YEAR_DAYS),
      note: 'A birth time 1 s later moves every boundary this many days earlier (and the reverse). The Moon at birth sets these, so they hold for the whole timeline.',
    };
  }

  // Formats an instant in a fixed UTC offset with milliseconds when present
  formatInstant(ms, datetime) {
    const match = datetime.match(/([+-])(\d{2}):?(\d{2})$/);
    const offsetMinutes = match ? (match[1] === '-' ? -1 : 1) * (parseInt(match[2]) * 60 + parseInt(match[3])) : 0;
    const suffix = match ? `${match[1]}${match[2]}:${match[3]}` : 'Z';
    const iso = new Date(ms + offsetMinutes * 60000).toISOString();
    return (iso.endsWith('.000Z') ? iso.replace('.000Z', '') : iso.replace('Z', '')) + suffix;
  }

  // Kalachakra dasha alone, with Jagannatha Hora's settings: Traditional Lahiri (unless
  // ayanamsa_override is given, for research comparisons only), true positions, true sidereal
  // solar years and the SM Singh method
  calculateKalachakraDasha(datetime, options = {}) {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) {
      throw invalid('datetime', 'Invalid datetime format. Use ISO8601 like 1999-06-06T15:30:00+05:30');
    }
    const asOfInputs = Array.isArray(options.as_of) ? options.as_of : null;
    const asOfTimes = (asOfInputs || [options.as_of]).map(a => (a ? new Date(a) : new Date()));
    if (asOfTimes.some(t => isNaN(t.getTime()))) {
      throw invalid('as_of', 'Invalid as_of datetime. Use ISO8601 like 2024-01-01T00:00:00+05:30');
    }
    const levels = options.levels || 6;

    const ayanamsaKey = options.ayanamsa_override || 'traditional_lahiri';
    const ayanamsa = AYANAMSAS[ayanamsaKey];
    const positionFlag = ' -true';
    const ephePath = process.env.SE_EPHE_PATH || '/app/vendor/swisseph';
    const sunSettings = { ephePath, siderealFlag: ayanamsa.flag, positionFlag };
    const yearDescription = 'true sidereal solar year (one sidereal revolution of the Sun, as in Jagannatha Hora)';
    const settings = {
      ayanamsa: ayanamsa.name,
      ...(options.ayanamsa_override ? { ayanamsa_override: options.ayanamsa_override } : {}),
      positions: 'true',
      year: 'true sidereal solar years',
      method: 'SM Singh (full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa)',
      starting_point: 'Janma tara (Moon), Rasi (D-1)',
      rohini_4th_pada: 'Leo navamsa',
    };
    const ayanamsaNote = options.ayanamsa_override && ayanamsaKey !== 'traditional_lahiri'
      ? `WARNING: computed with ${ayanamsa.name} for comparison only. Kalachakra is extremely sensitive to the ayanamsa (a KP ayanamsa moved one test timeline by about 23 months); the Jagannatha Hora standard is Traditional Lahiri.`
      : 'Kalachakra here uses Traditional Lahiri (the Jagannatha Hora standard); another ayanamsa can move the whole timeline by months or years.';

    // Moon longitude and speed at one instant
    const [moon] = createEphemeris(ephePath).series('Moon', date, 1, 1, { siderealFlag: ayanamsa.flag, positionFlag });

    // Birth-time sweep: chains per as_of date for each candidate birth time, as ranges or flips,
    // plus event tests
    const sweep = options.birth_time_sweep;
    if (sweep) {
      const swept = this.runBirthSweep({
        datetime,
        date,
        sweep,
        asOfTimes,
        levels,
        main: { system: 'kalachakra', ayanamsaKey, kalachakraAyanamsaKey: ayanamsaKey },
        eventTests: options.event_tests || [],
        sweepOutput: options.sweep_output || 'auto',
        place: options.place,
      });
      const start = this.kalachakraStart(moon.lon);
      return {
        settings,
        ayanamsa_note: ayanamsaNote,
        birth_time_sensitivity: this.birthTimeSensitivity(moon.speed, this.vimshottariStart(moon.lon), start),
        ...swept,
        note: swept.sweep_output === 'ranges'
          ? 'Each range lists the birth times (inclusive, in step_seconds steps) that give the same chain at every as_of date; chains[k] belongs to as_of[k]. Use a lower levels value for wider ranges.'
          : 'Each flip is a birth-time offset (seconds from datetime) where the chain at that as_of date changes; at_start is the chain at from_seconds.',
        datetime,
      };
    }

    const start = this.kalachakraStart(moon.lon);
    const gatiList = options.gati_list;
    const fromYears = Math.min(start.firstStartYears, gatiList ? -1 : 0);
    const sunTable = this.makeSunTableForYears(date.getTime(), sunSettings, fromYears, start.lastEndYears);
    const clock = this.makeDashaClock(date.getTime(), { sunTable });
    const compact = options.output === 'chain' || Boolean(asOfInputs) || Boolean(gatiList);
    const formatTime = this.makeTimeFormatter(datetime);

    const result = {
      settings,
      moon: this.describeSiderealPoint(moon.lon),
      birth_time_sensitivity: this.birthTimeSensitivity(moon.speed, this.vimshottariStart(moon.lon), start),
      ...this.calculateKalachakra(start, clock, formatTime, asOfTimes[0], yearDescription, {
        levels,
        drillDown: options.drill_down,
        compact,
        asOfList: asOfInputs ? asOfTimes.map(t => t.getTime()) : null,
        ayanamsaName: ayanamsa.name,
      }),
      ...(options.ayanamsa_override ? { ayanamsa_warning: ayanamsaNote } : {}),
      datetime,
    };

    if (gatiList) {
      const engine = this.kalachakraEngine(start, clock, formatTime);
      const entries = this.kalachakraGatiList(engine, {
        fromMs: gatiList.fromMs,
        toMs: gatiList.toMs,
        levels: gatiList.levels,
        types: gatiList.types,
        nearEvents: gatiList.nearEvents,
        formatTime,
      });
      const fitted = fitToBudget(entries, MAX_SWEEP_CHARS / 2);
      result.gati_list = {
        from: formatTime(gatiList.fromMs),
        to: formatTime(gatiList.toMs),
        levels: DASHA_LEVELS.slice(0, gatiList.levels),
        types: gatiList.types,
        count: entries.length,
        jumps: fitted.kept,
        ...(fitted.truncated ? { truncated: true, truncated_hint: 'Too many jumps for one response: shorten from/to, lower levels or filter types.' } : {}),
      };
      delete result.gati_legend;
    }
    return result;
  }

  // Flat list of Kalachakra jumps (gatis) starting between fromMs and toMs, down to `levels`.
  // Jumps are found on the time-ordered sequence at each level, so a jump into the first
  // sub-period of a new parent (from the last sub-period of the previous one) is included.
  kalachakraGatiList(engine, { fromMs, toMs, levels, types, nearEvents, formatTime }) {
    const wanted = new Set(types);
    const entries = [];
    // Periods overlapping [fromMs, toMs] at each level, plus the one just before the window
    let current = engine.mahadashas.map(p => ({ p, path: [SIGN_ABBR[p.sign]] }));
    for (let level = 1; level <= levels; level++) {
      const ordered = current;
      const signs = ordered.map(x => x.p.sign);
      const plain = signs.map((s, i) => (i ? this.kalachakraGati(signs[i - 1], s, false) : null));
      ordered.forEach((x, i) => {
        if (x.p.startMs < fromMs || x.p.startMs > toMs) return;
        const prev = i ? ordered[i - 1] : null;
        const neighbourIsManduka = plain[i - 1] === 'Manduka' || plain[i + 1] === 'Manduka';
        const gati = prev ? this.kalachakraGati(prev.p.sign, x.p.sign, neighbourIsManduka) : null;
        const restart = level === 1 && x.p.cycleRestart;
        const add = (type) => {
          if (!wanted.has(type)) return;
          const entry = {
            level: DASHA_LEVELS[level - 1],
            path: x.path.join('/'),
            from_sign: prev ? SIGN_ABBR[prev.p.sign] : null,
            to_sign: SIGN_ABBR[x.p.sign],
            type,
            start: formatTime(x.p.startMs),
            end: formatTime(x.p.endMs),
            ...(prev && prev.path.slice(0, -1).join('/') !== x.path.slice(0, -1).join('/') ? { across_parent_boundary: true } : {}),
          };
          if (nearEvents.length) {
            const nearest = nearEvents.reduce((a, b) => (Math.abs(b - x.p.startMs) < Math.abs(a - x.p.startMs) ? b : a));
            entry.nearest_event = formatTime(nearest);
            // Negative: the event comes before the jump
            entry.event_gap_days = round((nearest - x.p.startMs) / DAY_MS, 3);
          }
          entries.push(entry);
        };
        if (gati) add(gati);
        if (restart) add('cycle_restart');
      });
      if (level === levels) break;
      // Descend into the periods that overlap the window, keeping one period of context before it
      const overlapping = ordered.filter(x => x.p.endMs > fromMs && x.p.startMs <= toMs);
      const firstIndex = ordered.indexOf(overlapping[0]);
      const parents = firstIndex > 0 ? [ordered[firstIndex - 1], ...overlapping] : overlapping;
      const next = [];
      for (const parent of parents) {
        for (const child of engine.subPeriods(parent.p)) next.push({ p: child, path: [...parent.path, SIGN_ABBR[child.sign]] });
      }
      const firstInside = next.findIndex(x => x.p.endMs > fromMs);
      current = next.slice(Math.max(0, firstInside - 1)).filter(x => x.p.startMs <= toMs);
    }
    entries.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    return entries;
  }

  // Shared birth-time sweep for calculate_kalachakra_dasha and calculate_vedic_chart.
  // `main` is the dasha shown per as_of date; `eventTests` are evaluated per birth time;
  // `place` (latitude/longitude) enables lagna and cusp items and house-based expectations.
  runBirthSweep({ datetime, date, sweep, asOfTimes, levels, main, eventTests = [], sweepOutput = 'auto', place = null, chartItems = false, varga = null }) {
    const eph = createEphemeris();
    const positionFlag = main.positionFlag ?? ' -true';
    const birthMs = date.getTime();
    const offsets = sampleOffsets(sweep.from_seconds, sweep.to_seconds, sweep.step_seconds);
    const first = new Date(birthMs + offsets[0] * 1000);
    const formatTime = this.makeTimeFormatter(datetime);
    const birthAt = (offset) => this.formatInstant(birthMs + offset * 1000, datetime);
    const allDates = [...asOfTimes.map(t => t.getTime()), ...eventTests.map(t => t.asOfMs)];
    const span = [Math.min(birthMs + offsets[0] * 1000, ...allDates), Math.max(birthMs + offsets[offsets.length - 1] * 1000, ...allDates)];

    // One Moon series and one Sun table per ayanamsa (and year length) in use
    const models = new Map();
    const modelFor = (ayanamsaKey, yearDays) => {
      const key = `${ayanamsaKey}|${yearDays || ''}`;
      if (models.has(key)) return models.get(key);
      const settings = { siderealFlag: AYANAMSAS[ayanamsaKey].flag, positionFlag };
      const moons = eph.series('Moon', first, offsets.length, sweep.step_seconds / 86400, settings);
      const moonAt = makeLongitudeInterpolator(offsets[0], sweep.step_seconds, moons);
      const sunTable = yearDays ? null : this.makeSunTable({
        ephePath: process.env.SE_EPHE_PATH || '/app/vendor/swisseph',
        ...settings,
        fromMs: span[0] - 22 * SIDEREAL_YEAR_DAYS * DAY_MS,
        toMs: span[1] + 22 * SIDEREAL_YEAR_DAYS * DAY_MS,
      });
      const sunLon = new Map();
      const lonAt = (ms) => {
        if (!sunLon.has(ms)) sunLon.set(ms, sunTable.lonAt(ms));
        return sunLon.get(ms);
      };
      const model = {
        moonAt,
        speed: moons[Math.floor(moons.length / 2)].speed,
        // Dasha years between a birth time and a date
        yearsBetween: (b, t) => (yearDays ? (t - b) / (yearDays * DAY_MS) : (lonAt(t) - sunTable.lonAt(b)) / 360),
        clock: (b) => this.makeDashaClock(b, { sunTable, yearDays }),
      };
      models.set(key, model);
      return model;
    };

    const rawFor = (system, lon) => (system === 'kalachakra'
      ? this.kalachakraRaw(this.kalachakraStart(lon))
      : this.vimshottariRaw(this.vimshottariStart(lon)));
    const chainAt = (system, model, offset, tMs, depth) => {
      const raw = rawFor(system, model.moonAt(offset));
      return { raw, chain: this.chainAtYears(raw, model.yearsBetween(birthMs + offset * 1000, tMs), depth) };
    };
    const label = (system, model, offset, tMs, depth) => {
      const { raw, chain } = chainAt(system, model, offset, tMs, depth);
      return chain.map(raw.label).join('-') || null;
    };

    // Lagna and cusps (for chart items and house-based expectations)
    let houseAt = null;
    if (place) {
      const settings = { siderealFlag: AYANAMSAS[main.ayanamsaKey].flag, positionFlag };
      const series = eph.housesSeries(first, offsets.length, sweep.step_seconds, place.latitude, place.longitude, settings);
      const asc = makeLinearInterpolator(offsets[0], sweep.step_seconds, series.map(h => h.asc));
      const cusps = Array.from({ length: 12 }, (_, i) => makeLinearInterpolator(offsets[0], sweep.step_seconds, series.map(h => h.cusps[i + 1])));
      houseAt = (offset) => ({ asc: asc(offset), cusps: cusps.map(c => c(offset)) });
    }

    const mainModel = modelFor(main.ayanamsaKey, main.yearDays);
    const series = asOfTimes.map((t) => ({
      kind: 'as_of',
      as_of: formatTime(t.getTime()),
      keyAt: (o) => label(main.system, mainModel, o, t.getTime(), levels),
    }));
    if (chartItems && houseAt) {
      const lagnaKey = (o) => {
        const p = this.describeSiderealPoint(houseAt(o).asc);
        return `${SIGN_ABBR[SIGNS.indexOf(p.sign)]} ${p.nakshatra} ${p.nakshatra_pada} sub ${p.sub_lord}`;
      };
      series.push({ kind: 'chart', item: 'lagna', keyAt: lagnaKey });
      series.push({
        kind: 'chart',
        item: 'cusp_sub_lords',
        keyAt: (o) => houseAt(o).cusps.map((c, i) => `${i + 1}:${PLANET_ABBR[this.describeSiderealPoint(c).sub_lord]}`).join(' '),
      });
      if (varga) {
        series.push({ kind: 'chart', item: 'varga_lagnas', keyAt: (o) => varga(houseAt(o).asc) });
      }
    }
    const keys = series.map(s => offsets.map(o => s.keyAt(o)));

    const result = {
      birth_times_checked: offsets.length,
      levels: DASHA_LEVELS.slice(0, levels),
      as_of: asOfTimes.map(t => formatTime(t.getTime())),
    };

    // Ranges: consecutive birth times with identical values merged
    const buildRanges = () => {
      const ranges = [];
      offsets.forEach((o, i) => {
        const values = keys.map(k => k[i]);
        const last = ranges[ranges.length - 1];
        if (last && last.values.every((v, k) => v === values[k])) {
          last.to_offset_seconds = roundOffset(o);
          last.birth_to = birthAt(o);
          last.count++;
        } else {
          ranges.push({ from_offset_seconds: roundOffset(o), to_offset_seconds: roundOffset(o), birth_from: birthAt(o), birth_to: birthAt(o), count: 1, values });
        }
      });
      return ranges.map(({ values, ...r }) => {
        const out = { ...r, chains: values.slice(0, asOfTimes.length) };
        series.forEach((s, k) => { if (s.kind === 'chart') out[s.item] = values[k]; });
        return out;
      });
    };
    // Flips: per series, the refined birth offsets where its value changes. Within the
    // budget each series gets an equal share; only flips that fit are refined.
    const buildFlips = (budget) => {
      const heads = series.map((s, k) => ({ ...(s.kind === 'as_of' ? { as_of: s.as_of } : { item: s.item }), at_start: keys[k][0] }));
      const overhead = heads.reduce((n, h) => n + JSON.stringify(h).length + 20, 0);
      const changes = keys.map(countChanges);
      const sample = (withTime) => {
        const avgKey = Math.max(8, ...keys.map(k => (k[0] || '').length));
        return 2 * avgKey + (withTime ? 70 : 40);
      };
      const total = changes.reduce((a, b) => a + b, 0);
      const withTime = overhead + total * sample(true) <= budget;
      const share = Math.max(1, Math.floor((budget - overhead) / Math.max(1, series.length) / sample(withTime)));
      let truncated = false;
      const lists = series.map((s, k) => {
        const flips = flipsOf(offsets, keys[k], s.keyAt, share);
        const items = flips.map(f => ({ at_s: roundOffset(f.at), ...(withTime ? { birth_time: birthAt(f.at) } : {}), from: f.from, to: f.to }));
        const out = { ...heads[k], flips: items };
        if (flips.total > items.length) {
          truncated = true;
          out.flips_total = flips.total;
        }
        return out;
      });
      return { lists, truncated, withTime };
    };

    // Event tests first: their size is part of the response budget
    if (eventTests.length) {
      result.event_tests = this.evaluateEventTests({ eventTests, offsets, modelFor, chainAt, houseAt, main, birthMs, birthAt, formatTime });
    }
    // Leave room for the header (settings, sensitivity, notes) added by the calling tool
    const budget = MAX_SWEEP_CHARS - JSON.stringify(result).length - 3000;

    let mode = sweepOutput;
    if (mode === 'auto') {
      const ranges = buildRanges();
      if (JSON.stringify(ranges).length <= budget) {
        result.sweep_output = 'ranges';
        result.ranges = ranges;
      } else {
        mode = 'flips';
        result.note_output = 'The ranges were too large for one response, so only the flip points are returned (sweep_output "flips").';
      }
    } else if (mode === 'ranges') {
      const fitted = fitToBudget(buildRanges(), budget);
      result.sweep_output = 'ranges';
      result.ranges = fitted.kept;
      if (fitted.truncated) {
        result.truncated = true;
        result.truncated_hint = 'Too many ranges for one response. Narrow birth_time_sweep, use fewer as_of dates or a lower levels value, or use sweep_output "flips".';
      }
    }
    if (mode === 'flips') {
      const { lists, truncated, withTime } = buildFlips(budget);
      result.sweep_output = 'flips';
      if (!withTime) result.flip_time_note = 'birth_time was left out of each flip to save space: the birth time is datetime + at_s seconds.';
      result.flips = lists;
      if (truncated) {
        result.truncated = true;
        result.truncated_hint = 'Some flip lists were cut to fit one response (see flips_total). Narrow birth_time_sweep, or use fewer as_of dates or a lower levels value.';
      }
    }
    return result;
  }

  // Passing birth-time windows per event test, their intersection, the best subset when
  // they don't all agree, and how close each event is to a dasha boundary
  evaluateEventTests({ eventTests, offsets, modelFor, chainAt, houseAt, main, birthMs, birthAt }) {
    // Refined edges, plus the first and last sampled birth times inside the window
    const describeWindow = (w) => ({
      from_s: roundOffset(w.from),
      to_s: roundOffset(w.to),
      width_s: roundOffset(w.to - w.from),
      grid_from_s: roundOffset(offsets.find(o => o >= w.from - 1e-9) ?? w.from),
      grid_to_s: roundOffset([...offsets].reverse().find(o => o <= w.to + 1e-9) ?? w.to),
      birth_from: birthAt(w.from),
      birth_to: birthAt(w.to),
      ...(w.openStart ? { open_start: true } : {}),
      ...(w.openEnd ? { open_end: true } : {}),
    });

    const evaluators = eventTests.map((test) => {
      const ayanamsaKey = test.ayanamsa || (test.system === 'kalachakra' ? main.kalachakraAyanamsaKey : main.ayanamsaKey);
      const model = modelFor(ayanamsaKey, test.system === 'vimshottari' ? main.yearDays : null);
      // Signs or lords that count as a pass at this birth time
      const expected = (offset) => {
        if (test.expect.labels) return test.expect.labels;
        const ref = test.expect.house_from_lagna
          ? Math.floor(houseAt(offset).asc / 30)
          : Math.floor(model.moonAt(offset) / 30);
        const houses = test.expect.house_from_lagna || test.expect.house_from_moon;
        return houses.map(h => SIGN_ABBR[(ref + h - 1) % 12]);
      };
      const passAt = (offset) => {
        const { raw, chain } = chainAt(test.system, model, offset, test.asOfMs, test.level);
        return chain.length === test.level && expected(offset).includes(raw.label(chain[test.level - 1]));
      };
      return { test, model, ayanamsaKey, passAt };
    });

    const windows = evaluators.map(e => passWindows(offsets, offsets.map(e.passAt), e.passAt));
    let intersection = windows[0];
    for (const w of windows.slice(1)) intersection = intersectWindows(intersection, w);

    const out = {
      tests: evaluators.map((e, k) => ({
        id: e.test.id,
        as_of: e.test.as_of,
        system: e.test.system,
        level: DASHA_LEVELS[e.test.level - 1],
        ayanamsa: AYANAMSAS[e.ayanamsaKey].name,
        expect: e.test.expectDescription,
        passes_at_given_birth_time: e.passAt(0),
        windows: windows[k].map(describeWindow),
      })),
      intersection: intersection.map(describeWindow),
    };

    let basis = { offset: 0, reason: 'the given birth time (no passing window)' };
    if (intersection.length) {
      const widest = intersection.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
      basis = { offset: (widest.from + widest.to) / 2, reason: 'middle of the widest window in the intersection' };
    } else {
      const best = bestSubset(windows, offsets[0], offsets[offsets.length - 1]);
      if (best.count > 0) {
        out.best_subset = best.sets.map(set => ({
          passing: set.passing.map(k => eventTests[k].id),
          failing: eventTests.map((t, k) => (set.passing.includes(k) ? null : t.id)).filter(Boolean),
          window: describeWindow({ from: set.from, to: set.to }),
        }));
        const first = best.sets.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
        basis = { offset: (first.from + first.to) / 2, reason: `middle of the widest best-subset window (${best.count} of ${eventTests.length} tests pass)` };
      }
    }

    // Junction: days from each event to the nearest boundary of its tested period and of the
    // period one level down (negative = the event is before that boundary)
    out.junction = {
      at_offset_s: roundOffset(basis.offset),
      birth_time: birthAt(basis.offset),
      basis: basis.reason,
      tests: evaluators.map((e) => {
        const b = birthMs + basis.offset * 1000;
        const clock = e.model.clock(b);
        const depth = Math.min(6, e.test.level + 1);
        const { raw, chain } = chainAt(e.test.system, e.model, basis.offset, e.test.asOfMs, depth);
        const nearest = (p) => {
          if (!p) return null;
          const startMs = clock(p.start);
          const endMs = clock(p.end);
          const toStart = e.test.asOfMs - startMs;
          const toEnd = e.test.asOfMs - endMs;
          const useStart = Math.abs(toStart) <= Math.abs(toEnd);
          return { days: round(((useStart ? toStart : toEnd) / DAY_MS), 3), boundary: useStart ? 'start' : 'end', period: raw.label(p) };
        };
        return {
          id: e.test.id,
          tested_level: nearest(chain[e.test.level - 1]),
          next_level: e.test.level < 6 ? nearest(chain[e.test.level]) : null,
        };
      }),
    };
    return out;
  }

  formatDms(value) {
    let d = Math.floor(value);
    let m = Math.floor((value - d) * 60);
    let s = Math.round(((value - d) * 60 - m) * 60);
    if (s === 60) { s = 0; m += 1; }
    if (m === 60) { m = 0; d += 1; }
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
  }

  // as_of may be one date or a list of dates; each gets IST when it has no offset
  normalizeAsOf(asOf) {
    if (asOf === undefined) return undefined;
    if (Array.isArray(asOf)) {
      if (!asOf.length || asOf.length > MAX_AS_OF_DATES || asOf.some(a => typeof a !== 'string')) {
        throw new McpError(ErrorCode.InvalidParams, `as_of must be a date string or a list of 1 to ${MAX_AS_OF_DATES} date strings`);
      }
      return asOf.map(a => this.withDefaultOffset(a));
    }
    if (typeof asOf !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'as_of must be a date string or a list of date strings');
    }
    return this.withDefaultOffset(asOf);
  }

  validateDashaOutput({ levels, output }) {
    if (levels !== undefined && (!Number.isInteger(levels) || levels < 1 || levels > 6)) {
      throw new McpError(ErrorCode.InvalidParams, 'levels must be an integer from 1 (mahadasha) to 6 (deha)');
    }
    if (output !== undefined && output !== 'full' && output !== 'chain') {
      throw new McpError(ErrorCode.InvalidParams, 'output must be "full" or "chain"');
    }
  }

  // birth_time_sweep, sweep_output and their size limits
  validateSweep(args, asOfList) {
    const sweep = args.birth_time_sweep;
    if (args.sweep_output !== undefined && !['auto', 'ranges', 'flips'].includes(args.sweep_output)) {
      throw invalid('sweep_output', 'sweep_output must be "auto", "ranges" or "flips"');
    }
    if (sweep === undefined) {
      if (args.sweep_output !== undefined) throw invalid('sweep_output', 'sweep_output needs birth_time_sweep');
      return;
    }
    const { from_seconds: from, to_seconds: to, step_seconds: step } = sweep || {};
    if (![from, to, step].every(v => typeof v === 'number' && isFinite(v)) || step <= 0 || to < from) {
      throw invalid('birth_time_sweep', 'birth_time_sweep needs numbers from_seconds <= to_seconds and step_seconds > 0');
    }
    const candidates = Math.floor((to - from) / step + 1e-9) + 1;
    const dates = Array.isArray(asOfList) ? asOfList.length : 1;
    if (candidates > MAX_SWEEP_CANDIDATES || candidates * dates > MAX_SWEEP_CHAINS) {
      throw invalid('birth_time_sweep', `birth_time_sweep is limited to ${MAX_SWEEP_CANDIDATES} birth times and ${MAX_SWEEP_CHAINS} chains (birth times x as_of dates); this request has ${candidates} x ${dates}. Use a larger step_seconds or a narrower range.`);
    }
  }

  // Latitude/longitude when both are given (optional for Kalachakra)
  optionalPlace(args) {
    const { latitude, longitude } = args;
    if (latitude === undefined && longitude === undefined) return null;
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) throw invalid('latitude', 'latitude must be a number between -90 and 90');
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) throw invalid('longitude', 'longitude must be a number between -180 and 180');
    return { latitude, longitude };
  }

  // event_tests: [{ id, as_of, system, level, expect, ayanamsa }]
  normalizeEventTests(tests, defaultSystem, hasSweep, place) {
    if (tests === undefined) return [];
    if (!hasSweep) throw invalid('event_tests', 'event_tests needs birth_time_sweep (the tests are evaluated for every birth time in the sweep)');
    if (!Array.isArray(tests) || !tests.length || tests.length > MAX_EVENT_TESTS) {
      throw invalid('event_tests', `event_tests must be a list of 1 to ${MAX_EVENT_TESTS} tests`);
    }
    const lordNames = { su: 'Sun', sun: 'Sun', mo: 'Moon', moon: 'Moon', ma: 'Mars', mars: 'Mars', me: 'Mercury', merc: 'Mercury', mercury: 'Mercury', ju: 'Jupiter', jup: 'Jupiter', jupiter: 'Jupiter', ve: 'Venus', ven: 'Venus', venus: 'Venus', sa: 'Saturn', sat: 'Saturn', saturn: 'Saturn', ra: 'Rahu', rah: 'Rahu', rahu: 'Rahu', ke: 'Ketu', ket: 'Ketu', ketu: 'Ketu' };
    const ids = new Set();
    return tests.map((t, i) => {
      const where = `event_tests[${i}]`;
      if (!t || typeof t !== 'object') throw invalid('event_tests', `${where} must be an object`);
      const id = t.id === undefined ? `test${i + 1}` : String(t.id);
      if (ids.has(id)) throw invalid('event_tests', `${where}: duplicate id "${id}"`);
      ids.add(id);
      const system = t.system || defaultSystem;
      if (!['kalachakra', 'vimshottari'].includes(system)) throw invalid('event_tests', `${where}.system must be "kalachakra" or "vimshottari"`);
      if (typeof t.as_of !== 'string') throw invalid('event_tests', `${where}.as_of must be a date string`);
      const asOf = this.withDefaultOffset(t.as_of);
      const asOfMs = new Date(asOf).getTime();
      if (isNaN(asOfMs)) throw invalid('event_tests', `${where}.as_of is not a valid date`);
      if (!Number.isInteger(t.level) || t.level < 1 || t.level > 6) throw invalid('event_tests', `${where}.level must be an integer from 1 (mahadasha) to 6 (deha)`);
      if (t.ayanamsa !== undefined && !AYANAMSAS[t.ayanamsa]) throw invalid('event_tests', `${where}.ayanamsa must be one of: ${Object.keys(AYANAMSAS).join(', ')}`);
      let expect;
      if (Array.isArray(t.expect) && t.expect.length) {
        const labels = t.expect.map((x) => {
          const v = String(x).trim().toLowerCase();
          if (system === 'kalachakra') {
            const index = SIGN_ABBR.findIndex((a, k) => a.toLowerCase() === v || SIGNS[k].toLowerCase() === v);
            if (index < 0) throw invalid('event_tests', `${where}.expect: "${x}" is not a sign (use Ar Ta Ge Cn Le Vi Li Sc Sg Cp Aq Pi)`);
            return SIGN_ABBR[index];
          }
          if (!lordNames[v]) throw invalid('event_tests', `${where}.expect: "${x}" is not a Vimshottari lord`);
          return lordNames[v];
        });
        expect = { labels };
      } else if (t.expect && typeof t.expect === 'object' && (t.expect.house_from_lagna || t.expect.house_from_moon)) {
        const houses = t.expect.house_from_lagna || t.expect.house_from_moon;
        if (system !== 'kalachakra') throw invalid('event_tests', `${where}.expect: house_from_lagna/house_from_moon only apply to Kalachakra (signs); give Vimshottari lords as a list`);
        if (!Array.isArray(houses) || !houses.length || houses.some(h => !Number.isInteger(h) || h < 1 || h > 12)) {
          throw invalid('event_tests', `${where}.expect houses must be a list of integers 1-12`);
        }
        if (t.expect.house_from_lagna && !place) throw invalid('event_tests', `${where}.expect.house_from_lagna needs latitude and longitude`);
        expect = t.expect.house_from_lagna ? { house_from_lagna: houses } : { house_from_moon: houses };
      } else {
        throw invalid('event_tests', `${where}.expect must be a list of signs/lords or {"house_from_lagna": [...]} / {"house_from_moon": [...]}`);
      }
      return { id, as_of: asOf, asOfMs, system, level: t.level, ayanamsa: t.ayanamsa, expect, expectDescription: t.expect };
    });
  }

  // gati_list: { from, to, levels, types, near_events }
  normalizeGatiList(g) {
    if (g === undefined) return undefined;
    const types = ['Simhavalokana', 'Manduka', 'Markati', 'other jump', 'cycle_restart'];
    if (!g || typeof g !== 'object') throw invalid('gati_list', 'gati_list must be an object like {"from": "2020-01-01", "to": "2030-01-01"}');
    const from = new Date(this.withDefaultOffset(g.from)).getTime();
    const to = new Date(this.withDefaultOffset(g.to)).getTime();
    if (isNaN(from) || isNaN(to) || to < from) throw invalid('gati_list', 'gati_list.from and gati_list.to must be dates with from <= to');
    const levels = g.levels === undefined ? 3 : g.levels;
    if (!Number.isInteger(levels) || levels < 1 || levels > 6) throw invalid('gati_list', 'gati_list.levels must be an integer from 1 to 6');
    const chosen = g.types === undefined ? types : g.types;
    if (!Array.isArray(chosen) || chosen.some(t => !types.includes(t))) throw invalid('gati_list', `gati_list.types must list some of: ${types.join(', ')}`);
    const near = g.near_events === undefined ? [] : g.near_events;
    if (!Array.isArray(near) || near.length > MAX_AS_OF_DATES) throw invalid('gati_list', `gati_list.near_events must be a list of up to ${MAX_AS_OF_DATES} dates`);
    const nearEvents = near.map(d => new Date(this.withDefaultOffset(d)).getTime());
    if (nearEvents.some(isNaN)) throw invalid('gati_list', 'gati_list.near_events must contain valid dates');
    return { fromMs: from, toMs: to, levels, types: chosen, nearEvents };
  }

  validateTimezone(timeZone) {
    if (timeZone === undefined) return;
    try {
      if (typeof timeZone !== 'string') throw new Error();
      new Intl.DateTimeFormat('en-US', { timeZone });
    } catch {
      throw new McpError(
        ErrorCode.InvalidParams,
        'current_timezone must be an IANA timezone name, e.g. Australia/Melbourne, Europe/London, America/New_York'
      );
    }
  }

  async handleToolCall(name, args) {
    switch (name) {
      case 'calculate_planetary_positions':
        const { datetime, latitude, longitude } = args;
        
        if (!datetime || typeof datetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'datetime parameter is required and must be a string'
          );
        }
        
        if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'latitude must be a number between -90 and 90'
          );
        }
        
        if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'longitude must be a number between -180 and 180'
          );
        }

        return this.calculateEphemeris(datetime, latitude, longitude);

      case 'calculate_transits':
        const { birth_datetime, latitude: birth_latitude, longitude: birth_longitude } = args;
        
        if (!birth_datetime || typeof birth_datetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'birth_datetime parameter is required and must be a string'
          );
        }
        
        if (typeof birth_latitude !== 'number' || birth_latitude < -90 || birth_latitude > 90) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'birth_latitude must be a number between -90 and 90'
          );
        }
        
        if (typeof birth_longitude !== 'number' || birth_longitude < -180 || birth_longitude > 180) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'birth_longitude must be a number between -180 and 180'
          );
        }

        // Calculate birth chart
        const natalChart = this.calculateEphemeris(birth_datetime, birth_latitude, birth_longitude);
 
         // Calculate current transits
         const currentDate = new Date();
         const currentISOString = currentDate.toISOString();
         const currentEphemeris = this.calculateEphemeris(currentISOString, birth_latitude, birth_longitude);
 
         return {
           natal_chart: natalChart,
           current_transits: currentEphemeris,
           calculation_time: currentISOString
         };

      case 'calculate_solar_revolution':
        const { birth_datetime: sr_birth_datetime, birth_latitude: sr_birth_latitude, birth_longitude: sr_birth_longitude, return_year, return_latitude, return_longitude } = args;

        if (!sr_birth_datetime || typeof sr_birth_datetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'birth_datetime parameter is required and must be a string'
          );
        }

        if (typeof sr_birth_latitude !== 'number' || sr_birth_latitude < -90 || sr_birth_latitude > 90) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'birth_latitude must be a number between -90 and 90'
          );
        }

        if (typeof sr_birth_longitude !== 'number' || sr_birth_longitude < -180 || sr_birth_longitude > 180) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'birth_longitude must be a number between -180 and 180'
          );
        }

        if (typeof return_year !== 'number' || return_year < 1900 || return_year > 2100) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'return_year must be a number between 1900 and 2100'
          );
        }

        // Calculate birth chart to get natal Sun position
        const srNatalChart = this.calculateEphemeris(sr_birth_datetime, sr_birth_latitude, sr_birth_longitude);
        const natalSunLongitude = srNatalChart.planets.Sun.longitude;

        // Calculate solar return chart for the given year
        // Use the birthday in the return year as a starting point
        const birthDate = new Date(sr_birth_datetime);
        const returnDate = new Date(return_year, birthDate.getMonth(), birthDate.getDate(), birthDate.getHours(), birthDate.getMinutes(), birthDate.getSeconds());
        
        // Use return location if provided, otherwise use birth location
        const returnLat = return_latitude !== undefined ? return_latitude : sr_birth_latitude;
        const returnLon = return_longitude !== undefined ? return_longitude : sr_birth_longitude;
        
        // Calculate the solar return chart at the approximate return date
        const solarReturnChart = this.calculateEphemeris(returnDate.toISOString(), returnLat, returnLon);

        return {
          natal_chart: srNatalChart,
          solar_return_chart: {
            planets: solarReturnChart.planets,
            houses: solarReturnChart.houses,
            chart_points: solarReturnChart.chart_points,
            additional_points: solarReturnChart.additional_points,
            datetime: returnDate.toISOString(),
            coordinates: {
              latitude: returnLat,
              longitude: returnLon
            }
          },
          natal_sun_longitude: natalSunLongitude,
          return_sun_longitude: solarReturnChart.planets.Sun.longitude,
          calculation_time: new Date().toISOString()
        };

      case 'calculate_synastry':
        const { person1_datetime, person1_latitude, person1_longitude, person2_datetime, person2_latitude, person2_longitude } = args;

        if (!person1_datetime || typeof person1_datetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'person1_datetime parameter is required and must be a string'
          );
        }

        if (typeof person1_latitude !== 'number' || person1_latitude < -90 || person1_latitude > 90) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'person1_latitude must be a number between -90 and 90'
          );
        }

        if (typeof person1_longitude !== 'number' || person1_longitude < -180 || person1_longitude > 180) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'person1_longitude must be a number between -180 and 180'
          );
        }

        if (!person2_datetime || typeof person2_datetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'person2_datetime parameter is required and must be a string'
          );
        }

        if (typeof person2_latitude !== 'number' || person2_latitude < -90 || person2_latitude > 90) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'person2_latitude must be a number between -90 and 90'
          );
        }

        if (typeof person2_longitude !== 'number' || person2_longitude < -180 || person2_longitude > 180) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'person2_longitude must be a number between -180 and 180'
          );
        }

        // Calculate person 1's natal chart
        const person1NatalChart = this.calculateEphemeris(person1_datetime, person1_latitude, person1_longitude);

        // Calculate person 2's natal chart
        const person2NatalChart = this.calculateEphemeris(person2_datetime, person2_latitude, person2_longitude);

        // Calculate aspects between the two charts
        const aspects = this.calculateSynastryAspects(person1NatalChart.planets, person2NatalChart.planets);

        return {
          person1_chart: person1NatalChart,
          person2_chart: person2NatalChart,
          synastry_aspects: aspects,
          calculation_time: new Date().toISOString()
        };

      case 'calculate_vedic_chart': {
        const { datetime: vedicDatetime, latitude: vedicLatitude, longitude: vedicLongitude, ayanamsa, position_type, node_type, as_of, dasha_year_days } = args;

        if (!vedicDatetime || typeof vedicDatetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'datetime parameter is required and must be a string'
          );
        }

        if (typeof vedicLatitude !== 'number' || vedicLatitude < -90 || vedicLatitude > 90) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'latitude must be a number between -90 and 90'
          );
        }

        if (typeof vedicLongitude !== 'number' || vedicLongitude < -180 || vedicLongitude > 180) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'longitude must be a number between -180 and 180'
          );
        }

        if (ayanamsa !== undefined && !AYANAMSAS[ayanamsa]) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `ayanamsa must be one of: ${Object.keys(AYANAMSAS).join(', ')}`
          );
        }

        if (position_type !== undefined && position_type !== 'true' && position_type !== 'apparent') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'position_type must be "true" or "apparent"'
          );
        }

        if (node_type !== undefined && node_type !== 'mean' && node_type !== 'true') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'node_type must be "mean" or "true"'
          );
        }

        if (dasha_year_days !== undefined && (typeof dasha_year_days !== 'number' || dasha_year_days < 300 || dasha_year_days > 400)) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'dasha_year_days must be a number between 300 and 400'
          );
        }

        this.validateTimezone(args.current_timezone);
        this.validateDashaOutput(args);
        const vedicAsOf = this.normalizeAsOf(as_of);
        this.validateSweep(args, vedicAsOf);
        const vedicEventTests = this.normalizeEventTests(args.event_tests, 'vimshottari', Boolean(args.birth_time_sweep), { latitude: vedicLatitude, longitude: vedicLongitude });
        const vedicBirth = this.withDefaultOffset(vedicDatetime);
        const vedicResult = this.calculateVedicChart(vedicBirth, vedicLatitude, vedicLongitude, {
          birth_time_sweep: args.birth_time_sweep,
          sweep_output: args.sweep_output,
          event_tests: vedicEventTests,
          ayanamsa,
          position_type,
          node_type,
          as_of: vedicAsOf,
          dasha_year_days,
          levels: args.levels,
          output: args.output,
        });
        vedicResult.datetime_input = vedicDatetime;
        return this.withCurrentTimezone(vedicResult, vedicBirth, args.current_timezone, ['vimshottari_dasha', 'kalachakra_dasha']);
      }

      case 'calculate_kalachakra_dasha': {
        const { datetime: kcDatetime, as_of: kcAsOf, drill_down } = args;

        if (!kcDatetime || typeof kcDatetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'datetime parameter is required and must be a string'
          );
        }

        if (drill_down !== undefined && (!Array.isArray(drill_down) || drill_down.length > 5 || drill_down.some(d => typeof d !== 'string'))) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'drill_down must be an array of up to 5 sign abbreviations, e.g. ["Ta", "Vi"]'
          );
        }

        this.validateTimezone(args.current_timezone);
        this.validateDashaOutput(args);
        const kcAsOfList = this.normalizeAsOf(kcAsOf);
        const sweep = args.birth_time_sweep;
        this.validateSweep(args, kcAsOfList);
        if (args.ayanamsa_override !== undefined && !AYANAMSAS[args.ayanamsa_override]) {
          throw invalid('ayanamsa_override', `ayanamsa_override must be one of: ${Object.keys(AYANAMSAS).join(', ')}`);
        }
        const place = this.optionalPlace(args);
        const eventTests = this.normalizeEventTests(args.event_tests, 'kalachakra', Boolean(sweep), place);
        const kcBirth = this.withDefaultOffset(kcDatetime);
        const kcResult = this.calculateKalachakraDasha(kcBirth, {
          as_of: kcAsOfList,
          drill_down,
          levels: args.levels,
          output: args.output,
          birth_time_sweep: sweep,
          sweep_output: args.sweep_output,
          event_tests: eventTests,
          ayanamsa_override: args.ayanamsa_override,
          gati_list: this.normalizeGatiList(args.gati_list),
          place,
        });
        kcResult.datetime_input = kcDatetime;
        return this.withCurrentTimezone(kcResult, kcBirth, args.current_timezone, ['current', 'chains', 'drill_down', 'mahadashas']);
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  }

  async run() {
    // Check if we should run as HTTP server (for ngrok) or stdio
    const useHttp = process.env.MCP_HTTP_MODE === 'true';
    
    if (useHttp) {
      // HTTP mode for ngrok
      const port = process.env.PORT || 8000;

      console.log('Starting HTTP server for ngrok...');
      console.log(`Port: ${port}`);

      const app = express();
      app.use(express.json());

      // Map to store transports by session ID
      const transports = {};

      // SSE endpoint for Claude MCP Connector
      app.all('/mcp', async (req, res) => {
        try {
          // Extract client IP and location info from standard proxy headers
          const forwarded = req.headers['x-forwarded-for'];
          const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.socket.remoteAddress;
          const userAgent = req.headers['user-agent'] || 'unknown';
          const country = req.headers['x-appengine-country'] || req.headers['x-client-geo-country'] || 'unknown';
          const city = req.headers['x-appengine-city'] || req.headers['x-client-geo-city'] || null;

          // Extract JSON-RPC / MCP metadata
          const mcpMethod = req.body?.method || 'unknown';
          const toolName = req.body?.params?.name || null;
          const toolArguments = req.body?.params?.arguments || null;
          const clientSessionId = req.headers['mcp-session-id'] || null;

          // Output structured JSON log for Google Cloud Logging
          console.log(JSON.stringify({
            severity: 'INFO',
            message: toolName
              ? `MCP tool call: ${toolName} from ${clientIp}`
              : `MCP ${req.method} ${mcpMethod} from ${clientIp}`,
            client: {
              ip: clientIp,
              country,
              city,
              userAgent,
            },
            mcp: {
              httpMethod: req.method,
              sessionId: clientSessionId,
              jsonrpcMethod: mcpMethod,
              tool: toolName,
              arguments: toolArguments,
            },
          }));
          
          // This server never sends server-initiated messages, so refuse the optional
          // long-lived GET stream; on Cloud Run an open stream is billed as a busy instance
          if (req.method === 'GET') {
            res.set('Allow', 'POST, DELETE');
            return res.status(405).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Method not allowed: this server does not offer an SSE stream',
              },
              id: null,
            });
          }

          // Check for existing session ID
          const sessionId = req.headers['mcp-session-id'];
          let transport;

          if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
          } else if (!sessionId && this.isInitializeRequest(req.body)) {
            // New initialization request
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => Math.random().toString(36).substring(2, 15),
            });

            transport.onclose = () => {
              if (transport.sessionId) delete transports[transport.sessionId];
            };

            // Connect a fresh MCP server for this session
            await this.createServer().connect(transport);
            
            // Handle the request first, then store the transport
            await transport.handleRequest(req, res, req.body);
            
            // Store the transport by session ID after handling the request
            if (transport.sessionId) {
              transports[transport.sessionId] = transport;
              console.log(`✅ New session created and stored: ${transport.sessionId}`);
            }
            
            return; // Exit early since we already handled the request
          } else if (sessionId) {
            // Unknown session (e.g. the server restarted); 404 tells the client to start a new session
            return res.status(404).json({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: 'Session not found',
              },
              id: null,
            });
          } else {
            // Invalid request
            return res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            });
          }

          // Handle the request using the transport (for existing sessions)
          await transport.handleRequest(req, res, req.body);
        } catch (error) {
          console.error('Error handling MCP request:', error);
          if (!res.headersSent) {
            res.status(500).json({ 
              error: 'Internal server error', 
              details: error.message 
            });
          }
        }
      });

      // Health check endpoint
      app.get('/health', (req, res) => {
        res.json({ 
          status: 'ok', 
          server: 'swiss-ephemeris-mcp-server',
          version: '1.0.0',
          transport: 'StreamableHTTP',
          protocol: 'http',
          port: port,
          note: 'Use ngrok for HTTPS tunneling',
          endpoint: '/mcp - StreamableHTTP transport for Claude MCP Connector'
        });
      });

      // Root endpoint with info
      app.get('/', (req, res) => {
        res.json({
          name: 'Swiss Ephemeris MCP Server',
          version: '1.0.0',
          description: 'MCP server for Swiss Ephemeris calculations with HTTP transport for ngrok tunneling',
          protocol: 'http',
          port: port,
          endpoints: {
            mcp: `/mcp - StreamableHTTP transport for Claude MCP Connector`,
            health: `/health - Health check`
          },
          usage: 'Use ngrok to create HTTPS tunnel, then connect Claude to the ngrok URL + /mcp',
          note: 'Start with: ngrok http ' + port
        });
      });

      app.listen(port, () => {
        console.log(`\n✅ HTTP server listening on port ${port}`);
        console.log(`🚇 Ready for ngrok tunneling`);
        console.log(`💡 Start ngrok with: ngrok http ${port}`);
        console.log(`MCP endpoint: http://localhost:${port}/mcp`);
        console.log(`Health check: http://localhost:${port}/health`);
        console.log('\nReady for Claude MCP Connector integration via ngrok\n');
      });
    } else {
      // Stdio mode (default) - for Claude Desktop
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Swiss Ephemeris MCP server running on stdio');
    }
  }

  // Helper method to check if request is an initialize request
  isInitializeRequest(body) {
    if (Array.isArray(body)) {
      return body.some(request => request.method === 'initialize');
    }
    return body && body.method === 'initialize';
  }
}

const server = new SwissEphemerisServer();
server.run().catch(console.error); 