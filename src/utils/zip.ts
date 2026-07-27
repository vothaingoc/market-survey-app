/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type ZipInputFile = {
  path: string;
  data: Uint8Array;
};

type ZipOutputFile = {
  path: string;
  data: Uint8Array;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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
  const base64 = dataUrl.split(',')[1] || '';
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
  const localParts: number[] = [];
  const centralParts: number[] = [];
  let offset = 0;

  files.forEach(file => {
    const filename = textEncoder.encode(file.path.replace(/\\/g, '/'));
    const checksum = crc32(file.data);
    const localOffset = offset;

    writeUint32(localParts, 0x04034b50);
    writeUint16(localParts, 20);
    writeUint16(localParts, 0);
    writeUint16(localParts, 0);
    writeUint16(localParts, 0);
    writeUint16(localParts, 0);
    writeUint32(localParts, checksum);
    writeUint32(localParts, file.data.length);
    writeUint32(localParts, file.data.length);
    writeUint16(localParts, filename.length);
    writeUint16(localParts, 0);
    localParts.push(...filename, ...file.data);
    offset += 30 + filename.length + file.data.length;

    writeUint32(centralParts, 0x02014b50);
    writeUint16(centralParts, 20);
    writeUint16(centralParts, 20);
    writeUint16(centralParts, 0);
    writeUint16(centralParts, 0);
    writeUint16(centralParts, 0);
    writeUint16(centralParts, 0);
    writeUint32(centralParts, checksum);
    writeUint32(centralParts, file.data.length);
    writeUint32(centralParts, file.data.length);
    writeUint16(centralParts, filename.length);
    writeUint16(centralParts, 0);
    writeUint16(centralParts, 0);
    writeUint16(centralParts, 0);
    writeUint16(centralParts, 0);
    writeUint32(centralParts, 0);
    writeUint32(centralParts, localOffset);
    centralParts.push(...filename);
  });

  const centralOffset = offset;
  offset += centralParts.length;

  const endParts: number[] = [];
  writeUint32(endParts, 0x06054b50);
  writeUint16(endParts, 0);
  writeUint16(endParts, 0);
  writeUint16(endParts, files.length);
  writeUint16(endParts, files.length);
  writeUint32(endParts, centralParts.length);
  writeUint32(endParts, centralOffset);
  writeUint16(endParts, 0);

  return new Blob([
    new Uint8Array(localParts),
    new Uint8Array(centralParts),
    new Uint8Array(endParts),
  ], { type: 'application/zip' });
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
