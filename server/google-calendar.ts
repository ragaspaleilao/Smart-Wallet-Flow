// Google Calendar Integration - Replit Connector
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

export async function getGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getCalendarList() {
  const calendar = await getGoogleCalendarClient();
  const response = await calendar.calendarList.list();
  return response.data.items || [];
}

export async function createEvent(calendarId: string, event: {
  summary: string;
  description?: string;
  start: Date;
  end?: Date;
  colorId?: string;
}) {
  const calendar = await getGoogleCalendarClient();
  
  const endDate = event.end || new Date(event.start.getTime() + 60 * 60 * 1000); // 1 hour default
  
  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      colorId: event.colorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 * 24 }, // 1 day before
          { method: 'popup', minutes: 60 * 2 },  // 2 hours before
        ],
      },
    },
  });
  
  return response.data;
}

export async function createAllDayEvent(calendarId: string, event: {
  summary: string;
  description?: string;
  date: Date;
  colorId?: string;
}) {
  const calendar = await getGoogleCalendarClient();
  
  const dateStr = event.date.toISOString().split('T')[0];
  
  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: {
        date: dateStr,
      },
      end: {
        date: dateStr,
      },
      colorId: event.colorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 * 24 }, // 1 day before
        ],
      },
    },
  });
  
  return response.data;
}

export async function listEvents(calendarId: string, timeMin?: Date, timeMax?: Date) {
  const calendar = await getGoogleCalendarClient();
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin?.toISOString(),
    timeMax: timeMax?.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });
  
  return response.data.items || [];
}

export async function deleteEvent(calendarId: string, eventId: string) {
  const calendar = await getGoogleCalendarClient();
  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export async function checkConnection(): Promise<boolean> {
  try {
    await getGoogleCalendarClient();
    return true;
  } catch {
    return false;
  }
}

export async function getUserEmail(): Promise<string | null> {
  try {
    if (connectionSettings?.settings?.user_email) {
      return connectionSettings.settings.user_email;
    }
    await getAccessToken();
    return connectionSettings?.settings?.user_email || null;
  } catch {
    return null;
  }
}
