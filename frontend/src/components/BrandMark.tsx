import { FiActivity } from 'react-icons/fi'

interface BrandMarkProps {
  compact?: boolean
  inverse?: boolean
}

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${inverse ? 'bg-white text-brand-900' : 'bg-brand-900 text-white'}`}>
        <FiActivity className="h-5 w-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span className={`text-lg font-bold tracking-[-0.03em] ${inverse ? 'text-white' : 'text-brand-950'}`}>
          MyMedic
        </span>
      )}
    </span>
  )
}
