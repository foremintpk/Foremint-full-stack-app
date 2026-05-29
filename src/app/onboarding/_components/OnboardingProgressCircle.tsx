"use client"

export function OnboardingProgressCircle() {
  const size = 26
  const r = 11.5
  const circumference = 2 * Math.PI * r

  return (
    // shrink-0 lagana bohat zaroori hai taake flexbox isko squish na kare
    <div className="relative shrink-0" style={{ width: size, height: size }}>

      {/* Dono circles ko ek hi SVG mein daal diya aur viewBox set kar diya */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
        />

        {/* Spinning progress arc */}
        {/* animate-spin ab directly circle element par hai */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.72}
          strokeLinecap="round"
          className="animate-spin"
          style={{
            animationDuration: '2.8s',
            // SVG elements ke liye transform origin pixel-perfect dena lazmi hai
            transformOrigin: `${size / 2}px ${size / 2}px`
          }}
        />
      </svg>

      {/* White filled center circle (Pixel perfect positioning) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[18px] h-[18px] rounded-full bg-white flex items-center justify-center">
          <div className="w-[6px] h-[6px] rounded-full bg-[#34088f]" />
        </div>
      </div>

    </div>
  )
}