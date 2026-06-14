import { useEffect, useRef, useState } from 'react'

/**
 * 跟随鼠标转头的机器人。
 *
 * ANGLE_KEYS 是「角度 -> 帧」的校准表：每个方向对应的图片，
 * 都是从源视频里逐帧抽出、人工确认实际朝向后挑选的真实帧，
 * 不是 angle/360*frames 的线性映射。
 *
 * 角度约定：屏幕坐标，0°=鼠标在角色右侧，顺时针（y 向下）。
 */
type AngleKey = { angle: number; dir: Direction }
type Direction =
  | 'center'
  | 'up'
  | 'up-right'
  | 'right'
  | 'down-right'
  | 'down'
  | 'down-left'
  | 'left'
  | 'up-left'

const ANGLE_KEYS: AngleKey[] = [
  { angle: 0, dir: 'right' },
  { angle: 45, dir: 'down-right' },
  { angle: 90, dir: 'down' },
  { angle: 135, dir: 'down-left' },
  { angle: 180, dir: 'left' },
  { angle: 225, dir: 'up-left' },
  { angle: 270, dir: 'up' },
  { angle: 315, dir: 'up-right' }
]

const ALL_DIRS: Direction[] = [
  'center',
  'up',
  'up-right',
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left'
]

const SPRITE = (d: Direction) => `/assets/robot/${d}.png`

// 中心死区：鼠标落在角色头部附近时回正脸（相对组件高度的比例）
const DEADZONE = 0.12
// 头部中心相对组件高度的位置（略高于几何中心）
const HEAD_Y = 0.34

function nearestDir(angleDeg: number): Direction {
  let best = ANGLE_KEYS[0]
  let bestDiff = 999
  for (const k of ANGLE_KEYS) {
    const diff = Math.abs(((angleDeg - k.angle) % 360 + 540) % 360 - 180)
    if (diff < bestDiff) {
      bestDiff = diff
      best = k
    }
  }
  return best.dir
}

type Props = {
  className?: string
  alt?: string
}

export default function RobotHead({ className, alt = '会转头的小王机器人' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dir, setDir] = useState<Direction>('center')

  useEffect(() => {
    // 预加载全部精灵图，避免转头时闪烁
    ALL_DIRS.forEach((d) => {
      const img = new Image()
      img.src = SPRITE(d)
    })

    let raf = 0
    let pending: { x: number; y: number } | null = null

    const apply = () => {
      raf = 0
      if (!pending || !wrapRef.current) return
      const r = wrapRef.current.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height * HEAD_Y
      const dx = pending.x - cx
      const dy = pending.y - cy
      const dist = Math.hypot(dx, dy)
      if (dist < r.height * DEADZONE) {
        setDir('center')
        return
      }
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI
      setDir(nearestDir((ang + 360) % 360))
    }

    const onMove = (e: MouseEvent) => {
      pending = { x: e.clientX, y: e.clientY }
      if (!raf) raf = requestAnimationFrame(apply)
    }

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={wrapRef} className={className} data-dir={dir}>
      {ALL_DIRS.map((d) => (
        <img
          key={d}
          className="robot-frame"
          src={SPRITE(d)}
          alt={d === dir ? alt : ''}
          aria-hidden={d === dir ? undefined : true}
          draggable={false}
          style={{ opacity: d === dir ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
