import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { useT } from '@/i18n';
import { ContentBlock } from '@/components/topic/ContentBlock.jsx';
import { StepProgress } from '@/components/topic/StepProgress.jsx';
import { PendingExercisesNotice } from '@/components/topic/PendingExercisesNotice.jsx';
import { useProgressStore } from '@/store/useProgressStore.js';

/*
 * Reproductor d'steps · ARCHITECTURE §18
 * - Navegació lliure.
 * - Deep-link via /temes/:topicId/:stepId.
 * - Teclat: ← → / PgUp PgDn / Home End (ignora inputs).
 * - Al darrer step: "Finalitzar" (success) si tots els exercicis
 *   completed amb lastAttemptCorrect=true; en cas contrari "Revisar
 *   pendents" (warning) que porta al primer pendent, amb un avís
 *   llistant els pendents just a sobre del nav.
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

function computePending(topic, exercisesState) {
  const pending = [];
  topic.steps.forEach((step, stepIndex) => {
    const exerciseBlock = step.blocks.find((b) => b.type === 'exercise');
    if (!exerciseBlock) return;
    const entry = exercisesState?.[exerciseBlock.exerciseId];
    if (!entry) {
      pending.push({
        stepIndex,
        step,
        exerciseId: exerciseBlock.exerciseId,
        reason: 'notAttempted',
      });
      return;
    }
    if (entry.lastAttemptCorrect === false) {
      pending.push({
        stepIndex,
        step,
        exerciseId: exerciseBlock.exerciseId,
        reason: 'withErrors',
      });
    }
  });
  return pending;
}

export function StepViewer({ topic }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { stepId } = useParams();

  const stepIndex = resolveStepIndex(topic, stepId);
  const step = topic.steps[stepIndex];
  const total = topic.steps.length;
  const isLast = stepIndex === total - 1;

  const markStepVisited = useProgressStore((s) => s.markStepVisited);
  const exercisesState = useProgressStore((s) => s.exercises);
  const pending = useMemo(
    () => computePending(topic, exercisesState),
    [topic, exercisesState]
  );

  const prevIndexRef = useRef(stepIndex);
  const direction = stepIndex >= prevIndexRef.current ? 'forward' : 'backward';
  useEffect(() => {
    prevIndexRef.current = stepIndex;
  }, [stepIndex]);

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

  const primaryButton = (() => {
    if (!isLast) {
      return (
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
      );
    }
    if (pending.length === 0) {
      return (
        <button
          type="button"
          className="btn inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md px-4 py-2 font-medium bg-success text-accent-content motion-hover hover:opacity-90"
          onClick={() => navigate('/temes')}
          aria-label={t('step.finish')}
        >
          <Award size={18} aria-hidden="true" />
          <span className="ml-1">{t('step.finish')}</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        className="btn inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md px-4 py-2 font-medium bg-warning text-accent-content motion-hover hover:opacity-90"
        onClick={() => goTo(pending[0].stepIndex)}
        aria-label={t('step.reviewPending', { count: pending.length })}
      >
        <AlertTriangle size={18} aria-hidden="true" />
        <span className="ml-1">
          {t('step.reviewPending', { count: pending.length })}
        </span>
      </button>
    );
  })();

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

      {isLast && pending.length > 0 && (
        <PendingExercisesNotice pending={pending} onGoTo={goTo} />
      )}

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
        {primaryButton}
      </nav>
    </div>
  );
}
