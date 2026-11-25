import { useEffect, useState } from 'react'
import { api } from './api'
import type { LibraryFile } from './types'

/** The workspace file library, loaded once and shared by the canvas and the inspector. */
let cache: LibraryFile[] | null = null
let pending: Promise<LibraryFile[]> | null = null
const listeners = new Set<(files: LibraryFile[]) => void>()

function publish(files: LibraryFile[]) {
  cache = files
  listeners.forEach(l => l(files))
}

export function reloadFiles(): Promise<LibraryFile[]> {
  pending = api.files().then(files => { publish(files); return files }).finally(() => { pending = null })
  return pending
}

export function useLibraryFiles(): { files: LibraryFile[] | null; error: string | null } {
  const [files, setFiles] = useState<LibraryFile[] | null>(cache)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    listeners.add(setFiles)
    if (cache === null) (pending ?? reloadFiles()).catch(e => setError((e as Error).message))
    return () => { listeners.delete(setFiles) }
  }, [])
  return { files, error }
}

export async function uploadToLibrary(file: File): Promise<LibraryFile> {
  const saved = await api.uploadFile(file)
  await reloadFiles()
  return saved
}

export async function deleteFromLibrary(id: string): Promise<void> {
  await api.deleteFile(id)
  await reloadFiles()
}

export const formatSize = (bytes: number) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
