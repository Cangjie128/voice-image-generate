import { BadRequestException, Body, Controller, Post } from '@nestjs/common'

type GenerateImageBody = {
  prompt?: string
  quality?: 'low' | 'medium' | 'high' | 'auto'
  size?: string
}

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string
    revised_prompt?: string
    url?: string
  }>
  error?: {
    message?: string
  }
  output_format?: 'png' | 'webp' | 'jpeg'
}

const QUALITY_VALUES = new Set(['low', 'medium', 'high', 'auto'])
const STANDARD_SIZES = new Set(['1024x1024', '1536x1024', '1024x1536', 'auto'])

@Controller('images')
export class ImagesController {
  @Post('generate')
  async generate(@Body() body: GenerateImageBody) {
    const prompt = `${body.prompt ?? ''}`.trim()

    if (!prompt) {
      throw new BadRequestException('prompt is required')
    }

    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'
    const quality = normalizeQuality(body.quality || process.env.OPENAI_IMAGE_QUALITY)
    const size = normalizeSize(body.size || process.env.OPENAI_IMAGE_SIZE)
    const apiKey = getOpenAIKey()

    if (!apiKey) {
      return createPreviewResponse(prompt, model, '未配置 OPENAI_API_KEY，已返回本地预览图。')
    }

    try {
      const image = await generateWithOpenAI({
        apiKey,
        model,
        prompt: buildImagePrompt(prompt),
        quality,
        size
      })

      return {
        imageUrl: image.imageUrl,
        model,
        prompt,
        provider: 'openai',
        revisedPrompt: image.revisedPrompt
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI image generation failed'
      return createPreviewResponse(prompt, model, `真实生图暂不可用：${message}`)
    }
  }
}

function getOpenAIKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY
  }

  if (process.env.AI_PROVIDER === 'openai') {
    return process.env.AI_API_KEY
  }

  return ''
}

function normalizeQuality(value?: string) {
  return QUALITY_VALUES.has(`${value}`) ? value : 'medium'
}

function normalizeSize(value?: string) {
  const candidate = `${value ?? ''}`.trim()
  if (STANDARD_SIZES.has(candidate)) {
    return candidate
  }

  if (/^\d{3,4}x\d{3,4}$/.test(candidate)) {
    const [width, height] = candidate.split('x').map(Number)
    if (
      width % 16 === 0 &&
      height % 16 === 0 &&
      width <= 3840 &&
      height <= 3840 &&
      width / height <= 3 &&
      height / width <= 3
    ) {
      return candidate
    }
  }

  return '1024x1024'
}

function buildImagePrompt(prompt: string) {
  return [
    'Create a polished, high-quality image from this voice prompt.',
    `Voice prompt: ${prompt}`,
    'Use a strong composition, clean lighting, and rich visual detail.',
    'Do not add watermarks, fake UI, signatures, or random text.',
    'If visible text is explicitly requested, render that text exactly.'
  ].join('\n')
}

async function generateWithOpenAI({
  apiKey,
  model,
  prompt,
  quality,
  size
}: {
  apiKey: string
  model: string
  prompt: string
  quality?: string
  size: string
}) {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      output_format: 'png',
      quality,
      size
    })
  })

  const payload = (await response.json()) as OpenAIImageResponse
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI returned ${response.status}`)
  }

  const generated = payload.data?.[0]
  if (!generated?.b64_json && !generated?.url) {
    throw new Error('OpenAI response did not include an image')
  }

  return {
    imageUrl: generated.b64_json
      ? `data:image/${payload.output_format || 'png'};base64,${generated.b64_json}`
      : generated.url,
    revisedPrompt: generated.revised_prompt
  }
}

function createPreviewResponse(prompt: string, model: string, warning: string) {
  return {
    imageUrl: createPreviewSvg(prompt),
    model,
    prompt,
    provider: 'local-preview',
    warning
  }
}

function createPreviewSvg(prompt: string) {
  const lines = wrapText(prompt, 15, 4)
  const hue = hashPrompt(prompt) % 360
  const accent = `hsl(${hue} 92% 68%)`
  const accentTwo = `hsl(${(hue + 78) % 360} 88% 72%)`
  const stars = Array.from({ length: 80 }, (_, index) => {
    const x = (hashPrompt(`${prompt}-x-${index}`) % 1024).toString()
    const y = (hashPrompt(`${prompt}-y-${index}`) % 1024).toString()
    const radius = ((hashPrompt(`${prompt}-r-${index}`) % 22) / 10 + 0.8).toFixed(1)
    const opacity = ((hashPrompt(`${prompt}-o-${index}`) % 50) / 100 + 0.35).toFixed(2)
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="#f8fbff" opacity="${opacity}" />`
  }).join('')

  const text = lines
    .map((line, index) => {
      const y = 726 + index * 48
      return `<text x="512" y="${y}" text-anchor="middle">${escapeXml(line)}</text>`
    })
    .join('')

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#071421" />
        <stop offset="48%" stop-color="#11374a" />
        <stop offset="100%" stop-color="#0d1728" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="48%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.55" />
        <stop offset="55%" stop-color="${accentTwo}" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#071421" stop-opacity="0" />
      </radialGradient>
      <filter id="soft">
        <feGaussianBlur stdDeviation="18" />
      </filter>
    </defs>
    <rect width="1024" height="1024" fill="url(#sky)" />
    ${stars}
    <circle cx="512" cy="402" r="330" fill="url(#glow)" />
    <path d="M116 624 C264 528 392 588 510 504 C652 404 806 424 926 308 L926 1024 L116 1024 Z" fill="${accent}" opacity="0.24" filter="url(#soft)" />
    <path d="M118 676 C276 584 390 682 516 590 C646 496 790 526 928 448 L928 1024 L118 1024 Z" fill="${accentTwo}" opacity="0.22" />
    <g transform="translate(0 10)">
      <rect x="256" y="262" width="512" height="340" rx="54" fill="#f8fbff" opacity="0.94" />
      <rect x="312" y="326" width="400" height="156" rx="76" fill="#061421" />
      <circle cx="432" cy="404" r="34" fill="#75e8df" />
      <circle cx="592" cy="404" r="34" fill="#75e8df" />
      <circle cx="444" cy="392" r="10" fill="#f8fbff" opacity="0.9" />
      <circle cx="604" cy="392" r="10" fill="#f8fbff" opacity="0.9" />
      <path d="M472 476 C496 502 528 502 552 476" fill="none" stroke="#75e8df" stroke-width="14" stroke-linecap="round" />
      <circle cx="512" cy="574" r="36" fill="#75e8df" opacity="0.78" />
      <path d="M512 262 L512 198" stroke="#f8fbff" stroke-width="18" stroke-linecap="round" />
      <circle cx="512" cy="180" r="32" fill="${accentTwo}" />
    </g>
    <g font-family="Inter, Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#f8fbff">
      ${text}
    </g>
  </svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

function hashPrompt(input: string) {
  return Array.from(input).reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0
  }, 2166136261)
}

function wrapText(text: string, maxChars: number, maxLines: number) {
  const chars = Array.from(text.replace(/\s+/g, ' ').trim())
  const lines: string[] = []

  for (let index = 0; index < chars.length && lines.length < maxLines; index += maxChars) {
    lines.push(chars.slice(index, index + maxChars).join(''))
  }

  if (!lines.length) {
    return ['AI preview']
  }

  if (chars.length > maxChars * maxLines) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}...`
  }

  return lines
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
