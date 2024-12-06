import { NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Task } from '@/types';

interface Storage {
  [userId: string]: {
    [date: string]: Task[];
  };
}

const getStoragePath = (userId: string) => {
  const storagePath = join(process.cwd(), 'storage', userId);
  return {
    dirPath: storagePath,
    filePath: join(storagePath, 'tasks.json')
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
      return NextResponse.json({ error: 'Missing userId or date' }, { status: 400 });
    }

    const { filePath } = getStoragePath(userId);
    
    try {
      const data = await readFile(filePath, 'utf8');
      const storage = JSON.parse(data);
      return NextResponse.json(storage[userId]?.[date] || []);
    } catch (error) {
      return NextResponse.json([]);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, date, tasks } = await request.json();

    if (!userId || !date || !tasks) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { dirPath, filePath } = getStoragePath(userId);

    // Ensure storage directory exists
    await mkdir(dirPath, { recursive: true });

    // Load existing data or create new storage object
    let storage: Storage = {};
    try {
      const existingData = await readFile(filePath, 'utf8');
      storage = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, using empty storage object
    }

    // Update storage with new tasks
    storage[userId] = storage[userId] || {};
    storage[userId][date] = tasks;

    // Save updated data
    await writeFile(filePath, JSON.stringify(storage, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
  }
} 