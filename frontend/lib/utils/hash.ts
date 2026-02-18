/**
 * SHA-256 Implementation for client-side hashing
 * Uses SubtleCrypto Web API for standards-based hashing
 */

export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

/**
 * Generate a blockchain-style hash for a clinical event
 */
export async function generateEventHash(
  patientId: string,
  healthCenterId: string,
  eventType: string,
  date: string,
  description: string,
  previousHash: string = '0'
): Promise<string> {
  const dataToHash = `${patientId}|${healthCenterId}|${eventType}|${date}|${description}|${previousHash}|${Date.now()}`;
  return sha256(dataToHash);
}

/**
 * Verify a blockchain chain - check if hashes are consistent
 */
export async function verifyEventChain(
  events: Array<{ hash: string; previousHash?: string }>
): Promise<boolean> {
  if (events.length === 0) return true;

  for (let i = 1; i < events.length; i++) {
    const currentEvent = events[i];
    const previousEvent = events[i - 1];

    if (currentEvent.previousHash !== previousEvent.hash) {
      return false;
    }
  }

  return true;
}
