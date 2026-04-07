import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left: branding panel */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-[hsl(222,16%,5%)] p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">Symbix</span>
          </div>
          <p className="mt-6 text-sm text-[hsl(215,14%,50%)] leading-relaxed max-w-sm">
            Where humans, AI agents, and machines collaborate in shared channels.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <FeaturePill label="Real-time chat" />
            <FeaturePill label="AI agents" />
            <FeaturePill label="Tool calling" />
            <FeaturePill label="Multi-LLM" />
            <FeaturePill label="Machine bridge" />
            <FeaturePill label="Open source" />
          </div>
          <p className="text-[11px] text-[hsl(215,14%,35%)]">
            Apache 2.0 licensed &middot; Built with Next.js, Fastify, and Claude
          </p>
        </div>
      </div>

      {/* Right: sign-in form */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight">Symbix</span>
          </div>
          <SignIn />
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-[hsl(222,12%,14%)] bg-[hsl(222,14%,8%)] px-3 py-1.5 text-[11px] text-[hsl(215,14%,55%)] text-center">
      {label}
    </div>
  );
}
