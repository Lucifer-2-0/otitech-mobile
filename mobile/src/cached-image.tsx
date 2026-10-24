import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

type CachedImageProps = {
  uri: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';
  accessibilityLabel?: string;
  fallback?: ReactNode;
  onError?: () => void;
};

type LocalImage = { sourceUri: string; fileUri: string; isStale: boolean };

const IMAGE_DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}otitech-image-cache/`
  : null;
const MAX_IMAGE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_IMAGE_COUNT = 48;
const MAX_IMAGE_CACHE_BYTES = 80 * 1024 * 1024;
const MAX_SINGLE_IMAGE_BYTES = 20 * 1024 * 1024;
const imageDownloads = new Map<string, Promise<string | null>>();
let imageDirectoryReady: Promise<void> | null = null;

function hashUri(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function fileUriForImage(uri: string) {
  if (!IMAGE_DIRECTORY) return null;
  const cleanPath = uri.split(/[?#]/, 1)[0];
  const extension = cleanPath.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || 'img';
  return `${IMAGE_DIRECTORY}${hashUri(uri)}.${extension}`;
}

async function ensureImageDirectory() {
  if (!IMAGE_DIRECTORY) return false;
  if (!imageDirectoryReady) {
    imageDirectoryReady = (async () => {
      const info = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
      if (!info.exists) await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
    })();
  }
  try {
    await imageDirectoryReady;
    return true;
  } catch {
    imageDirectoryReady = null;
    return false;
  }
}

async function findLocalImage(uri: string): Promise<LocalImage | null> {
  const fileUri = fileUriForImage(uri);
  if (!fileUri) return null;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || !info.size) return null;
    const modifiedAt = (info.modificationTime || 0) * 1000;
    return {
      sourceUri: uri,
      fileUri,
      isStale: !modifiedAt || Date.now() - modifiedAt > MAX_IMAGE_AGE_MS,
    };
  } catch {
    return null;
  }
}

async function trimImageCache(keepUri: string) {
  if (!IMAGE_DIRECTORY) return;
  try {
    const names = await FileSystem.readDirectoryAsync(IMAGE_DIRECTORY);
    const files = await Promise.all(names.map(async (name) => {
      const uri = `${IMAGE_DIRECTORY}${name}`;
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists
        ? { uri, size: info.size || 0, modifiedAt: (info.modificationTime || 0) * 1000 }
        : null;
    }));
    const existing = files.filter((file): file is NonNullable<typeof file> => file !== null);
    let totalBytes = existing.reduce((sum, file) => sum + file.size, 0);
    let count = existing.length;
    const oldestFirst = existing
      .filter((file) => file.uri !== keepUri)
      .sort((a, b) => a.modifiedAt - b.modifiedAt);

    while ((count > MAX_IMAGE_COUNT || totalBytes > MAX_IMAGE_CACHE_BYTES) && oldestFirst.length) {
      const oldest = oldestFirst.shift();
      if (!oldest) break;
      await FileSystem.deleteAsync(oldest.uri, { idempotent: true });
      count -= 1;
      totalBytes -= oldest.size;
    }
  } catch {
    // Cache cleanup must not affect image display or app startup.
  }
}

async function cacheImage(uri: string, refresh = false): Promise<string | null> {
  const existingRequest = imageDownloads.get(uri);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const fileUri = fileUriForImage(uri);
    if (!fileUri || !(await ensureImageDirectory())) return null;
    if (!refresh) {
      const existing = await findLocalImage(uri);
      if (existing) return existing.fileUri;
    }

    const temporaryUri = `${fileUri}.download`;
    try {
      if ((await FileSystem.getInfoAsync(temporaryUri)).exists) {
        await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
      }
      const response = await FileSystem.downloadAsync(uri, temporaryUri);
      if (response.status < 200 || response.status >= 300) {
        await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
        return null;
      }
      const downloaded = await FileSystem.getInfoAsync(temporaryUri);
      if (!downloaded.exists || !downloaded.size || downloaded.size > MAX_SINGLE_IMAGE_BYTES) {
        await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
        return null;
      }
      if ((await FileSystem.getInfoAsync(fileUri)).exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
      await FileSystem.moveAsync({ from: temporaryUri, to: fileUri });
      await trimImageCache(fileUri);
      return fileUri;
    } catch {
      try {
        await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
      } catch {
        // Keep image cache failures silent and fall back to the remote image.
      }
      return null;
    }
  })();

  imageDownloads.set(uri, request);
  try {
    return await request;
  } finally {
    if (imageDownloads.get(uri) === request) imageDownloads.delete(uri);
  }
}

export function CachedImage({ uri, style, resizeMode = 'cover', accessibilityLabel, fallback = null, onError }: CachedImageProps) {
  const [cachedImage, setCachedImage] = useState<LocalImage | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const attemptedUri = useRef<string | null>(null);
  const localUri = cachedImage?.sourceUri === uri ? cachedImage.fileUri : null;

  useEffect(() => {
    let isCurrent = true;
    attemptedUri.current = null;
    setFailedUri(null);
    setCachedImage(null);

    void findLocalImage(uri).then((local) => {
      if (!isCurrent || !local) return;
      setCachedImage(local);
      if (local.isStale) {
        void cacheImage(uri, true).then((updatedUri) => {
          if (isCurrent && updatedUri) setCachedImage({ sourceUri: uri, fileUri: updatedUri, isStale: false });
        });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [uri]);

  if (failedUri === uri && !localUri) return <>{fallback}</>;

  return (
    <Image
      source={{ uri: localUri || uri }}
      style={style}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel}
      onLoad={() => {
        if (localUri || attemptedUri.current === uri) return;
        attemptedUri.current = uri;
        void cacheImage(uri).then((fileUri) => {
          if (fileUri) setCachedImage({ sourceUri: uri, fileUri, isStale: false });
        });
      }}
      onError={() => {
        setFailedUri(uri);
        onError?.();
      }}
    />
  );
}
