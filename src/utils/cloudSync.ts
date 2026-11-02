import { SubtaskItem, TaskItem } from '../types/tasks';

export interface CloudAccount {
  identifier: string;
  topicId: string;
}

export interface CloudSyncPayload {
  type: 'state_sync' | 'request_sync';
  syncId: string;
  deviceId: string;
  accountId: string;
  tasks: TaskItem[];
  subtasks: SubtaskItem[];
}

const NTFY_BASE_URL = 'https://ntfy.sh';
export const CLOUD_ACCOUNT_STORAGE_KEY = 'enfoque_cloud_account_v1';
export const CLOUD_LAST_SYNC_ID_KEY = 'enfoque_cloud_last_sync_id_v1';

/**
 * Deterministic 128-bit hash that produces the exact same topic ID on file://,
 * content://, http://, and https:// across Windows, Android, iOS, and macOS.
 */
export function deriveAccountTopicId(identifier: string, password: string): string {
  const cleanUser = identifier.trim().toLowerCase();
  const cleanPass = password.trim();
  const raw = `enfoque-neojira-sync-v1::${cleanUser}::${cleanPass}`;

  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  let h3 = 0x9e3779b9 ^ raw.length;
  let h4 = 0x85ebca6b ^ raw.length;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ (ch + i), 2246822519);
    h4 = Math.imul(h4 ^ (ch * 31), 3266489917);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const hex =
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0');

  return `enfoque_acct_${hex}`;
}

async function extractPayloadFromNtfyEvent(evt: {
  event?: string;
  message?: string;
  attachment?: { url?: string };
}): Promise<CloudSyncPayload | null> {
  if (!evt || evt.event !== 'message') return null;

  try {
    let rawJson = '';
    if (evt.attachment?.url) {
      const res = await fetch(evt.attachment.url, { cache: 'no-store' });
      if (!res.ok) return null;
      rawJson = await res.text();
    } else if (typeof evt.message === 'string') {
      rawJson = evt.message.replace(/^\uFEFF/, '').trim();
    }

    if (!rawJson || !rawJson.startsWith('{')) return null;
    const parsed = JSON.parse(rawJson);
    if (
      parsed &&
      (parsed.type === 'state_sync' || parsed.type === 'request_sync') &&
      Array.isArray(parsed.tasks) &&
      Array.isArray(parsed.subtasks)
    ) {
      return parsed as CloudSyncPayload;
    }
  } catch {
    // Ignore malformed messages
  }
  return null;
}

export async function publishCloudSnapshot(
  topicId: string,
  payload: CloudSyncPayload
): Promise<boolean> {
  try {
    const res = await fetch(`${NTFY_BASE_URL}/${encodeURIComponent(topicId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        Title: 'Enfoque Sync',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLatestCloudSnapshot(
  topicId: string
): Promise<CloudSyncPayload | null> {
  try {
    const res = await fetch(
      `${NTFY_BASE_URL}/${encodeURIComponent(topicId)}/json?poll=1&since=24h`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Traverse from newest message to oldest so we grab the most recent state_sync immediately
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const evt = JSON.parse(lines[i]);
        const payload = await extractPayloadFromNtfyEvent(evt);
        if (payload && payload.type === 'state_sync') {
          return payload;
        }
      } catch {
        // Continue checking previous line
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function subscribeToCloudTopic(
  topicId: string,
  onPayload: (payload: CloudSyncPayload) => void,
  onStatusChange?: (connected: boolean) => void
): () => void {
  let eventSource: EventSource | null = null;
  let reconnectTimer: number | null = null;
  let closed = false;

  const connect = () => {
    if (closed) return;
    try {
      eventSource = new EventSource(
        `${NTFY_BASE_URL}/${encodeURIComponent(topicId)}/sse`
      );

      eventSource.onopen = () => {
        onStatusChange?.(true);
      };

      eventSource.onmessage = async (e) => {
        try {
          const evt = JSON.parse(e.data);
          const payload = await extractPayloadFromNtfyEvent(evt);
          if (payload) {
            onPayload(payload);
          }
        } catch {
          // Ignore non-JSON keepalive events
        }
      };

      eventSource.onerror = () => {
        onStatusChange?.(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 4000);
        }
      };
    } catch {
      onStatusChange?.(false);
    }
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
    }
    if (eventSource) {
      eventSource.close();
    }
  };
}
