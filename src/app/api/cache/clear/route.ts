import { NextResponse } from 'next/server';

/**
 * POST /api/cache/clear
 * Vide le cache Upstash Redis
 * 🔐 À sécuriser en production avec une clé secrète
 */
export async function POST(request: Request) {
  try {
    const { Redis } = await import('@upstash/redis');
    
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      return NextResponse.json(
        { error: 'Upstash not configured' },
        { status: 503 }
      );
    }
    
    const redis = new Redis({ url, token });
    
    // Vider TOUS les clés 'pipeline:*'
    const keys = await redis.keys('pipeline:*');
    if (keys.length > 0) {
      await redis.del(...(keys as string[]));
    }
    
    // Vider les clés 'predictions:*'
    const predKeys = await redis.keys('predictions:*');
    if (predKeys.length > 0) {
      await redis.del(...(predKeys as string[]));
    }
    
    return NextResponse.json({
      status: 'cleared',
      keys_removed: (keys.length || 0) + (predKeys.length || 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[cache/clear] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
