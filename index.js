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
const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
const DEFAULT_AYANAMSA = 'traditional_lahiri';
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
            description: 'Calculate a sidereal Vedic/KP birth chart with Jagannatha Hora default settings (Traditional Lahiri ayanamsa, true positions, true nodes, true sidereal solar years): planets and Placidus cusps with sign lord, nakshatra, pada, star lord, KP sub lord and sub-sub lord, retrograde status, whole-sign and KP house placement; the Vimshottari dasha timeline with the running Mahadasha-Antardasha-Pratyantardasha-Sookshma chain; and Kalachakra dasha (SM Singh method) with mahadashas, antardashas and the running chain.',
            inputSchema: {
              type: 'object',
              properties: {
                datetime: {
                  type: 'string',
                  description: 'Birth datetime in ISO8601 format. Include the timezone, e.g., 1999-06-06T15:30:00+05:30; dasha dates are returned in the same offset',
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
                  type: 'string',
                  description: 'ISO8601 date for which to report the running dasha chains (default now)',
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
            description: 'Calculate Kalachakra dasha only, always with Jagannatha Hora settings: Traditional Lahiri ayanamsa, true positions, true sidereal solar years, SM Singh method (full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa), from the Moon in D-1, Rohini 4th pada as Leo. Returns Savya/Apasavya, Paramayush, Deha, Jiva, all mahadashas with antardashas, the running chain down to praana, and optionally the sub-periods of any period (drill_down).',
            inputSchema: {
              type: 'object',
              properties: {
                datetime: {
                  type: 'string',
                  description: 'Birth datetime in ISO8601 format with timezone, e.g., 1999-06-06T15:30:00+05:30; dates are returned in the same offset',
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
                  type: 'string',
                  description: 'ISO8601 date for the running chain (default now)',
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
        const result = await this.handleToolCall(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
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

    const asOf = options.as_of ? new Date(options.as_of) : new Date();
    if (isNaN(asOf.getTime())) {
      throw new Error('Invalid as_of datetime. Use ISO8601 format like 2024-01-01T00:00:00Z');
    }

    const swissDate = this.formatDateToSwiss(date);
    const swissTime = this.formatTimeToSwiss(date);
    const ephePath = process.env.SE_EPHE_PATH || '/app/vendor/swisseph';
    const positionFlag = positionType === 'true' ? ' -true' : '';
    const base = `SE_EPHE_PATH=${ephePath} swetest -b${swissDate} -ut${swissTime} ${ayanamsa.flag}${positionFlag} -g, -head`;

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
    const clock = this.makeDashaClock(date, {
      ephePath,
      siderealFlag: ayanamsa.flag,
      positionFlag,
      yearDays,
      fromYears: Math.min(-vimshottari.elapsedYears, kalachakra.firstStartYears) - 1,
      toYears: Math.max(120 - vimshottari.elapsedYears, kalachakra.lastEndYears) + 1,
    });
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
      vimshottari_dasha: this.calculateVimshottari(vimshottari, date.getTime(), clock, formatTime, asOf, yearDescription),
      kalachakra_dasha: this.calculateKalachakra(kalachakra, clock, formatTime, asOf, yearDescription, { chainLevels: 5 }),
      datetime,
      coordinates: { latitude, longitude },
    };
  }

  swetestRows(output) {
    return output.split('\n')
      .map(line => line.split(',').map(part => part.trim()))
      .filter(parts => parts.length >= 2 && parts[1] !== '' && !isNaN(parseFloat(parts[1])));
  }

  // Returns a function converting dasha years (relative to birth) to a timestamp in ms.
  // With yearDays, a year is a fixed number of days. Otherwise a year is one sidereal
  // revolution of the true Sun, so N years have passed when the sidereal Sun has moved
  // N * 360 degrees from its birth position.
  makeDashaClock(date, { ephePath, siderealFlag, positionFlag, yearDays, fromYears, toYears }) {
    const birthMs = date.getTime();
    if (yearDays) {
      return (years) => birthMs + years * yearDays * DAY_MS;
    }

    // Sidereal Sun longitude and speed every STEP days across the needed range
    const STEP = 2;
    const CHUNK = 18000; // swetest prints at most 36525 lines per call
    const firstStep = Math.floor(fromYears * SIDEREAL_YEAR_DAYS / STEP);
    const lastStep = Math.ceil(toYears * SIDEREAL_YEAR_DAYS / STEP);
    const lons = [];
    const speeds = [];
    for (let s = firstStep; s <= lastStep; s += CHUNK) {
      const count = Math.min(CHUNK, lastStep - s + 1);
      const start = new Date(birthMs + s * STEP * DAY_MS);
      const output = execSync(
        `SE_EPHE_PATH=${ephePath} swetest -b${this.formatDateToSwiss(start)} -ut${this.formatTimeToSwiss(start)} ` +
        `${siderealFlag}${positionFlag} -p0 -fls -g, -head -n${count} -s${STEP}`,
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
      );
      this.swetestRows(output).forEach(([lon, speed]) => {
        lons.push(parseFloat(lon));
        speeds.push(parseFloat(speed));
      });
    }
    if (lons.length !== lastStep - firstStep + 1) {
      throw new Error('Failed to compute the solar year table from swetest');
    }

    // Unwrap so the longitude keeps increasing past 360
    for (let i = 1; i < lons.length; i++) {
      while (lons[i] < lons[i - 1]) lons[i] += 360;
    }
    const birthLon = lons[-firstStep];

    return (years) => {
      const target = birthLon + years * 360;
      if (target < lons[0] || target > lons[lons.length - 1]) {
        return birthMs + years * SIDEREAL_YEAR_DAYS * DAY_MS;
      }
      let lo = 0;
      let hi = lons.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (lons[mid] <= target) lo = mid; else hi = mid;
      }
      // Cubic Hermite interpolation between grid points, solved for the target with Newton's method
      const p0 = lons[lo];
      const p1 = lons[hi];
      const m0 = speeds[lo] * STEP;
      const m1 = speeds[hi] * STEP;
      let x = (target - p0) / (p1 - p0);
      for (let k = 0; k < 6; k++) {
        const x2 = x * x;
        const x3 = x2 * x;
        const value = (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * m1;
        const slope = (6 * x2 - 6 * x) * p0 + (3 * x2 - 4 * x + 1) * m0 + (-6 * x2 + 6 * x) * p1 + (3 * x2 - 2 * x) * m1;
        x -= (value - target) / slope;
      }
      return birthMs + (firstStep + lo + x) * STEP * DAY_MS;
    };
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

  calculateVimshottari(start, birthMs, clock, formatTime, asOf, yearDescription) {
    const { nakshatraIndex, elapsedFraction, firstLord, elapsedYears } = start;
    const firstIndex = DASHA_ORDER.indexOf(firstLord);

    // Periods are built in years relative to birth, then turned into times with the clock
    const timed = (p) => ({ ...p, startMs: clock(p.start), endMs: clock(p.end) });

    // Sub-periods of a period: each lord takes its share of the parent, starting from the parent lord
    const subPeriods = (parent) => {
      const startIndex = DASHA_ORDER.indexOf(parent.lord);
      const length = parent.end - parent.start;
      const periods = [];
      let cursor = parent.start;
      for (let i = 0; i < 9; i++) {
        const lord = DASHA_ORDER[(startIndex + i) % 9];
        const part = length * DASHA_YEARS[lord] / 120;
        periods.push(timed({ lord, start: cursor, end: cursor + part }));
        cursor += part;
      }
      return periods;
    };

    const mahadashas = [];
    let cursor = -elapsedYears;
    for (let i = 0; i < 9; i++) {
      const lord = DASHA_ORDER[(firstIndex + i) % 9];
      mahadashas.push(timed({ lord, start: cursor, end: cursor + DASHA_YEARS[lord] }));
      cursor += DASHA_YEARS[lord];
    }

    const t = asOf.getTime();
    const find = (periods) => periods.find(p => t >= p.startMs && t < p.endMs) || null;
    const fmt = (p) => ({ lord: p.lord, start: formatTime(p.startMs), end: formatTime(p.endMs) });

    let current = null;
    const md = find(mahadashas);
    if (md) {
      const ad = find(subPeriods(md));
      const pd = find(subPeriods(ad));
      const sd = find(subPeriods(pd));
      current = {
        as_of: formatTime(t),
        mahadasha: fmt(md),
        antardasha: fmt(ad),
        pratyantardasha: fmt(pd),
        sookshma: fmt(sd),
        chain: [md.lord, ad.lord, pd.lord, sd.lord].join('-'),
      };
    }

    return {
      moon_nakshatra: NAKSHATRAS[nakshatraIndex],
      balance_at_birth: {
        lord: firstLord,
        years: Math.round((1 - elapsedFraction) * DASHA_YEARS[firstLord] * 10000) / 10000,
      },
      year: yearDescription,
      current,
      mahadashas: mahadashas.map(p => ({
        lord: p.lord,
        start: formatTime(Math.max(p.startMs, birthMs)),
        end: formatTime(p.endMs),
        antardashas: subPeriods(p)
          .filter(ad => ad.endMs > birthMs)
          .map(ad => ({
            lord: ad.lord,
            start: formatTime(Math.max(ad.startMs, birthMs)),
            end: formatTime(ad.endMs),
          })),
      })),
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

  kalachakraStart(moonLon) {
    const padaSpan = NAKSHATRA_SPAN / 4;
    const pada = Math.floor(moonLon / padaSpan);
    const nakshatra = Math.floor(pada / 4);
    const savya = Math.floor(nakshatra / 3) % 2 === 0;
    // Savya padas use their own navamsa; apasavya padas use the mirrored order (Rohini 4 = Leo)
    const sign = savya ? pada % 12 : KC_APASAVYA_NAVAMSAS[4 * (nakshatra % 3) + (pada % 4)];
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

  // Kalachakra dasha by the SM Singh method. `chainLevels` is how deep the running chain goes
  // (3 = to pratyantardasha, 5 = to praana); `drillDown` is an optional path of sign
  // abbreviations (e.g. ['Ta', 'Vi']) whose sub-periods are listed, like dividing a period in JHora.
  calculateKalachakra(start, clock, formatTime, asOf, yearDescription, { chainLevels = 3, drillDown } = {}) {
    const { pada, savya, sign, cycle, paramayush, firstIndex, firstStartYears } = start;
    const padaName = (q) => `${NAKSHATRAS[Math.floor(q / 4)]} ${(q % 4) + 1}`;

    const timed = (p) => ({ ...p, startMs: clock(p.start), endMs: clock(p.end) });

    // SM Singh: sub-periods of a period come from the period's own sign, the way the
    // mahadashas come from the Moon's navamsa: the sign's savya cycle from its start, each
    // sign taking its share of the parent in proportion to its years. This holds at every
    // level, also for apasavya charts (checked against Jagannatha Hora down to praana).
    const subPeriods = (parent) => {
      const sub = this.kalachakraCycle(true, parent.sign);
      const total = sub.signs.reduce((sum, s) => sum + KC_YEARS[s], 0);
      const length = parent.end - parent.start;
      const periods = [];
      let cursor = parent.start;
      sub.signs.forEach((s, i) => {
        const part = length * KC_YEARS[s] / total;
        periods.push(timed({ sign: s, position: sub.positions[i], start: cursor, end: cursor + part }));
        cursor += part;
      });
      return periods;
    };

    // Mahadashas run strictly through the cycle, returning to its beginning after the last sign
    const mahadashas = [];
    let cursor = firstStartYears;
    for (let i = 0; i < 9; i++) {
      const index = (firstIndex + i) % 9;
      const s = cycle.signs[index];
      mahadashas.push(timed({ sign: s, position: cycle.positions[index], start: cursor, end: cursor + KC_YEARS[s] }));
      cursor += KC_YEARS[s];
    }

    const fmt = (p) => ({
      sign: SIGNS[p.sign],
      sign_abbr: SIGN_ABBR[p.sign],
      pada: padaName(p.position),
      start: formatTime(p.startMs),
      end: formatTime(p.endMs),
    });

    const levelNames = ['mahadasha', 'antardasha', 'pratyantardasha', 'sookshma', 'praana'];
    const t = asOf.getTime();
    const find = (periods) => periods.find(p => t >= p.startMs && t < p.endMs) || null;
    let current = null;
    const chain = [];
    let level = find(mahadashas);
    while (level && chain.length < chainLevels) {
      chain.push(level);
      level = chain.length < chainLevels ? find(subPeriods(level)) : null;
    }
    if (chain.length) {
      current = { as_of: formatTime(t) };
      chain.forEach((p, i) => { current[levelNames[i]] = fmt(p); });
      current.chain = chain.map(p => SIGN_ABBR[p.sign]).join('-');
    }

    let drilled;
    if (drillDown && drillDown.length) {
      let periods = mahadashas;
      const path = [];
      for (const abbr of drillDown) {
        // A sign can occur twice in a cycle; take the first occurrence after any already chosen
        const match = periods.find(p => SIGN_ABBR[p.sign].toLowerCase() === String(abbr).toLowerCase());
        if (!match) {
          throw new Error(`drill_down: ${abbr} is not one of ${periods.map(p => SIGN_ABBR[p.sign]).join(', ')}`);
        }
        path.push(match);
        periods = subPeriods(match);
      }
      drilled = {
        path: path.map((p, i) => ({ level: levelNames[i], ...fmt(p) })),
        [`${levelNames[Math.min(path.length, 4)]}s`]: periods.map(fmt),
      };
    }

    const first = cycle.signs[0];
    const last = cycle.signs[8];
    return {
      method: 'SM Singh: dasa sesham fraction applied to the full cycle; mahadashas strictly from the cycle (back to its start after the last sign); sub-periods found from each period\'s sign the way mahadashas are found from the navamsa',
      from: 'Moon (D-1)',
      direction: savya ? 'Savya' : 'Apasavya',
      moon_pada: padaName(pada),
      navamsa: SIGNS[sign],
      paramayush,
      deha: SIGN_ABBR[savya ? first : last],
      jiva: SIGN_ABBR[savya ? last : first],
      year: yearDescription,
      current,
      ...(drilled ? { drill_down: drilled } : {}),
      mahadashas: mahadashas.map(p => ({
        ...fmt(p),
        antardashas: subPeriods(p).map(fmt),
      })),
    };
  }

  // Kalachakra dasha alone, always with Jagannatha Hora's settings: Traditional Lahiri,
  // true positions, true sidereal solar years and the SM Singh method
  calculateKalachakraDasha(datetime, options = {}) {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid datetime format. Use ISO8601 format like 1985-04-12T23:20:50Z');
    }
    const asOf = options.as_of ? new Date(options.as_of) : new Date();
    if (isNaN(asOf.getTime())) {
      throw new Error('Invalid as_of datetime. Use ISO8601 format like 2024-01-01T00:00:00Z');
    }

    const ayanamsa = AYANAMSAS.traditional_lahiri;
    const positionFlag = ' -true';
    const ephePath = process.env.SE_EPHE_PATH || '/app/vendor/swisseph';
    const output = execSync(
      `SE_EPHE_PATH=${ephePath} swetest -b${this.formatDateToSwiss(date)} -ut${this.formatTimeToSwiss(date)} ` +
      `${ayanamsa.flag}${positionFlag} -p1 -fl -g, -head`,
      { encoding: 'utf8' }
    );
    const moonLon = parseFloat(output.trim());
    if (isNaN(moonLon)) {
      throw new Error('Failed to compute the Moon position from swetest');
    }

    const start = this.kalachakraStart(moonLon);
    const clock = this.makeDashaClock(date, {
      ephePath,
      siderealFlag: ayanamsa.flag,
      positionFlag,
      fromYears: start.firstStartYears - 1,
      toYears: start.lastEndYears + 1,
    });
    const yearDescription = 'true sidereal solar year (one sidereal revolution of the Sun, as in Jagannatha Hora)';

    return {
      settings: {
        ayanamsa: ayanamsa.name,
        positions: 'true',
        year: 'true sidereal solar years',
        method: 'SM Singh (full cycle fraction, MDs strictly from cycle, ADs from MD like MDs from navamsa)',
        starting_point: 'Janma tara (Moon), Rasi (D-1)',
        rohini_4th_pada: 'Leo navamsa',
      },
      moon: this.describeSiderealPoint(moonLon),
      ...this.calculateKalachakra(start, clock, this.makeTimeFormatter(datetime), asOf, yearDescription, {
        chainLevels: 5,
        drillDown: options.drill_down,
      }),
      datetime,
    };
  }

  formatDms(value) {
    let d = Math.floor(value);
    let m = Math.floor((value - d) * 60);
    let s = Math.round(((value - d) * 60 - m) * 60);
    if (s === 60) { s = 0; m += 1; }
    if (m === 60) { m = 0; d += 1; }
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
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

        return this.calculateVedicChart(vedicDatetime, vedicLatitude, vedicLongitude, {
          ayanamsa,
          position_type,
          node_type,
          as_of,
          dasha_year_days,
        });
      }

      case 'calculate_kalachakra_dasha': {
        const { datetime: kcDatetime, as_of: kcAsOf, drill_down } = args;

        if (!kcDatetime || typeof kcDatetime !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'datetime parameter is required and must be a string'
          );
        }

        if (drill_down !== undefined && (!Array.isArray(drill_down) || drill_down.length > 4 || drill_down.some(d => typeof d !== 'string'))) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'drill_down must be an array of up to 4 sign abbreviations, e.g. ["Ta", "Vi"]'
          );
        }

        return this.calculateKalachakraDasha(kcDatetime, { as_of: kcAsOf, drill_down });
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
          console.log(`Received ${req.method} MCP request from Claude via ngrok`);
          
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