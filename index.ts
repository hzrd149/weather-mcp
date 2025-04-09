import { z } from "zod";
import { fetchWeatherApi } from "openmeteo";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "Weather",
  version: "1.0.0",
});

server.tool(
  "get_weather",
  "Gets the current weather for a location",
  {
    latitude: z.number().describe("Latitude of the location"),
    longitude: z.number().describe("Longitude of the location"),
  },
  async ({ latitude, longitude }) => {
    try {
      // Fetch weather data
      const params = {
        latitude: [latitude],
        longitude: [longitude],
        current: "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m",
        timezone: "auto",
      };

      const responses = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", params);
      const response = responses[0];

      // Get current values
      const current = response.current()!;
      const temperature = current.variables(0)!.value();
      const weatherCode = current.variables(1)!.value();
      const windSpeed = current.variables(2)!.value();
      const windDirection = current.variables(3)!.value();

      // Convert weather code to description
      const weatherDesc = getWeatherDescription(weatherCode);

      // Format human readable report
      const report = [
        `Current Weather Report:`,
        `Temperature: ${temperature}°C`,
        `Conditions: ${weatherDesc}`,
        `Wind: ${windSpeed.toFixed(1)} km/h from ${getWindDirection(windDirection)}`,
      ].join("\n");

      return { content: [{ type: "text", text: report }] };
    } catch (error) {

      return {
        content: [{ type: "text", text: `Error fetching weather: ${error instanceof Error ? error.message : "Unknown error"}` }],
        isError: true,
      };
    }
  },
);

// Helper function to convert weather codes to descriptions
function getWeatherDescription(code: number): string {
  const descriptions: { [key: number]: string } = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] || "Unknown conditions";
}

// Helper function to convert wind direction to cardinal direction
function getWindDirection(degrees: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
