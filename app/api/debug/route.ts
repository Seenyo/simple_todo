import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    // Output to terminal
    process.stdout.write(message + '\n');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
} 