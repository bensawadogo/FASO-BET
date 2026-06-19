import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FASTAPI_URL = process.env.API_FASTAPI_URL || 'http://fastapi:8000';

/**
 * Proxy universel pour FastAPI
 * Transfère les requêtes GET/POST/PUT/DELETE au service FastAPI
 */
async function proxyRequest(
  method: string,
  pathname: string,
  request: NextRequest
): Promise<Response> {
  // Construire l'URL FastAPI complète
  const url = new URL(pathname, FASTAPI_URL);
  
  // Copier les query params
  const searchParams = new URL(request.url).searchParams;
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  
  try {
    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
    };

    // Pour les méthodes avec body
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    console.log(`[Proxy] ${method} ${url.toString()}`);

    const response = await fetch(url.toString(), options);
    
    // Parser la réponse (JSON ou text)
    let responseBody: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    // Retourner avec le status original
    return NextResponse.json(responseBody, { status: response.status });
  } catch (error: any) {
    console.error(`[Proxy Error] ${method} ${url.toString()}:`, error.message);
    
    // Distinguer les types d'erreurs
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout (30s)' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Proxy error' },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  const pathname = new URL(request.url).pathname.replace('/api/fastapi/proxy', '');
  return proxyRequest('GET', pathname || '/', request);
}

export async function POST(request: NextRequest) {
  const pathname = new URL(request.url).pathname.replace('/api/fastapi/proxy', '');
  return proxyRequest('POST', pathname || '/', request);
}

export async function PUT(request: NextRequest) {
  const pathname = new URL(request.url).pathname.replace('/api/fastapi/proxy', '');
  return proxyRequest('PUT', pathname || '/', request);
}

export async function PATCH(request: NextRequest) {
  const pathname = new URL(request.url).pathname.replace('/api/fastapi/proxy', '');
  return proxyRequest('PATCH', pathname || '/', request);
}

export async function DELETE(request: NextRequest) {
  const pathname = new URL(request.url).pathname.replace('/api/fastapi/proxy', '');
  return proxyRequest('DELETE', pathname || '/', request);
}
