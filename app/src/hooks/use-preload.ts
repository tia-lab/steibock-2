import { usePreloadStore, type PreloadStatus } from '@/store'

export const usePreloadStatus = () =>
	usePreloadStore((state) => state.status)

export const usePreloadDone = () =>
	usePreloadStore((state) => state.status === 'done')

export const usePreloadRunning = () =>
	usePreloadStore((state) => state.status === 'running')

export const usePreloadIs = (status: PreloadStatus) =>
	usePreloadStore((state) => state.status === status)
