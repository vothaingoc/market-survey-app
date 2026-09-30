/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type ZipInputFile = {
  path: string;
  data: Uint8Array;
};

type ZipBlobInputFile = {
  path: string;
  data: Blob | Uint8Array;
};

type ZipOutputFile = {
  path: string;
  data: Uint8Array;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const ZIP_UTF8_FLAG = 0x0800;

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  data.forEach(byte => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

async function crc32Blob(blob: Blob): Promise<number> {
  let crc = 0xffffffff;
  const reader = blob.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    value.forEach(byte => {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    });
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(output: number[], value: number): void {
  output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output: number[], value: number): void {
  output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function readUint16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readUint32(data: Uint8Array, offset: number): number {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const [metadata, payload = ''] = dataUrl.split(',', 2);
  if (!metadata.includes(';base64')) {
    return textEncoder.encode(decodeURIComponent(payload));
  }
  const base64 = payload;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToDataUrl(data: Uint8Array, mimeType: string): string {
  let binary = '';
  data.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return `data:${mimeType};base64,${btoa(binary)}`;
}

export function textToBytes(text: string): Uint8Array {
  return textEncoder.encode(text);
}

export function bytesToText(data: Uint8Array): string {
  return textDecoder.decode(data);
}

export function createZip(files: ZipInputFile[]): Blob {
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;

  files.forEach(file => {
    const filename = textEncoder.encode(file.path.replace(/\\/g, '/'));
    const checksum = crc32(file.data);
    const localOffset = offset;
    const localHeader: number[] = [];

    writeUint32(localHeader, 0x04034b50);
    writeUint16(localHeader, 20);
    writeUint16(localHeader, ZIP_UTF8_FLAG);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint32(localHeader, checksum);
    writeUint32(localHeader, file.data.length);
    writeUint32(localHeader, file.data.length);
    writeUint16(localHeader, filename.length);
    writeUint16(localHeader, 0);
    localParts.push(new Uint8Array(localHeader), filename, file.data);
    offset += 30 + filename.length + file.data.length;

    const centralHeader: number[] = [];
    writeUint32(centralHeader, 0x02014b50);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, ZIP_UTF8_FLAG);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, checksum);
    writeUint32(centralHeader, file.data.length);
    writeUint32(centralHeader, file.data.length);
    writeUint16(centralHeader, filename.length);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, 0);
    writeUint32(centralHeader, localOffset);
    centralParts.push(new Uint8Array(centralHeader), filename);
  });

  const centralOffset = offset;
  const centralSize = files.reduce((size, file) => (
    size + 46 + textEncoder.encode(file.path.replace(/\\/g, '/')).length
  ), 0);

  const endParts: number[] = [];
  writeUint32(endParts, 0x06054b50);
  writeUint16(endParts, 0);
  writeUint16(endParts, 0);
  writeUint16(endParts, files.length);
  writeUint16(endParts, files.length);
  writeUint32(endParts, centralSize);
  writeUint32(endParts, centralOffset);
  writeUint16(endParts, 0);

  return new Blob([
    ...localParts,
    ...centralParts,
    new Uint8Array(endParts),
  ], { type: 'application/zip' });
}

// Read large image blobs one at a time. This avoids creating Base64 copies of
// every photo and prevents a large Promise.all memory spike on mobile Safari.
export async function createZipFromBlobs(files: ZipBlobInputFile[]): Promise<Blob> {
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;

  for (const file of files) {
    const filename = textEncoder.encode(file.path.replace(/\\/g, '/'));
    const size = file.data instanceof Blob ? file.data.size : file.data.length;
    const checksum = file.data instanceof Blob ? await crc32Blob(file.data) : crc32(file.data);
    const localOffset = offset;
    const localHeader: number[] = [];

    writeUint32(localHeader, 0x04034b50);
    writeUint16(localHeader, 20);
    writeUint16(localHeader, ZIP_UTF8_FLAG);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint32(localHeader, checksum);
    writeUint32(localHeader, size);
    writeUint32(localHeader, size);
    writeUint16(localHeader, filename.length);
    writeUint16(localHeader, 0);
    localParts.push(new Uint8Array(localHeader), filename, file.data);
    offset += 30 + filename.length + size;

    const centralHeader: number[] = [];
    writeUint32(centralHeader, 0x02014b50);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, ZIP_UTF8_FLAG);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, checksum);
    writeUint32(centralHeader, size);
    writeUint32(centralHeader, size);
    writeUint16(centralHeader, filename.length);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, 0);
    writeUint32(centralHeader, localOffset);
    centralParts.push(new Uint8Array(centralHeader), filename);
  }

  const centralOffset = offset;
  const centralSize = files.reduce((size, file) => (
    size + 46 + textEncoder.encode(file.path.replace(/\\/g, '/')).length
  ), 0);
  const endParts: number[] = [];
  writeUint32(endParts, 0x06054b50);
  writeUint16(endParts, 0);
  writeUint16(endParts, 0);
  writeUint16(endParts, files.length);
  writeUint16(endParts, files.length);
  writeUint32(endParts, centralSize);
  writeUint32(endParts, centralOffset);
  writeUint16(endParts, 0);

  return new Blob([...localParts, ...centralParts, new Uint8Array(endParts)], { type: 'application/zip' });
}

export async function readZip(file: File): Promise<ZipOutputFile[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const files: ZipOutputFile[] = [];
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const signature = readUint32(bytes, offset);
    if (signature !== 0x04034b50) break;

    const method = readUint16(bytes, offset + 8);
    const compressedSize = readUint32(bytes, offset + 18);
    const uncompressedSize = readUint32(bytes, offset + 22);
    const filenameLength = readUint16(bytes, offset + 26);
    const extraLength = readUint16(bytes, offset + 28);
    const filenameStart = offset + 30;
    const filenameEnd = filenameStart + filenameLength;
    const dataStart = filenameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;

    if (method !== 0) throw new Error('Only uncompressed ZIP backups are supported');
    if (dataEnd > bytes.length) throw new Error('Invalid ZIP file');

    const path = textDecoder.decode(bytes.slice(filenameStart, filenameEnd));
    const data = bytes.slice(dataStart, dataEnd);
    if (!path.endsWith('/')) {
      files.push({ path, data: data.slice(0, uncompressedSize) });
    }
    offset = dataEnd;
  }

  return files;
}
