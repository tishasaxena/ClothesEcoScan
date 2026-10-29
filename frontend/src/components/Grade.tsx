import type { Grade as G } from '../lib/types';

export const GRADE_COPY: Record<G, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Average',
  D: 'High',
  E: 'Very high',
};

export function Grade({ grade, size = 'md' }: { grade: G; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`grade grade-${grade} grade-${size}`} title={`${GRADE_COPY[grade]} impact`}>
      {grade}
    </span>
  );
}

export function GradeScale({ grade }: { grade: G }) {
  return (
    <div className="grade-scale" aria-label={`Grade ${grade} on a scale from A to E`}>
      {(['A', 'B', 'C', 'D', 'E'] as G[]).map((g) => (
        <span key={g} className={`grade-step grade-${g} ${g === grade ? 'active' : ''}`}>
          {g}
        </span>
      ))}
    </div>
  );
}
