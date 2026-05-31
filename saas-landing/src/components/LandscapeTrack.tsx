import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const STEPS = [
  {
    number: '01',
    title: 'Connect your tools',
    body: 'OAuth one-click for Google, HubSpot, Notion, Slack, and more. Tokens encrypted at rest.',
    icon: '🔗',
  },
  {
    number: '02',
    title: 'Describe your workflow',
    body: 'Tell the AI assistant what you want to automate. It builds the workflow — you review and publish.',
    icon: '💬',
  },
  {
    number: '03',
    title: 'Schedule your content',
    body: 'Queue posts across every channel. Pick times, set recurrence, let the platform handle posting.',
    icon: '📅',
  },
  {
    number: '04',
    title: 'Monitor and iterate',
    body: 'Live run logs, token metrics, and engagement stats. Tweak and re-deploy in seconds.',
    icon: '📊',
  },
  {
    number: '05',
    title: 'Scale with confidence',
    body: 'Rate limits, DLP scanning, and audit logs built in. Enterprise-ready from day one.',
    icon: '🛡️',
  },
];

export default function LandscapeTrack() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-55%']);

  return (
    <div ref={trackRef} className="relative h-[40rem] md:h-[28rem]">
      <div className="sticky top-0 h-screen md:h-[28rem] flex items-center overflow-hidden">
        <motion.div
          style={{ x }}
          className="flex gap-6 px-6 md:px-24 will-change-transform"
        >
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex-shrink-0 w-72 md:w-80 card border-surface-border hover:border-amber/40 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-xs text-amber">{step.number}</span>
                <span className="text-xl">{step.icon}</span>
              </div>
              <h3 className="font-display font-semibold text-text-primary mb-2">{step.title}</h3>
              <p className="text-sm text-text-secondary font-body leading-relaxed">{step.body}</p>
            </div>
          ))}

          {/* Terminal card */}
          <div className="flex-shrink-0 w-72 md:w-80 card border-amber/30 bg-surface font-mono text-xs">
            <p className="text-amber mb-3 font-mono text-[10px] tracking-widest uppercase">Live run log</p>
            {[
              { t: '14:23:01', msg: 'workflow.start', ok: true },
              { t: '14:23:02', msg: 'integration.google.auth', ok: true },
              { t: '14:23:03', msg: 'claude.prompt.scan', ok: true },
              { t: '14:23:04', msg: 'claude.completion', ok: true },
              { t: '14:23:04', msg: 'dlp.scan.output', ok: true },
              { t: '14:23:05', msg: 'content.queue.push', ok: true },
              { t: '14:23:05', msg: 'audit.log.write', ok: true },
              { t: '14:23:05', msg: 'workflow.complete ✓', ok: true },
            ].map((row) => (
              <div key={row.msg} className="flex gap-3 text-[11px] mb-1">
                <span className="text-text-muted">{row.t}</span>
                <span className={row.ok ? 'text-amber' : 'text-red-400'}>{row.msg}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
