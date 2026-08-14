import { NextResponse } from 'next/server';

export const revalidate = 0; // Disable cache for this route, always fetch fresh data

export async function GET() {
  try {
    const apiKey = process.env.AZURACAST_API_KEY;
    const headers: HeadersInit = {};
    
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const [nowPlayingResponse, scheduleResponse] = await Promise.all([
      fetch('https://radio.nismara.web.id:8443/api/nowplaying/1', {
        method: 'GET',
        headers,
        cache: 'no-store',
      }),
      fetch('https://radio.nismara.web.id:8443/api/station/1/schedule', {
        method: 'GET',
        headers,
        cache: 'no-store',
      })
    ]);

    if (!nowPlayingResponse.ok) {
      throw new Error(`Failed to fetch Now Playing data: ${nowPlayingResponse.status}`);
    }

    const data = await nowPlayingResponse.json();
    let scheduleData = [];
    if (scheduleResponse.ok) {
      scheduleData = await scheduleResponse.json();
    }
    
    // Extrak data yang diperlukan sesuai format NowPlaying di useRadioStore
    const nowPlaying = {
      title: data?.now_playing?.song?.title || 'Unknown Title',
      artist: data?.now_playing?.song?.artist || 'Unknown Artist',
      art: data?.now_playing?.song?.art || '',
      playingNext: {
        title: data?.playing_next?.song?.title || 'Unknown Title',
        artist: data?.playing_next?.song?.artist || 'Unknown Artist',
      },
      songHistory: Array.isArray(data?.song_history) 
        ? data.song_history.slice(0, 3).map((item: any) => ({
            title: item.song.title,
            artist: item.song.artist
          }))
        : [],
      requestsEnabled: data?.station?.requests_enabled || false,
      schedule: Array.isArray(scheduleData)
        ? scheduleData.map((s: any) => ({
            name: s.name,
            start: s.start,
            end: s.end,
            is_now: s.is_now
          }))
        : []
    };

    return NextResponse.json(nowPlaying);
  } catch (error) {
    console.error('Error fetching AzuraCast data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch radio data' },
      { status: 500 }
    );
  }
}
