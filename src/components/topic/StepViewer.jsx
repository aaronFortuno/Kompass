import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n';
import { ContentBlock } from '@/components/topic/ContentBlock.jsx';
import { StepProgress } from '@/components/topic/StepProgress.jsx';
import { useProgressStore } from '@/store/useProgressStore.js';

/*
 * Reproductor d'steps · ARCHITECTURE §18
 * - Navegació lliure.
 * - Deep-link via /temes/:topicId/:stepId.
 * - Teclat: ← → / PgUp PgDown / Home End (ignora inputs).
 * - Sense persistir l'step actual a UserProgress.
 */

function resolveStepIndex(topic, stepId) {
  if (!stepId) return 0;
  const i = topic.steps.findIndex((s) => s.id === stepId);
  if (i < 0) {
    if (import.meta.env?.DEV) {
      console.warn(`[StepViewer] stepId "${stepId}" no existeix al tema ${topic.id}`);
    }
    return 0;
  }
  return i;
}

function pathForStep(topicId, step) {
  if (!step) return `/temes/${topicId}`;
  return step.id ? `/temes/${topicId}/${step.id}` : `/temes/${topicId}`;
}

export function StepViewer({ topic }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { stepId } = useParams();

  const stepIndex = resolveStepIndex(topic, stepId);
  const step = topic.steps[stepIndex];
  const total = topic.steps.length;
  const markStepVisited = useProgressStore((s) => s.markStepVisited);

  // Detecta direcció per triar animació endavant/enrere.
  const prevIndexRef = useRef(stepIndex);
  const direction = stepIndex >= prevIndexRef.current ? 'forward' : 'backward';
  useEffect(() => {
    prevIndexRef.current = stepIndex;
  }, [stepIndex]);

  // Registra la visita en el moment d'entrar al step.
  useEffect(() => {
    if (step?.id) {
      markStepVisited(topic.id, step.id);
    }
  }, [markStepVisited, topic.id, step?.id]);

  const goTo = useMemo(
    () => (index) => {
      if (index < 0 || index >= total) return;
      navigate(pathForStep(topic.id, topic.steps[index]));
    },
    [navigate, topic.id, topic.steps, total]
  );

  const canPrev = stepIndex > 0;
  const canNext = stepIndex < total - 1;

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (['input', 'select', 'textarea'].includes(tag)) return;
      if (document.activeElement?.getAttribute('contenteditable') === 'true') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (!canNext) return;
        e.preventDefault();
        goTo(stepIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (!canPrev) return;
        e.preventDefault();
        goTo(stepIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(total - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stepIndex, total, canPrev, canNext, goTo]);

  const animationClass =
    direction === 'forward' ? 'animate-step-enter' : 'animate-step-enter-back';

  return (
    <div className="section-gap">
      <StepProgress
        topicId={topic.id}
        steps={topic.steps}
        currentIndex={stepIndex}
        onJump={goTo}
      />

      <section
        key={stepIndex}
        className={`${animationClass} space-y-8 min-h-[20rem]`}
      >
        {step.blocks.map((block, i) => (
          <ContentBlock key={i} block={block} />
        ))}
      </section>

      <nav
        className="flex items-center justify-between gap-3 pt-6 border-t border-border"
        aria-label="step navigation"
      >
        <button
          type="button"
          className="btn-ghost"
          onClick={() => goTo(stepIndex - 1)}
          disabled={!canPrev}
          aria-label={t('step.previous')}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span className="hidden sm:inline ml-1">{t('step.previous')}</span>
        </button>
        <span className="text-sm text-content-muted">
          {t('step.progress', { current: stepIndex + 1, total })}
        </span>
        <button
          type="button"
          className="btn-primary"
          onClick={() => goTo(stepIndex + 1)}
          disabled={!canNext}
          aria-label={t('step.next')}
        >
          <span className="hidden sm:inline mr-1">{t('step.next')}</span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
