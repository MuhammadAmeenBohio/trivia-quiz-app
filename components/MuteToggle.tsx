'use client'
import { useSyncExternalStore } from 'react'
import { Volume2Icon, VolumeXIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isMuted, setMuted, subscribeMute } from '@/lib/sound'

export default function MuteToggle() {
  const muted = useSyncExternalStore(subscribeMute, isMuted, () => false)

  return (
    <Button
      data-silent
      variant="ghost"
      size="icon-lg"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? <VolumeXIcon className="size-5" /> : <Volume2Icon className="size-5" />}
    </Button>
  )
}
