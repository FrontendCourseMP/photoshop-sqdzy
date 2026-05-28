import { ChannelPanel } from './channel-panel'
import { EyedropperPanel } from './eyedropper-panel'
import type { ChannelState } from '../lib/color-channels'
import type { EditorTool } from '../lib/editor-tool'
import type { PixelSample } from '../lib/pixel-sampling'
import {
  type LoadedRasterImage,
  type RasterChannel,
} from '../lib/raster-image'

type SidePanelProps = {
  activeTool: EditorTool
  channelState: ChannelState
  disabled: boolean
  image: LoadedRasterImage | null
  onToggleChannel: (channel: RasterChannel) => void
  pixelSample: PixelSample | null
}

export function SidePanel({
  activeTool,
  channelState,
  disabled,
  image,
  onToggleChannel,
  pixelSample,
}: SidePanelProps) {
  return (
    <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-l border-black/50 bg-[#24262c] max-[760px]:grid-rows-[auto_1fr] max-[760px]:border-l-0 max-[760px]:border-t">
      <header className="border-b border-white/[0.08] px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Инспектор
        </p>
      </header>

      <div className="grid min-h-0 content-start gap-3 overflow-hidden p-3 text-sm max-[760px]:grid-cols-2 max-[760px]:gap-2 max-[760px]:p-2">
        <ChannelPanel
          channelState={channelState}
          disabled={disabled}
          image={image}
          onToggleChannel={onToggleChannel}
        />

        <EyedropperPanel activeTool={activeTool} pixelSample={pixelSample} />
      </div>
    </aside>
  )
}
